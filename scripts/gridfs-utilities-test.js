const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

// Test the GridFS utilities directly
async function testGridFSUtilities() {
    console.log('🧪 Testing GridFS Utilities Directly');
    console.log('='.repeat(50));

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Test 1: File checksum calculation
        console.log('\n🔐 Testing file checksum calculation...');
        const testContent = Buffer.from('Hello GridFS! This is a test file for checksum calculation.');
        const expectedChecksum = crypto.createHash('sha256').update(testContent).digest('hex');
        console.log(`✅ Expected checksum: ${expectedChecksum}`);

        // Test 2: File validation
        console.log('\n📋 Testing file validation...');
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const maxSizeMB = 10;

        // Test valid file
        const validFile = {
            name: 'test.pdf',
            type: 'application/pdf',
            size: 1024 * 1024 // 1MB
        };

        const validResult = validateFile(validFile, allowedTypes, maxSizeMB);
        if (validResult.isValid) {
            console.log('✅ Valid file validation passed');
        } else {
            console.log('❌ Valid file validation failed:', validResult.error);
        }

        // Test invalid file type
        const invalidTypeFile = {
            name: 'test.exe',
            type: 'application/x-executable',
            size: 1024
        };

        const invalidTypeResult = validateFile(invalidTypeFile, allowedTypes, maxSizeMB);
        if (!invalidTypeResult.isValid) {
            console.log('✅ Invalid file type correctly rejected:', invalidTypeResult.error);
        } else {
            console.log('❌ Invalid file type should have been rejected');
        }

        // Test oversized file
        const oversizedFile = {
            name: 'large.pdf',
            type: 'application/pdf',
            size: 15 * 1024 * 1024 // 15MB
        };

        const oversizedResult = validateFile(oversizedFile, allowedTypes, maxSizeMB);
        if (!oversizedResult.isValid) {
            console.log('✅ Oversized file correctly rejected:', oversizedResult.error);
        } else {
            console.log('❌ Oversized file should have been rejected');
        }

        // Test 3: Different file types upload
        console.log('\n📄 Testing different file types upload...');
        const fileTypes = [
            { type: 'text/plain', content: Buffer.from('This is a plain text file.'), name: 'test.txt' },
            { type: 'application/pdf', content: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF'), name: 'test.pdf' },
            { type: 'image/jpeg', content: Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0C\x14\r\x0C\x0B\x0B\x0C\x19\x12\x13\x0F\x14\x1D\x1A\x1F\x1E\x1D\x1A\x1C\x1C $.\' ",#\x1C\x1C(7),01444\x1F\'9=82<.342\xFF\xC0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xFF\xC4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xFF\xC4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00\xAA\xFF\xD9'), name: 'test.jpg' }
        ];

        const uploadedFiles = [];

        for (const fileType of fileTypes) {
            const metadata = {
                userId: 'test-user-utilities',
                documentType: 'opiqPermit',
                originalName: fileType.name,
                mimeType: fileType.type,
                size: fileType.content.length,
                checksum: crypto.createHash('sha256').update(fileType.content).digest('hex'),
                uploadedAt: new Date()
            };

            const uploadStream = bucket.openUploadStream(fileType.name, { metadata });
            uploadStream.write(fileType.content);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            if (fileId) {
                uploadedFiles.push({ fileId, type: fileType.type, content: fileType.content });
                console.log(`✅ Uploaded ${fileType.type} file with ID: ${fileId}`);
            } else {
                console.log(`❌ Failed to upload ${fileType.type} file`);
            }
        }

        // Test 4: File size variations
        console.log('\n📏 Testing different file sizes...');
        const fileSizes = [
            { size: 0, name: 'empty.txt' },
            { size: 1, name: '1byte.txt' },
            { size: 1024, name: '1kb.txt' },
            { size: 1024 * 1024, name: '1mb.txt' },
            { size: 5 * 1024 * 1024, name: '5mb.txt' }
        ];

        const sizeTestFiles = [];

        for (const sizeTest of fileSizes) {
            const content = Buffer.alloc(sizeTest.size, 'A');
            const metadata = {
                userId: 'test-user-utilities',
                documentType: 'rcr',
                originalName: sizeTest.name,
                mimeType: 'text/plain',
                size: content.length,
                checksum: crypto.createHash('sha256').update(content).digest('hex'),
                uploadedAt: new Date()
            };

            const uploadStream = bucket.openUploadStream(sizeTest.name, { metadata });
            uploadStream.write(content);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            if (fileId) {
                sizeTestFiles.push({ fileId, size: sizeTest.size, content });
                console.log(`✅ Uploaded ${sizeTest.name} (${sizeTest.size} bytes) with ID: ${fileId}`);
            } else {
                console.log(`❌ Failed to upload ${sizeTest.name}`);
            }
        }

        // Test 5: Metadata operations
        console.log('\n📋 Testing metadata operations...');
        if (uploadedFiles.length > 0) {
            const testFile = uploadedFiles[0];

            // Get file metadata
            const files = await bucket.find({ _id: testFile.fileId }).toArray();
            if (files.length > 0) {
                const fileInfo = files[0];
                console.log('✅ Retrieved file metadata:', {
                    id: fileInfo._id,
                    filename: fileInfo.filename,
                    length: fileInfo.length,
                    uploadDate: fileInfo.uploadDate,
                    metadata: fileInfo.metadata
                });

                // Test metadata update
                const newMetadata = {
                    originalName: 'updated-filename.txt',
                    documentType: 'updatedType'
                };

                await db.collection('documents.files').updateOne(
                    { _id: testFile.fileId },
                    { $set: { metadata: { ...fileInfo.metadata, ...newMetadata } } }
                );

                // Verify update
                const updatedFiles = await bucket.find({ _id: testFile.fileId }).toArray();
                if (updatedFiles.length > 0 && updatedFiles[0].metadata.originalName === newMetadata.originalName) {
                    console.log('✅ Metadata update successful');
                } else {
                    console.log('❌ Metadata update failed');
                }
            }
        }

        // Test 6: List user files
        console.log('\n📋 Testing user file listing...');
        const userFiles = await bucket.find({ 'metadata.userId': 'test-user-utilities' }).toArray();
        console.log(`✅ Found ${userFiles.length} files for test user`);

        // Group by document type
        const filesByType = userFiles.reduce((acc, file) => {
            const docType = file.metadata?.documentType || 'unknown';
            acc[docType] = (acc[docType] || 0) + 1;
            return acc;
        }, {});

        console.log('📊 Files by document type:', filesByType);

        // Clean up all test files
        console.log('\n🧹 Cleaning up test files...');
        const allTestFiles = [...uploadedFiles, ...sizeTestFiles];
        let cleanedCount = 0;

        for (const file of allTestFiles) {
            try {
                await bucket.delete(file.fileId);
                cleanedCount++;
            } catch (error) {
                console.log(`⚠️ Failed to delete file ${file.fileId}: ${error.message}`);
            }
        }

        console.log(`✅ Cleaned up ${cleanedCount}/${allTestFiles.length} test files`);

    } catch (error) {
        console.error('❌ GridFS utilities test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// File validation function (copied from gridfs.ts)
function validateFile(file, allowedTypes, maxSizeMB) {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            isValid: false,
            error: `File size must be less than ${maxSizeMB}MB`
        };
    }

    // Check file type
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
        return {
            isValid: false,
            error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        };
    }

    return { isValid: true };
}

// Run if called directly
if (require.main === module) {
    testGridFSUtilities().catch(console.error);
}

module.exports = { testGridFSUtilities };
