#!/usr/bin/env node

/**
 * Script to clear database records
 * Usage:
 *   node scripts/clear-database.js                    - Delete all users
 *   node scripts/clear-database.js <user_id>          - Delete specific user by ID
 */

const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define User schema directly in the script
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    class: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Get command line arguments
const args = process.argv.slice(2);
const targetUserId = args[0];

async function clearDatabase() {
    let client;

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Connect with native MongoDB client for GridFS operations
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();

        if (targetUserId) {
            // Delete specific user
            await deleteSpecificUser(targetUserId, db);
        } else {
            // Delete all users
            await deleteAllUsers(db);
        }

    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
        process.exit(1);
    } finally {
        // Close connections
        if (client) {
            await client.close();
        }
        await mongoose.disconnect();
        console.log('🔌 Database connections closed');
    }
}

async function deleteSpecificUser(userId, db) {
    try {
        console.log(`🎯 Deleting specific user: ${userId}`);

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error('❌ Invalid user ID format. Please provide a valid MongoDB ObjectId.');
            return;
        }

        // Find the user first
        const user = await User.findById(userId);
        if (!user) {
            console.log(`⚠️  User with ID ${userId} not found.`);
            return;
        }

        console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`📋 User type: ${user.userType}`);

        // Get user's document file IDs
        const fileIds = user.documents?.map(doc => doc.fileId) || [];
        console.log(`📄 User has ${fileIds.length} documents`);

        // Delete user from database
        const deleteResult = await User.deleteOne({ _id: userId });
        if (deleteResult.deletedCount > 0) {
            console.log(`✅ User deleted successfully`);
        } else {
            console.log(`⚠️  User was not deleted`);
            return;
        }

        // Delete associated files from GridFS
        if (fileIds.length > 0) {
            console.log('🗑️  Deleting associated files from GridFS...');

            const filesCollection = db.collection('fs.files');
            const chunksCollection = db.collection('fs.chunks');

            for (const fileId of fileIds) {
                try {
                    // Delete file chunks first
                    const chunksResult = await chunksCollection.deleteMany({ files_id: new mongoose.Types.ObjectId(fileId) });
                    console.log(`   - Deleted ${chunksResult.deletedCount} chunks for file ${fileId}`);

                    // Delete file metadata
                    const fileResult = await filesCollection.deleteOne({ _id: new mongoose.Types.ObjectId(fileId) });
                    if (fileResult.deletedCount > 0) {
                        console.log(`   - Deleted file metadata for ${fileId}`);
                    }
                } catch (fileError) {
                    console.log(`   ⚠️  Could not delete file ${fileId}: ${fileError.message}`);
                }
            }
        }

        console.log('🎉 User deletion completed successfully!');

    } catch (error) {
        console.error('❌ Error deleting specific user:', error);
        throw error;
    }
}

async function deleteAllUsers(db) {
    try {
        console.log('🗑️  Starting full database cleanup...');

        // Get collection counts before deletion
        const userCount = await User.countDocuments();
        console.log(`📊 Found ${userCount} users in database`);

        // Delete all users
        if (userCount > 0) {
            console.log('🗑️  Deleting all users...');
            const deleteResult = await User.deleteMany({});
            console.log(`✅ Deleted ${deleteResult.deletedCount} users`);
        }

        // Clear GridFS collections
        console.log('🗑️  Clearing GridFS files...');

        // Clear fs.files collection
        const filesCollection = db.collection('fs.files');
        const filesCount = await filesCollection.countDocuments();
        if (filesCount > 0) {
            await filesCollection.deleteMany({});
            console.log(`✅ Deleted ${filesCount} files from fs.files`);
        }

        // Clear fs.chunks collection
        const chunksCollection = db.collection('fs.chunks');
        const chunksCount = await chunksCollection.countDocuments();
        if (chunksCount > 0) {
            await chunksCollection.deleteMany({});
            console.log(`✅ Deleted ${chunksCount} chunks from fs.chunks`);
        }

        // Clear any other collections that might exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);

        // Clear other collections (excluding system collections)
        const collectionsToClear = collectionNames.filter(name =>
            !name.startsWith('system.') &&
            name !== 'fs.files' &&
            name !== 'fs.chunks' &&
            name !== 'users'
        );

        for (const collectionName of collectionsToClear) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            if (count > 0) {
                await collection.deleteMany({});
                console.log(`✅ Cleared ${count} documents from ${collectionName}`);
            }
        }

        console.log('🎉 Full database cleanup completed successfully!');
        console.log('📊 Final state:');
        console.log(`   - Users: ${await User.countDocuments()}`);
        console.log(`   - Files: ${await filesCollection.countDocuments()}`);
        console.log(`   - Chunks: ${await chunksCollection.countDocuments()}`);

    } catch (error) {
        console.error('❌ Error during full database cleanup:', error);
        throw error;
    }
}

// Run the cleanup
clearDatabase().catch(console.error);
