#!/usr/bin/env node

/**
 * Comprehensive User Management Script
 * 
 * Features:
 * 1. List all users with necessary info (id, email, phone, type)
 * 2. Filter users by type (managers, employees, admin, super_admin)
 * 3. Delete a specific user by ID
 * 4. Delete multiple users by type
 * 5. Create a new user (any role) with verified email and phone
 * 
 * Usage:
 *   node scripts/keep/manage-users.js
 */

const mongoose = require('mongoose');
const readline = require('readline');
const { MongoClient, GridFSBucket } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define User schema directly in the script
const userSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        enum: ['employee', 'manager', 'admin', 'super_admin']
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.ObjectId, ref: 'CIUSSS' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

function normalizePhoneNumber(phone) {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+') && normalized.startsWith('1')) {
        normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
        normalized = '+1' + normalized;
    }
    return normalized;
}

async function displayMainMenu() {
    console.log('\n' + '='.repeat(80));
    console.log('👥 USER MANAGEMENT SYSTEM');
    console.log('='.repeat(80));
    console.log('1. List all users');
    console.log('2. List users by type (managers, employees, admin, super_admin)');
    console.log('3. Delete a specific user by ID');
    console.log('4. Delete multiple users by type');
    console.log('5. Show statistics');
    console.log('6. Create a new user');
    console.log('0. Exit');
    console.log('='.repeat(80));
}

async function listAllUsers(format = 'table') {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        if (format === 'json') {
            console.log(JSON.stringify(users, null, 2));
            return;
        }

        if (users.length === 0) {
            console.log('\n⚠️  No users found in the database.');
            return;
        }

        console.log('\n' + '='.repeat(120));
        console.log(`👥 ALL USERS (${users.length} total)`);
        console.log('='.repeat(120));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone}`);
            console.log(`   👤 Type: ${user.userType}`);
            console.log(`   📊 Status: ${user.status}`);
            console.log(`   ✉️  Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
            console.log(`   📱 Phone Verified: ${user.phoneVerified ? '✅ Yes' : '❌ No'}`);

            if (user.userType === 'manager') {
                console.log(`   💼 Post: ${user.post || 'N/A'}`);
            } else if (user.userType === 'employee') {
                console.log(`   📄 Documents: ${user.documents?.length || 0}`);
            }

            if (user.status === 'approved' && user.approvedBy) {
                console.log(`   ✅ Approved by: ${user.approvedBy}`);
                console.log(`   📅 Approved at: ${user.approvedAt?.toLocaleString() || 'N/A'}`);
            }

            console.log(`   📅 Created: ${user.createdAt?.toLocaleString() || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(120));

    } catch (error) {
        console.error('❌ Error listing users:', error.message);
        throw error;
    }
}

async function listUsersByType(userType) {
    try {
        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];

        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            console.log(`Valid types: ${validTypes.join(', ')}`);
            return;
        }

        const users = await User.find({ userType })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        if (users.length === 0) {
            console.log(`\n⚠️  No ${userType} users found in the database.`);
            return;
        }

        console.log('\n' + '='.repeat(120));
        console.log(`👥 ${userType.toUpperCase()} USERS (${users.length} total)`);
        console.log('='.repeat(120));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone}`);
            console.log(`   📊 Status: ${user.status}`);
            console.log(`   ✉️  Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
            console.log(`   📱 Phone Verified: ${user.phoneVerified ? '✅ Yes' : '❌ No'}`);

            if (user.userType === 'manager') {
                console.log(`   💼 Post: ${user.post || 'N/A'}`);
            }

            console.log(`   📅 Created: ${user.createdAt?.toLocaleString() || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(120));

    } catch (error) {
        console.error('❌ Error listing users by type:', error.message);
        throw error;
    }
}

