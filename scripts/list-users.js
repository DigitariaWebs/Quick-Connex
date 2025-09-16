#!/usr/bin/env node

/**
 * Script to list all users in the database
 * This helps you find user IDs for deletion
 */

const mongoose = require('mongoose');
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

async function listUsers() {
    try {
        console.log('👥 Listing all users in database...');
        console.log(`🔗 Using MongoDB URI: ${MONGODB_URI}`);

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find({}).select('_id userType firstName lastName email phone documents');

        if (users.length === 0) {
            console.log('📭 No users found in database');
            return;
        }

        console.log(`\n📊 Found ${users.length} user(s):\n`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. 👤 ${user.firstName} ${user.lastName}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone}`);
            console.log(`   🏷️  Type: ${user.userType}`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   📄 Documents: ${user.documents?.length || 0} files`);

            if (user.userType === 'manager') {
                console.log(`   💼 Post: ${user.post || 'N/A'}`);
                console.log(`   🏥 CIUSSS: ${user.ciusss || 'N/A'}`);
            }

            if (user.documents && user.documents.length > 0) {
                console.log(`   📋 Document types:`);
                user.documents.forEach(doc => {
                    console.log(`      - ${doc.documentType}: ${doc.originalName}`);
                });
            }

            console.log(''); // Empty line for readability
        });

        console.log('💡 To delete a specific user, use:');
        console.log('   node scripts/clear-database.js <user_id>');
        console.log('\n💡 To delete all users, use:');
        console.log('   node scripts/clear-database.js');

    } catch (error) {
        console.error('❌ Error listing users:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
listUsers().catch(console.error);
