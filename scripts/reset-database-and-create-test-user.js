const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Test user configuration
const TEST_USER = {
    userType: 'employee',
    firstName: 'Test',
    lastName: 'User',
    email: 'test.user@example.com',
    phone: '+1234567890',
    password: 'TestPass123!',
    documents: []
};

// Test documents configuration
const TEST_DOCUMENTS = [
    {
        documentType: 'opiqPermit',
        originalName: 'test_opiq_permit.pdf',
        mimeType: 'application/pdf',
        content: generateTestPDFContent('OPIQ Permit Test Document')
    },
    {
        documentType: 'rcr',
        originalName: 'test_rcr_document.pdf',
        mimeType: 'application/pdf',
        content: generateTestPDFContent('RCR Document Test Content')
    }
];

// Generate test PDF content
function generateTestPDFContent(title) {
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${title}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000200 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;

    return Buffer.from(pdfContent);
}

// Calculate file checksum
function calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Clear all data from database
async function clearAllData() {
    console.log('🧹 Clearing all data from database...');

    try {
        const client = mongoose.connection.getClient();
        const db = client.db();

        // Clear GridFS files
        console.log('   📁 Clearing GridFS files...');
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });
        const allFiles = await bucket.find({}).toArray();

        for (const file of allFiles) {
            try {
                await bucket.delete(file._id);
                console.log(`     ✅ Deleted: ${file.filename}`);
            } catch (error) {
                console.log(`     ❌ Failed to delete: ${file.filename} - ${error.message}`);
            }
        }

        console.log(`   📊 Deleted ${allFiles.length} GridFS files`);

        // Clear User collection
        console.log('   👥 Clearing User collection...');
        let User;
        try {
            User = mongoose.model('User');
        } catch (error) {
            User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        }
        const deleteResult = await User.deleteMany({});
        console.log(`   📊 Deleted ${deleteResult.deletedCount} users`);

        // Clear any other collections that might exist
        const collections = await db.listCollections().toArray();
        for (const collection of collections) {
            if (collection.name !== 'documents.files' && collection.name !== 'documents.chunks') {
                try {
                    const result = await db.collection(collection.name).deleteMany({});
                    if (result.deletedCount > 0) {
                        console.log(`   📊 Cleared ${result.deletedCount} documents from ${collection.name}`);
                    }
                } catch (error) {
                    console.log(`   ⚠️ Could not clear ${collection.name}: ${error.message}`);
                }
            }
        }

        console.log('✅ Database cleared successfully');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        throw error;
    }
}