async function deleteUserById(userId) {
    let client;

    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('\n❌ Invalid user ID format. Please provide a valid MongoDB ObjectId.');
            return false;
        }

        // Find the user first
        const user = await User.findById(userId).lean();
        if (!user) {
            console.log(`\n⚠️  User with ID ${userId} not found.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete user');
        console.log('='.repeat(80));
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Email: ${user.email}`);
        console.log(`Phone: ${user.phone}`);
        console.log(`Type: ${user.userType}`);
        console.log(`Status: ${user.status}`);
        console.log('='.repeat(80));

        const confirm = await question('\nAre you sure you want to delete this user? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        // Connect with native MongoDB client for GridFS operations
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();

        // Delete user documents from GridFS if they exist
        if (user.documents && user.documents.length > 0) {
            const bucket = new GridFSBucket(db, { bucketName: 'fs' });
            for (const doc of user.documents) {
                try {
                    if (doc.fileId && mongoose.Types.ObjectId.isValid(doc.fileId)) {
                        await bucket.delete(new mongoose.Types.ObjectId(doc.fileId));
                        console.log(`   🗑️  Deleted document: ${doc.originalName}`);
                    }
                } catch (err) {
                    console.log(`   ⚠️  Could not delete document ${doc.originalName}: ${err.message}`);
                }
            }
        }

        // Delete the user
        await User.findByIdAndDelete(userId);
        console.log(`\n✅ Successfully deleted user: ${user.firstName} ${user.lastName} (${user.email})`);

        return true;

    } catch (error) {
        console.error('\n❌ Error deleting user:', error.message);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function deleteUsersByType(userType) {
    let client;

    try {
        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];

        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            console.log(`Valid types: ${validTypes.join(', ')}`);
            return false;
        }

        // Count users of this type
        const count = await User.countDocuments({ userType });

        if (count === 0) {
            console.log(`\n⚠️  No ${userType} users found in the database.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete multiple users');
        console.log('='.repeat(80));
        console.log(`User Type: ${userType}`);
        console.log(`Number of users to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} ${userType} user(s)? (yes/no): `);

        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        // Get all users of this type first
        const users = await User.find({ userType }).select('documents').lean();

        // Connect with native MongoDB client for GridFS operations
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'fs' });

        let deletedDocs = 0;

        // Delete all user documents from GridFS
        for (const user of users) {
            if (user.documents && user.documents.length > 0) {
                for (const doc of user.documents) {
                    try {
                        if (doc.fileId && mongoose.Types.ObjectId.isValid(doc.fileId)) {
                            await bucket.delete(new mongoose.Types.ObjectId(doc.fileId));
                            deletedDocs++;
                        }
                    } catch (err) {
                        // Document might already be deleted, continue
                    }
                }
            }
        }

        // Delete all users of this type
        const result = await User.deleteMany({ userType });

        console.log(`\n✅ Successfully deleted ${result.deletedCount} ${userType} user(s)`);
        if (deletedDocs > 0) {
            console.log(`   🗑️  Also deleted ${deletedDocs} associated document(s) from GridFS`);
        }

        return true;

    } catch (error) {
        console.error('\n❌ Error deleting users by type:', error.message);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function showStatistics() {
    try {
        const totalUsers = await User.countDocuments();
        const managers = await User.countDocuments({ userType: 'manager' });
        const employees = await User.countDocuments({ userType: 'employee' });
        const admins = await User.countDocuments({ userType: 'admin' });
        const superAdmins = await User.countDocuments({ userType: 'super_admin' });

        const approved = await User.countDocuments({ status: 'approved' });
        const pending = await User.countDocuments({ status: 'pending' });
        const rejected = await User.countDocuments({ status: 'rejected' });

        const emailVerified = await User.countDocuments({ emailVerified: true });
        const phoneVerified = await User.countDocuments({ phoneVerified: true });

        console.log('\n' + '='.repeat(80));
        console.log('📊 USER STATISTICS');
        console.log('='.repeat(80));
        console.log(`Total Users: ${totalUsers}`);
        console.log('\nBy Type:');
        console.log(`  👨‍💼 Managers: ${managers}`);
        console.log(`  👷 Employees: ${employees}`);
        console.log(`  👤 Admins: ${admins}`);
        console.log(`  🔑 Super Admins: ${superAdmins}`);
        console.log('\nBy Status:');
        console.log(`  ✅ Approved: ${approved}`);
        console.log(`  ⏳ Pending: ${pending}`);
        console.log(`  ❌ Rejected: ${rejected}`);
        console.log('\nVerification Status:');
        console.log(`  ✉️  Email Verified: ${emailVerified}`);
        console.log(`  📱 Phone Verified: ${phoneVerified}`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error getting statistics:', error.message);
        throw error;
    }
}

async function createUser() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('➕ CREATE NEW USER');
        console.log('='.repeat(80));

        // Get user type
        console.log('\nUser Types:');
        console.log('1. employee');
        console.log('2. manager');
        console.log('3. admin');
        console.log('4. super_admin');
        const typeChoice = await question('\nSelect user type (1-4 or type name): ');

        let userType;
        if (typeChoice === '1') userType = 'employee';
        else if (typeChoice === '2') userType = 'manager';
        else if (typeChoice === '3') userType = 'admin';
        else if (typeChoice === '4') userType = 'super_admin';
        else userType = typeChoice.trim().toLowerCase();

        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];
        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            console.log(`Valid types: ${validTypes.join(', ')}`);
            return false;
        }

        // Get basic information
        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');
        const email = await question('Email: ');
        const phone = await question('Phone: ');
        const password = await question('Password (min 6 characters): ');

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !password) {
            console.log('\n❌ All fields are required.');
            return false;
        }

        if (password.length < 6) {
            console.log('\n❌ Password must be at least 6 characters long.');
            return false;
        }

        // Normalize email and phone
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = normalizePhoneNumber(phone);

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: normalizedPhone }
            ]
        });

        if (existingUser) {
            console.log('\n❌ User with this email or phone already exists.');
            if (existingUser.email === normalizedEmail) {
                console.log(`   Email: ${existingUser.email}`);
            }
            if (existingUser.phone === normalizedPhone) {
                console.log(`   Phone: ${existingUser.phone}`);
            }
            return false;
        }

        // Get role-specific fields
        let post = null;
        let ciusss = null;
        let hospital = null;

        if (userType === 'manager') {
            post = await question('Post/Position (optional, press Enter to skip): ');
            if (post && post.trim()) {
                post = post.trim();
            } else {
                post = null;
            }

            const ciusssInput = await question('CIUSSS ID (optional, press Enter to skip): ');
            if (ciusssInput && ciusssInput.trim() && mongoose.Types.ObjectId.isValid(ciusssInput.trim())) {
                ciusss = new mongoose.Types.ObjectId(ciusssInput.trim());
            }

            const hospitalInput = await question('Hospital ID (optional, press Enter to skip): ');
            if (hospitalInput && hospitalInput.trim() && mongoose.Types.ObjectId.isValid(hospitalInput.trim())) {
                hospital = new mongoose.Types.ObjectId(hospitalInput.trim());
            }
        }

        // Get status
        console.log('\nStatus options:');
        console.log('1. pending');
        console.log('2. approved');
        console.log('3. rejected');
        const statusChoice = await question('Select status (1-3, default: approved): ');

        let status = 'approved';
        if (statusChoice === '1') status = 'pending';
        else if (statusChoice === '2') status = 'approved';
        else if (statusChoice === '3') status = 'rejected';

        // Hash password
        console.log('\n🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);

        // Prepare user document
        const now = new Date();
        const userDoc = {
            userType,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            password: hashedPassword,
            status,
            emailVerified: true,
            phoneVerified: true,
            emailVerifiedAt: now,
            phoneVerifiedAt: now,
            documents: []
        };

        // Add role-specific fields
        if (userType === 'manager' && post) {
            userDoc.post = post;
        }
        if (ciusss) {
            userDoc.ciusss = ciusss;
        }
        if (hospital) {
            userDoc.hospital = hospital;
        }

        // Add approval info if approved
        if (status === 'approved') {
            userDoc.approvedBy = 'system';
            userDoc.approvedAt = now;
        }

        // Create user
        console.log('\n📝 Creating user...');
        const user = new User(userDoc);
        const savedUser = await user.save();

        console.log('\n' + '='.repeat(80));
        console.log('✅ USER CREATED SUCCESSFULLY');
        console.log('='.repeat(80));
        console.log(`🆔 ID: ${savedUser._id}`);
        console.log(`👤 Name: ${savedUser.firstName} ${savedUser.lastName}`);
        console.log(`📧 Email: ${savedUser.email}`);
        console.log(`📱 Phone: ${savedUser.phone}`);
        console.log(`👤 Type: ${savedUser.userType}`);
        console.log(`📊 Status: ${savedUser.status}`);
        console.log(`✉️  Email Verified: ✅ Yes`);
        console.log(`📱 Phone Verified: ✅ Yes`);
        if (savedUser.post) {
            console.log(`💼 Post: ${savedUser.post}`);
        }
        console.log('='.repeat(80));

        return true;

    } catch (error) {
        if (error.code === 11000) {
            console.error('\n❌ Error: User with this email or phone already exists.');
        } else {
            console.error('\n❌ Error creating user:', error.message);
        }
        throw error;
    }
}

async function main() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        let running = true;

        while (running) {
            await displayMainMenu();

            const choice = await question('\nSelect an option: ');

            switch (choice.trim()) {
                case '1':
                    await listAllUsers();
                    await question('\nPress Enter to continue...');
                    break;

                case '2':
                    console.log('\nUser Types:');
                    console.log('1. employee');
                    console.log('2. manager');
                    console.log('3. admin');
                    console.log('4. super_admin');
                    const typeChoice = await question('\nSelect user type (1-4 or type name): ');

                    let userType;
                    if (typeChoice === '1') userType = 'employee';
                    else if (typeChoice === '2') userType = 'manager';
                    else if (typeChoice === '3') userType = 'admin';
                    else if (typeChoice === '4') userType = 'super_admin';
                    else userType = typeChoice.trim().toLowerCase();

                    await listUsersByType(userType);
                    await question('\nPress Enter to continue...');
                    break;

                case '3':
                    const userId = await question('\nEnter user ID to delete: ');
                    await deleteUserById(userId.trim());
                    await question('\nPress Enter to continue...');
                    break;

                case '4':
                    console.log('\nUser Types:');
                    console.log('1. employee');
                    console.log('2. manager');
                    console.log('3. admin');
                    console.log('4. super_admin');
                    const deleteTypeChoice = await question('\nSelect user type to delete (1-4 or type name): ');

                    let deleteUserType;
                    if (deleteTypeChoice === '1') deleteUserType = 'employee';
                    else if (deleteTypeChoice === '2') deleteUserType = 'manager';
                    else if (deleteTypeChoice === '3') deleteUserType = 'admin';
                    else if (deleteTypeChoice === '4') deleteUserType = 'super_admin';
                    else deleteUserType = deleteTypeChoice.trim().toLowerCase();

                    await deleteUsersByType(deleteUserType);
                    await question('\nPress Enter to continue...');
                    break;

                case '5':
                    await showStatistics();
                    await question('\nPress Enter to continue...');
                    break;

                case '6':
                    await createUser();
                    await question('\nPress Enter to continue...');
                    break;

                case '0':
                    running = false;
                    console.log('\n👋 Goodbye!');
                    break;

                default:
                    console.log('\n❌ Invalid option. Please try again.');
                    await question('\nPress Enter to continue...');
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { listAllUsers, listUsersByType, deleteUserById, deleteUsersByType, showStatistics, createUser };

