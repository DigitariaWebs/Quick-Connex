const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

// Script to verify file-user relationships in GridFS
async function verifyFileUserRelationships() {
    console.log('🔍 Verifying File-User Relationships in GridFS');
    console.log('='.repeat(60));

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // 1. Get all files in GridFS
        console.log('\n📋 Step 1: Analyzing all files in GridFS...');
        const allFiles = await bucket.find({}).toArray();
        console.log(`📊 Total files in GridFS: ${allFiles.length}`);

        if (allFiles.length === 0) {
            console.log('ℹ️ No files found in GridFS. Upload some files first to see relationships.');
            return;
        }

        // 2. Analyze file metadata
        console.log('\n📋 Step 2: Analyzing file metadata...');
        const filesWithMetadata = allFiles.filter(file => file.metadata);
        const filesWithoutMetadata = allFiles.filter(file => !file.metadata);

        console.log(`✅ Files with metadata: ${filesWithMetadata.length}`);
        console.log(`⚠️ Files without metadata: ${filesWithoutMetadata.length}`);

        // 3. Group files by user
        console.log('\n👥 Step 3: Grouping files by user...');
        const userFileMap = new Map();
        const orphanedFiles = [];

        filesWithMetadata.forEach(file => {
            const userId = file.metadata.userId;
            if (userId) {
                if (!userFileMap.has(userId)) {
                    userFileMap.set(userId, []);
                }
                userFileMap.get(userId).push(file);
            } else {
                orphanedFiles.push(file);
            }
        });

        console.log(`👥 Unique users with files: ${userFileMap.size}`);
        console.log(`🔍 Orphaned files (no userId): ${orphanedFiles.length}`);

        // 4. Display user-file relationships
        console.log('\n📊 Step 4: User-File Relationships:');
        console.log('─'.repeat(60));

        for (const [userId, files] of userFileMap) {
            console.log(`\n👤 User ID: ${userId}`);
            console.log(`   📄 Files: ${files.length}`);

            // Group by document type
            const byType = files.reduce((acc, file) => {
                const type = file.metadata.documentType || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            console.log(`   📋 Document types:`, byType);

            // Show file details
            files.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.metadata.originalName || file.filename}`);
                console.log(`      📁 GridFS filename: ${file.filename}`);
                console.log(`      📏 Size: ${(file.length / 1024).toFixed(2)} KB`);
                console.log(`      📅 Uploaded: ${file.uploadDate.toISOString()}`);
                console.log(`      🏷️ Type: ${file.metadata.documentType || 'unknown'}`);
                console.log(`      🔗 File ID: ${file._id}`);
            });
        }

        // 5. Check for orphaned files
        if (orphanedFiles.length > 0) {
            console.log('\n⚠️ Step 5: Orphaned Files (no user association):');
            console.log('─'.repeat(60));
            orphanedFiles.forEach((file, index) => {
                console.log(`${index + 1}. ${file.filename}`);
                console.log(`   📏 Size: ${(file.length / 1024).toFixed(2)} KB`);
                console.log(`   📅 Uploaded: ${file.uploadDate.toISOString()}`);
                console.log(`   🔗 File ID: ${file._id}`);
                console.log(`   📋 Metadata: ${JSON.stringify(file.metadata)}`);
            });
        }

        // 6. Verify against User collection
        console.log('\n🔍 Step 6: Verifying against User collection...');
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const users = await User.find({}).select('_id userType firstName lastName email documents');

        console.log(`👥 Total users in database: ${users.length}`);

        const usersWithFiles = users.filter(user => user.documents && user.documents.length > 0);
        console.log(`📄 Users with documents: ${usersWithFiles.length}`);

        // Cross-reference GridFS files with User documents
        console.log('\n🔗 Step 7: Cross-referencing GridFS files with User documents...');
        let matchedFiles = 0;
        let unmatchedFiles = 0;

        for (const [userId, files] of userFileMap) {
            const user = users.find(u => u._id.toString() === userId);
            if (user) {
                console.log(`\n✅ User found: ${user.firstName} ${user.lastName} (${user.email})`);
                console.log(`   📄 User documents: ${user.documents?.length || 0}`);
                console.log(`   📁 GridFS files: ${files.length}`);

                if (user.documents) {
                    const userFileIds = user.documents.map(doc => doc.fileId);
                    const gridfsFileIds = files.map(file => file._id.toString());

                    const matchingIds = userFileIds.filter(id => gridfsFileIds.includes(id));
                    const missingInUser = gridfsFileIds.filter(id => !userFileIds.includes(id));
                    const missingInGridFS = userFileIds.filter(id => !gridfsFileIds.includes(id));

                    console.log(`   🔗 Matching files: ${matchingIds.length}`);
                    if (missingInUser.length > 0) {
                        console.log(`   ⚠️ Files in GridFS but not in User: ${missingInUser.length}`);
                    }
                    if (missingInGridFS.length > 0) {
                        console.log(`   ⚠️ Files in User but not in GridFS: ${missingInGridFS.length}`);
                    }

                    matchedFiles += matchingIds.length;
                    unmatchedFiles += missingInUser.length + missingInGridFS.length;
                }
            } else {
                console.log(`\n❌ User not found for ID: ${userId}`);
                console.log(`   📁 GridFS files: ${files.length}`);
                unmatchedFiles += files.length;
            }
        }

        // 7. Summary
        console.log('\n📊 Step 8: Summary Report');
        console.log('='.repeat(60));
        console.log(`📁 Total GridFS files: ${allFiles.length}`);
        console.log(`👥 Unique users with files: ${userFileMap.size}`);
        console.log(`🔗 Matched file-user relationships: ${matchedFiles}`);
        console.log(`⚠️ Unmatched relationships: ${unmatchedFiles}`);
        console.log(`🔍 Orphaned files: ${orphanedFiles.length}`);
        console.log(`📄 Files without metadata: ${filesWithoutMetadata.length}`);

        // 8. Data integrity check
        console.log('\n🔍 Step 9: Data Integrity Check');
        console.log('─'.repeat(60));

        const integrityIssues = [];

        // Check for files without metadata
        if (filesWithoutMetadata.length > 0) {
            integrityIssues.push(`${filesWithoutMetadata.length} files without metadata`);
        }

        // Check for orphaned files
        if (orphanedFiles.length > 0) {
            integrityIssues.push(`${orphanedFiles.length} orphaned files (no userId)`);
        }

        // Check for unmatched relationships
        if (unmatchedFiles > 0) {
            integrityIssues.push(`${unmatchedFiles} unmatched file-user relationships`);
        }

        if (integrityIssues.length === 0) {
            console.log('✅ Data integrity: All files are properly associated with users');
        } else {
            console.log('⚠️ Data integrity issues found:');
            integrityIssues.forEach(issue => console.log(`   - ${issue}`));
        }

        // 9. Recommendations
        console.log('\n💡 Step 10: Recommendations');
        console.log('─'.repeat(60));

        if (orphanedFiles.length > 0) {
            console.log('🔧 Consider cleaning up orphaned files:');
            console.log('   - Files without userId in metadata');
            console.log('   - These may be test files or corrupted uploads');
        }

        if (unmatchedFiles > 0) {
            console.log('🔧 Consider syncing file references:');
            console.log('   - Update User documents with correct file IDs');
            console.log('   - Or update GridFS metadata with correct user IDs');
        }

        if (filesWithoutMetadata.length > 0) {
            console.log('🔧 Consider adding metadata to files:');
            console.log('   - Files without metadata are harder to manage');
            console.log('   - Consider migrating or cleaning up these files');
        }

    } catch (error) {
        console.error('❌ Error verifying file-user relationships:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

// Helper function to clean up orphaned files
async function cleanupOrphanedFiles() {
    console.log('\n🧹 Cleaning up orphaned files...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    try {
        await mongoose.connect(mongoUri);
        const client = mongoose.connection.getClient();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'documents' });

        // Find orphaned files (no userId in metadata)
        const orphanedFiles = await bucket.find({
            $or: [
                { metadata: { $exists: false } },
                { 'metadata.userId': { $exists: false } },
                { 'metadata.userId': null }
            ]
        }).toArray();

        console.log(`🔍 Found ${orphanedFiles.length} orphaned files`);

        if (orphanedFiles.length > 0) {
            console.log('🗑️ Deleting orphaned files...');
            let deletedCount = 0;

            for (const file of orphanedFiles) {
                try {
                    await bucket.delete(file._id);
                    deletedCount++;
                    console.log(`   ✅ Deleted: ${file.filename} (${file._id})`);
                } catch (error) {
                    console.log(`   ❌ Failed to delete: ${file.filename} - ${error.message}`);
                }
            }

            console.log(`✅ Cleanup completed: ${deletedCount}/${orphanedFiles.length} files deleted`);
        } else {
            console.log('✅ No orphaned files found');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--cleanup')) {
        cleanupOrphanedFiles().catch(console.error);
    } else {
        verifyFileUserRelationships().catch(console.error);
    }
}

module.exports = { verifyFileUserRelationships, cleanupOrphanedFiles };
