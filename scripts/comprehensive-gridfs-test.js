const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
    mongoUri: process.env.MONGODB_URI || 'mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    baseUrl: 'http://localhost:3000',
    testFiles: {
        small: { size: 1024, name: 'small-test.txt' },
        medium: { size: 1024 * 1024, name: 'medium-test.pdf' }, // 1MB
        large: { size: 5 * 1024 * 1024, name: 'large-test.pdf' } // 5MB
    },
    allowedTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility functions
function logTest(testName, status, details = '') {
    testResults.total++;
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✅ ${testName}: PASSED ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: FAILED ${details}`);
    }
    testResults.details.push({ testName, status, details });
}

function generateTestContent(size, type = 'text') {
    if (type === 'pdf') {
        // Generate a minimal PDF content
        const pdfHeader = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n';
        const pdfPages = '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n';
        const pdfTrailer = 'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF';

        const baseContent = pdfHeader + pdfPages + pdfTrailer;
        const padding = 'A'.repeat(Math.max(0, size - baseContent.length));
        return Buffer.from(baseContent + padding);
    } else {
        // Generate text content
        const content = 'A'.repeat(size);
        return Buffer.from(content);
    }
}

function calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Test 1: Basic GridFS Operations
async function testBasicGridFSOperations() {
    console.log('\n🧪 Test 1: Basic GridFS Operations');
    console.log('='.repeat(50));

    try {
        // Connect to MongoDB
        await mongoose.connect(TEST_CONFIG.mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Test 1.1: Upload a file
        console.log('\n📤 Testing file upload...');
        const testContent = generateTestContent(1024);
        const checksum = calculateChecksum(testContent);
        const metadata = {
            userId: 'test-user-123',
            documentType: 'opiqPermit',
            originalName: 'test.txt',
            mimeType: 'text/plain',
            size: testContent.length,
            checksum: checksum,
            uploadedAt: new Date()
        };

        const uploadStream = bucket.openUploadStream('test.txt', { metadata });
        uploadStream.write(testContent);
        uploadStream.end();

        const fileId = await new Promise((resolve, reject) => {
            uploadStream.on('finish', () => resolve(uploadStream.id));
            uploadStream.on('error', reject);
        });

        if (fileId) {
            logTest('File Upload', 'PASS', `File ID: ${fileId}`);
        } else {
            logTest('File Upload', 'FAIL', 'No file ID returned');
            return;
        }

        // Test 1.2: Retrieve file metadata
        console.log('\n📋 Testing metadata retrieval...');
        const files = await bucket.find({ _id: fileId }).toArray();
        if (files.length > 0) {
            const fileInfo = files[0];
            const metadataMatch = fileInfo.metadata &&
                fileInfo.metadata.userId === metadata.userId &&
                fileInfo.metadata.documentType === metadata.documentType;

            if (metadataMatch) {
                logTest('Metadata Retrieval', 'PASS', `Found ${files.length} file(s)`);
            } else {
                logTest('Metadata Retrieval', 'FAIL', 'Metadata mismatch');
            }
        } else {
            logTest('Metadata Retrieval', 'FAIL', 'No files found');
        }

        // Test 1.3: Download file
        console.log('\n📥 Testing file download...');
        const downloadStream = bucket.openDownloadStream(fileId);
        const chunks = [];

        const downloadedBuffer = await new Promise((resolve, reject) => {
            downloadStream.on('data', (chunk) => chunks.push(chunk));
            downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
            downloadStream.on('error', reject);
        });

        if (downloadedBuffer && downloadedBuffer.equals(testContent)) {
            logTest('File Download', 'PASS', `${downloadedBuffer.length} bytes downloaded`);
        } else {
            logTest('File Download', 'FAIL', 'Content mismatch or download failed');
        }

        // Test 1.4: Delete file
        console.log('\n🗑️ Testing file deletion...');
        await bucket.delete(fileId);

        // Verify deletion
        const remainingFiles = await bucket.find({ _id: fileId }).toArray();
        if (remainingFiles.length === 0) {
            logTest('File Deletion', 'PASS', 'File successfully deleted');
        } else {
            logTest('File Deletion', 'FAIL', 'File still exists after deletion');
        }

    } catch (error) {
        logTest('Basic GridFS Operations', 'FAIL', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Test 2: File Type and Size Validation
async function testFileValidation() {
    console.log('\n🧪 Test 2: File Type and Size Validation');
    console.log('='.repeat(50));

    try {
        await mongoose.connect(TEST_CONFIG.mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Test 2.1: Valid file types
        console.log('\n📄 Testing valid file types...');
        const validTypes = ['application/pdf', 'image/jpeg', 'text/plain'];
        let validTypeTests = 0;

        for (const mimeType of validTypes) {
            const testContent = generateTestContent(512, mimeType.includes('pdf') ? 'pdf' : 'text');
            const metadata = {
                userId: 'test-user-123',
                documentType: 'opiqPermit',
                originalName: `test.${mimeType.split('/')[1]}`,
                mimeType: mimeType,
                size: testContent.length,
                checksum: calculateChecksum(testContent),
                uploadedAt: new Date()
            };

            const uploadStream = bucket.openUploadStream(`test.${mimeType.split('/')[1]}`, { metadata });
            uploadStream.write(testContent);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            if (fileId) {
                validTypeTests++;
                await bucket.delete(fileId); // Clean up
            }
        }

        if (validTypeTests === validTypes.length) {
            logTest('Valid File Types', 'PASS', `${validTypeTests}/${validTypes.length} types uploaded successfully`);
        } else {
            logTest('Valid File Types', 'FAIL', `Only ${validTypeTests}/${validTypes.length} types uploaded successfully`);
        }

        // Test 2.2: Large file handling
        console.log('\n📏 Testing large file handling...');
        const largeContent = generateTestContent(TEST_CONFIG.testFiles.large.size, 'pdf');
        const largeMetadata = {
            userId: 'test-user-123',
            documentType: 'rcr',
            originalName: 'large-test.pdf',
            mimeType: 'application/pdf',
            size: largeContent.length,
            checksum: calculateChecksum(largeContent),
            uploadedAt: new Date()
        };

        const largeUploadStream = bucket.openUploadStream('large-test.pdf', { metadata: largeMetadata });
        largeUploadStream.write(largeContent);
        largeUploadStream.end();

        const largeFileId = await new Promise((resolve, reject) => {
            largeUploadStream.on('finish', () => resolve(largeUploadStream.id));
            largeUploadStream.on('error', reject);
        });

        if (largeFileId) {
            logTest('Large File Upload', 'PASS', `${largeContent.length} bytes uploaded`);

            // Test download of large file
            const largeDownloadStream = bucket.openDownloadStream(largeFileId);
            const largeChunks = [];

            const largeDownloadedBuffer = await new Promise((resolve, reject) => {
                largeDownloadStream.on('data', (chunk) => largeChunks.push(chunk));
                largeDownloadStream.on('end', () => resolve(Buffer.concat(largeChunks)));
                largeDownloadStream.on('error', reject);
            });

            if (largeDownloadedBuffer && largeDownloadedBuffer.equals(largeContent)) {
                logTest('Large File Download', 'PASS', `${largeDownloadedBuffer.length} bytes downloaded`);
            } else {
                logTest('Large File Download', 'FAIL', 'Large file content mismatch');
            }

            await bucket.delete(largeFileId); // Clean up
        } else {
            logTest('Large File Upload', 'FAIL', 'Large file upload failed');
        }

    } catch (error) {
        logTest('File Validation', 'FAIL', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Test 3: User Document Management
async function testUserDocumentManagement() {
    console.log('\n🧪 Test 3: User Document Management');
    console.log('='.repeat(50));

    try {
        await mongoose.connect(TEST_CONFIG.mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        const testUserId = 'test-user-' + Date.now();
        const uploadedFiles = [];

        // Test 3.1: Upload multiple files for a user
        console.log('\n📤 Testing multiple file uploads for a user...');
        const documentTypes = ['opiqPermit', 'rcr'];

        for (const docType of documentTypes) {
            const testContent = generateTestContent(2048, 'pdf');
            const metadata = {
                userId: testUserId,
                documentType: docType,
                originalName: `${docType}-test.pdf`,
                mimeType: 'application/pdf',
                size: testContent.length,
                checksum: calculateChecksum(testContent),
                uploadedAt: new Date()
            };

            const uploadStream = bucket.openUploadStream(`${docType}-test.pdf`, { metadata });
            uploadStream.write(testContent);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            if (fileId) {
                uploadedFiles.push({ fileId, docType, content: testContent });
            }
        }

        if (uploadedFiles.length === documentTypes.length) {
            logTest('Multiple File Uploads', 'PASS', `${uploadedFiles.length} files uploaded for user ${testUserId}`);
        } else {
            logTest('Multiple File Uploads', 'FAIL', `Only ${uploadedFiles.length}/${documentTypes.length} files uploaded`);
        }

        // Test 3.2: List user files
        console.log('\n📋 Testing user file listing...');
        const userFiles = await bucket.find({ 'metadata.userId': testUserId }).toArray();

        if (userFiles.length === uploadedFiles.length) {
            logTest('User File Listing', 'PASS', `Found ${userFiles.length} files for user`);
        } else {
            logTest('User File Listing', 'FAIL', `Expected ${uploadedFiles.length}, found ${userFiles.length}`);
        }

        // Test 3.3: Filter by document type
        console.log('\n🔍 Testing document type filtering...');
        const opiqFiles = await bucket.find({
            'metadata.userId': testUserId,
            'metadata.documentType': 'opiqPermit'
        }).toArray();

        const rcrFiles = await bucket.find({
            'metadata.userId': testUserId,
            'metadata.documentType': 'rcr'
        }).toArray();

        if (opiqFiles.length === 1 && rcrFiles.length === 1) {
            logTest('Document Type Filtering', 'PASS', `OPIQ: ${opiqFiles.length}, RCR: ${rcrFiles.length}`);
        } else {
            logTest('Document Type Filtering', 'FAIL', `OPIQ: ${opiqFiles.length}, RCR: ${rcrFiles.length}`);
        }

        // Test 3.4: Update file metadata
        console.log('\n🔄 Testing metadata updates...');
        if (uploadedFiles.length > 0) {
            const fileToUpdate = uploadedFiles[0];
            const newMetadata = {
                originalName: 'updated-filename.pdf',
                documentType: 'updatedType'
            };

            // Update metadata in the files collection
            await db.collection('documents.files').updateOne(
                { _id: fileToUpdate.fileId },
                { $set: { metadata: { ...fileToUpdate.fileId.metadata, ...newMetadata } } }
            );

            // Verify update
            const updatedFiles = await bucket.find({ _id: fileToUpdate.fileId }).toArray();
            if (updatedFiles.length > 0 && updatedFiles[0].metadata.originalName === newMetadata.originalName) {
                logTest('Metadata Update', 'PASS', 'Metadata successfully updated');
            } else {
                logTest('Metadata Update', 'FAIL', 'Metadata update failed');
            }
        }

        // Clean up all test files
        console.log('\n🧹 Cleaning up test files...');
        for (const file of uploadedFiles) {
            try {
                await bucket.delete(file.fileId);
            } catch (error) {
                console.log(`⚠️ Failed to delete file ${file.fileId}: ${error.message}`);
            }
        }

    } catch (error) {
        logTest('User Document Management', 'FAIL', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Test 4: Error Handling and Edge Cases
async function testErrorHandling() {
    console.log('\n🧪 Test 4: Error Handling and Edge Cases');
    console.log('='.repeat(50));

    try {
        await mongoose.connect(TEST_CONFIG.mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Test 4.1: Download non-existent file
        console.log('\n🔍 Testing download of non-existent file...');
        try {
            const nonExistentId = new mongoose.Types.ObjectId();
            const downloadStream = bucket.openDownloadStream(nonExistentId);

            await new Promise((resolve, reject) => {
                downloadStream.on('data', () => { });
                downloadStream.on('end', resolve);
                downloadStream.on('error', reject);
            });

            logTest('Non-existent File Download', 'FAIL', 'Should have thrown an error');
        } catch (error) {
            logTest('Non-existent File Download', 'PASS', 'Correctly handled non-existent file');
        }

        // Test 4.2: Delete non-existent file
        console.log('\n🗑️ Testing deletion of non-existent file...');
        try {
            const nonExistentId = new mongoose.Types.ObjectId();
            await bucket.delete(nonExistentId);
            logTest('Non-existent File Deletion', 'PASS', 'No error thrown for non-existent file');
        } catch (error) {
            logTest('Non-existent File Deletion', 'FAIL', `Unexpected error: ${error.message}`);
        }

        // Test 4.3: Invalid ObjectId format
        console.log('\n🔍 Testing invalid ObjectId format...');
        try {
            const invalidId = 'invalid-object-id';
            const downloadStream = bucket.openDownloadStream(invalidId);
            logTest('Invalid ObjectId Format', 'FAIL', 'Should have thrown an error');
        } catch (error) {
            logTest('Invalid ObjectId Format', 'PASS', 'Correctly handled invalid ObjectId');
        }

        // Test 4.4: Empty file upload
        console.log('\n📄 Testing empty file upload...');
        try {
            const emptyContent = Buffer.alloc(0);
            const metadata = {
                userId: 'test-user-123',
                documentType: 'opiqPermit',
                originalName: 'empty.txt',
                mimeType: 'text/plain',
                size: 0,
                checksum: calculateChecksum(emptyContent),
                uploadedAt: new Date()
            };

            const uploadStream = bucket.openUploadStream('empty.txt', { metadata });
            uploadStream.write(emptyContent);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            if (fileId) {
                logTest('Empty File Upload', 'PASS', 'Empty file uploaded successfully');
                await bucket.delete(fileId); // Clean up
            } else {
                logTest('Empty File Upload', 'FAIL', 'Empty file upload failed');
            }
        } catch (error) {
            logTest('Empty File Upload', 'FAIL', error.message);
        }

    } catch (error) {
        logTest('Error Handling', 'FAIL', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Test 5: API Endpoints Integration
async function testAPIEndpoints() {
    console.log('\n🧪 Test 5: API Endpoints Integration');
    console.log('='.repeat(50));

    const BASE_URL = TEST_CONFIG.baseUrl;

    // Test 5.1: Employee signup with files
    console.log('\n📤 Testing employee signup with GridFS...');
    try {
        const testPdfContent = generateTestContent(2048, 'pdf');
        const formData = new FormData();

        // Add employee data
        formData.append('userType', 'employee');
        formData.append('firstName', 'GridFS');
        formData.append('lastName', 'Test');
        formData.append('email', `gridfs-api-test-${Date.now()}@example.com`);
        formData.append('phone', '+1234567890');
        formData.append('password', 'TestPass123!');

        // Add test files
        const opiqBlob = new Blob([testPdfContent], { type: 'application/pdf' });
        const rcrBlob = new Blob([testPdfContent], { type: 'application/pdf' });

        formData.append('opiqPermit', opiqBlob, 'test_opiq.pdf');
        formData.append('rcr', rcrBlob, 'test_rcr.pdf');

        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.status === 201 && result.user.documents && result.user.documents.length === 2) {
            logTest('Employee Signup API', 'PASS', 'User created with 2 documents');

            const userId = result.user._id;
            const fileId = result.user.documents[0].fileId;

            // Test 5.2: File download API
            console.log('\n📥 Testing file download API...');
            const fileResponse = await fetch(`${BASE_URL}/api/files/${fileId}`);

            if (fileResponse.status === 200) {
                const fileBuffer = await fileResponse.arrayBuffer();
                if (fileBuffer.byteLength === testPdfContent.length) {
                    logTest('File Download API', 'PASS', `${fileBuffer.byteLength} bytes downloaded`);
                } else {
                    logTest('File Download API', 'FAIL', 'File size mismatch');
                }
            } else {
                logTest('File Download API', 'FAIL', `Status: ${fileResponse.status}`);
            }

            // Test 5.3: User documents API
            console.log('\n📋 Testing user documents API...');
            const documentsResponse = await fetch(`${BASE_URL}/api/users/${userId}/documents`);
            const documentsResult = await documentsResponse.json();

            if (documentsResponse.status === 200 && documentsResult.documents.length === 2) {
                logTest('User Documents API', 'PASS', `Retrieved ${documentsResult.documents.length} documents`);
            } else {
                logTest('User Documents API', 'FAIL', `Status: ${documentsResponse.status}, Documents: ${documentsResult.documents?.length || 0}`);
            }

        } else {
            logTest('Employee Signup API', 'FAIL', `Status: ${response.status}, Documents: ${result.user?.documents?.length || 0}`);
        }

    } catch (error) {
        logTest('API Endpoints Integration', 'FAIL', error.message);
    }
}

// Test 6: Performance Testing
async function testPerformance() {
    console.log('\n🧪 Test 6: Performance Testing');
    console.log('='.repeat(50));

    try {
        await mongoose.connect(TEST_CONFIG.mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Test 6.1: Concurrent uploads
        console.log('\n⚡ Testing concurrent uploads...');
        const concurrentUploads = 5;
        const uploadPromises = [];
        const startTime = Date.now();

        for (let i = 0; i < concurrentUploads; i++) {
            const testContent = generateTestContent(1024 * 100, 'text'); // 100KB
            const metadata = {
                userId: `perf-test-user-${i}`,
                documentType: 'opiqPermit',
                originalName: `perf-test-${i}.txt`,
                mimeType: 'text/plain',
                size: testContent.length,
                checksum: calculateChecksum(testContent),
                uploadedAt: new Date()
            };

            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(`perf-test-${i}.txt`, { metadata });
                uploadStream.write(testContent);
                uploadStream.end();

                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            uploadPromises.push(uploadPromise);
        }

        const fileIds = await Promise.all(uploadPromises);
        const uploadTime = Date.now() - startTime;

        if (fileIds.length === concurrentUploads) {
            logTest('Concurrent Uploads', 'PASS', `${concurrentUploads} files uploaded in ${uploadTime}ms`);
        } else {
            logTest('Concurrent Uploads', 'FAIL', `Only ${fileIds.length}/${concurrentUploads} files uploaded`);
        }

        // Test 6.2: Concurrent downloads
        console.log('\n⚡ Testing concurrent downloads...');
        const downloadStartTime = Date.now();
        const downloadPromises = fileIds.map(fileId => {
            return new Promise((resolve, reject) => {
                const downloadStream = bucket.openDownloadStream(fileId);
                const chunks = [];

                downloadStream.on('data', (chunk) => chunks.push(chunk));
                downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
                downloadStream.on('error', reject);
            });
        });

        const downloadedBuffers = await Promise.all(downloadPromises);
        const downloadTime = Date.now() - downloadStartTime;

        if (downloadedBuffers.length === fileIds.length) {
            logTest('Concurrent Downloads', 'PASS', `${fileIds.length} files downloaded in ${downloadTime}ms`);
        } else {
            logTest('Concurrent Downloads', 'FAIL', `Only ${downloadedBuffers.length}/${fileIds.length} files downloaded`);
        }

        // Clean up performance test files
        console.log('\n🧹 Cleaning up performance test files...');
        for (const fileId of fileIds) {
            try {
                await bucket.delete(fileId);
            } catch (error) {
                console.log(`⚠️ Failed to delete file ${fileId}: ${error.message}`);
            }
        }

    } catch (error) {
        logTest('Performance Testing', 'FAIL', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Main test runner
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive GridFS Test Suite');
    console.log('='.repeat(60));
    console.log(`📊 Test Configuration:`);
    console.log(`   MongoDB URI: ${TEST_CONFIG.mongoUri.substring(0, 50)}...`);
    console.log(`   Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`   Test Files: ${Object.keys(TEST_CONFIG.testFiles).join(', ')}`);
    console.log('='.repeat(60));

    const overallStartTime = Date.now();

    try {
        // Run all test suites
        await testBasicGridFSOperations();
        await testFileValidation();
        await testUserDocumentManagement();
        await testErrorHandling();
        await testAPIEndpoints();
        await testPerformance();

    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }

    const overallTime = Date.now() - overallStartTime;

    // Print test summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Time: ${overallTime}ms`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.total}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.details
            .filter(test => test.status === 'FAIL')
            .forEach(test => console.log(`   - ${test.testName}: ${test.details}`));
    }

    console.log('\n🏁 Comprehensive GridFS Test Suite Completed!');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
    runComprehensiveTests().catch(console.error);
}

module.exports = {
    runComprehensiveTests,
    testBasicGridFSOperations,
    testFileValidation,
    testUserDocumentManagement,
    testErrorHandling,
    testAPIEndpoints,
    testPerformance
};