// Create test user with documents
async function createTestUser() {
    console.log('👤 Creating test user with documents...');

    try {
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(TEST_USER.password, saltRounds);

        // Create user data
        const userData = {
            ...TEST_USER,
            password: hashedPassword,
            documents: []
        };

        // Upload documents to GridFS
        console.log('   📄 Uploading test documents to GridFS...');
        for (const doc of TEST_DOCUMENTS) {
            const checksum = calculateChecksum(doc.content);
            const timestamp = Date.now();
            const sanitizedFilename = doc.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const gridFSFilename = `${doc.documentType}_test_user_${timestamp}_${sanitizedFilename}`;

            const metadata = {
                userId: 'test_user_id', // Temporary ID, will be updated after user creation
                documentType: doc.documentType,
                originalName: doc.originalName,
                mimeType: doc.mimeType,
                size: doc.content.length,
                checksum: checksum,
                uploadedAt: new Date()
            };

            // Upload to GridFS
            const uploadStream = bucket.openUploadStream(gridFSFilename, { metadata });
            uploadStream.write(doc.content);
            uploadStream.end();

            const fileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            // Add document reference to user data
            userData.documents.push({
                fileId: fileId.toString(),
                documentType: doc.documentType,
                originalName: doc.originalName,
                mimeType: doc.mimeType,
                size: doc.content.length,
                checksum: checksum,
                uploadedAt: new Date()
            });

            console.log(`     ✅ Uploaded: ${doc.originalName} (${doc.documentType})`);
        }

        // Create user in database
        console.log('   💾 Creating user in database...');
        let User;
        try {
            User = mongoose.model('User');
        } catch (error) {
            User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        }
        const newUser = new User(userData);
        const savedUser = await newUser.save();

        console.log(`   ✅ User created with ID: ${savedUser._id}`);

        // Update file metadata with actual user ID
        console.log('   🔄 Updating file metadata with actual user ID...');
        for (const doc of savedUser.documents) {
            try {
                await db.collection('documents.files').updateOne(
                    { _id: new mongoose.Types.ObjectId(doc.fileId) },
                    { $set: { 'metadata.userId': savedUser._id.toString() } }
                );
                console.log(`     ✅ Updated metadata for: ${doc.originalName}`);
            } catch (error) {
                console.log(`     ⚠️ Failed to update metadata for: ${doc.originalName} - ${error.message}`);
            }
        }

        // Update GridFS filenames with actual user ID
        console.log('   📁 Updating GridFS filenames with actual user ID...');
        for (const doc of savedUser.documents) {
            try {
                const timestamp = Date.now();
                const sanitizedFilename = doc.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
                const newGridFSFilename = `${doc.documentType}_${savedUser._id}_${timestamp}_${sanitizedFilename}`;

                await db.collection('documents.files').updateOne(
                    { _id: new mongoose.Types.ObjectId(doc.fileId) },
                    { $set: { filename: newGridFSFilename } }
                );
                console.log(`     ✅ Updated filename for: ${doc.originalName}`);
            } catch (error) {
                console.log(`     ⚠️ Failed to update filename for: ${doc.originalName} - ${error.message}`);
            }
        }

        console.log('✅ Test user created successfully');

        // Display user information
        console.log('\n📋 Test User Information:');
        console.log('─'.repeat(50));
        console.log(`👤 Name: ${savedUser.firstName} ${savedUser.lastName}`);
        console.log(`📧 Email: ${savedUser.email}`);
        console.log(`📱 Phone: ${savedUser.phone}`);
        console.log(`🔑 Password: ${TEST_USER.password}`);
        console.log(`👥 User Type: ${savedUser.userType}`);
        console.log(`🆔 User ID: ${savedUser._id}`);
        console.log(`📄 Documents: ${savedUser.documents.length}`);

        savedUser.documents.forEach((doc, index) => {
            console.log(`   ${index + 1}. ${doc.documentType}: ${doc.originalName}`);
            console.log(`      📁 File ID: ${doc.fileId}`);
            console.log(`      📏 Size: ${(doc.size / 1024).toFixed(2)} KB`);
        });

        return savedUser;

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        throw error;
    }
}

// Verify the created data
async function verifyCreatedData() {
    console.log('\n🔍 Verifying created data...');

    try {
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Check users
        let User;
        try {
            User = mongoose.model('User');
        } catch (error) {
            User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        }
        const users = await User.find({});
        console.log(`👥 Users in database: ${users.length}`);

        if (users.length > 0) {
            const user = users[0];
            console.log(`   👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`   📄 Documents: ${user.documents.length}`);
        }

        // Check GridFS files
        const files = await bucket.find({}).toArray();
        console.log(`📁 Files in GridFS: ${files.length}`);

        for (const file of files) {
            console.log(`   📄 ${file.metadata.originalName} (${file.metadata.documentType})`);
            console.log(`      👤 User ID: ${file.metadata.userId}`);
            console.log(`      📏 Size: ${(file.length / 1024).toFixed(2)} KB`);
        }

        console.log('✅ Data verification completed');

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    }
}

// Main function
async function resetDatabaseAndCreateTestUser() {
    console.log('🚀 Database Reset and Test User Creation');
    console.log('='.repeat(60));
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear all data
        await clearAllData();

        // Create test user
        const testUser = await createTestUser();

        // Verify created data
        await verifyCreatedData();

        console.log('\n🎉 Database reset and test user creation completed successfully!');
        console.log('\n💡 You can now use the test user for signup phase testing:');
        console.log(`   📧 Email: ${testUser.email}`);
        console.log(`   🔑 Password: ${TEST_USER.password}`);

    } catch (error) {
        console.error('❌ Operation failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    resetDatabaseAndCreateTestUser().catch(console.error);
}

module.exports = { resetDatabaseAndCreateTestUser };
