#!/usr/bin/env node

/**
 * Script to approve or reject users
 * Usage:
 *   node scripts/approve-user.js <email> --approve                    - Approve user by email
 *   node scripts/approve-user.js <email> --reject "reason"            - Reject user by email
 *   node scripts/approve-user.js <user_id> --approve                  - Approve user by ID
 *   node scripts/approve-user.js <user_id> --reject "reason"          - Reject user by ID
 *   node scripts/approve-user.js --approve-all                        - Approve all pending users
 *   node scripts/approve-user.js --reject-all "reason"                - Reject all pending users
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
    ciusss: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Parse command line arguments
const args = process.argv.slice(2);
const identifier = args[0];
const action = args.find(arg => arg.startsWith('--approve')) ? 'approve' :
    args.find(arg => arg.startsWith('--reject')) ? 'reject' : null;
const rejectReason = args.find(arg => arg.startsWith('--reject='))?.split('=')[1] ||
    args.find(arg => arg.startsWith('--reject-all='))?.split('=')[1] ||
    'No reason provided';
const approveAll = args.includes('--approve-all');
const rejectAll = args.includes('--reject-all');

async function approveUser() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        if (approveAll) {
            await approveAllUsers();
        } else if (rejectAll) {
            await rejectAllUsers(rejectReason);
        } else if (!identifier || !action) {
            console.error('❌ Usage: node scripts/approve-user.js <email|user_id> --approve|--reject [reason]');
            console.error('   Or: node scripts/approve-user.js --approve-all|--reject-all [reason]');
            process.exit(1);
        } else {
            await processSingleUser(identifier, action, rejectReason);
        }

    } catch (error) {
        console.error('❌ Error processing user approval:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

async function processSingleUser(identifier, action, rejectReason) {
    try {
        // Determine if identifier is email or ObjectId
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier } : { _id: identifier };

        const user = await User.findOne(query);
        if (!user) {
            console.error(`❌ User not found: ${identifier}`);
            return;
        }

        console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`📊 Current status: ${user.status}`);

        if (user.status !== 'pending') {
            console.log(`⚠️  User is already ${user.status}. No action taken.`);
            return;
        }

        if (action === 'approve') {
            user.status = 'approved';
            user.approvedBy = 'admin@system.com';
            user.approvedAt = new Date();
            user.rejectionReason = undefined;

            await user.save();
            console.log(`✅ User approved successfully!`);
        } else if (action === 'reject') {
            user.status = 'rejected';
            user.rejectionReason = rejectReason;
            user.approvedBy = 'admin@system.com';
            user.approvedAt = new Date();

            await user.save();
            console.log(`❌ User rejected successfully!`);
            console.log(`📝 Rejection reason: ${rejectReason}`);
        }

    } catch (error) {
        console.error('❌ Error processing single user:', error);
        throw error;
    }
}

async function approveAllUsers() {
    try {
        console.log('🔄 Approving all pending users...');

        const result = await User.updateMany(
            { status: 'pending' },
            {
                status: 'approved',
                approvedBy: 'admin@system.com',
                approvedAt: new Date(),
                $unset: { rejectionReason: 1 }
            }
        );

        console.log(`✅ Approved ${result.modifiedCount} pending users`);

        if (result.modifiedCount === 0) {
            console.log('ℹ️  No pending users found to approve');
        }

    } catch (error) {
        console.error('❌ Error approving all users:', error);
        throw error;
    }
}

async function rejectAllUsers(rejectReason) {
    try {
        console.log('🔄 Rejecting all pending users...');

        const result = await User.updateMany(
            { status: 'pending' },
            {
                status: 'rejected',
                rejectionReason: rejectReason,
                approvedBy: 'admin@system.com',
                approvedAt: new Date()
            }
        );

        console.log(`❌ Rejected ${result.modifiedCount} pending users`);
        console.log(`📝 Rejection reason: ${rejectReason}`);

        if (result.modifiedCount === 0) {
            console.log('ℹ️  No pending users found to reject');
        }

    } catch (error) {
        console.error('❌ Error rejecting all users:', error);
        throw error;
    }
}

// Run the script
approveUser().catch(console.error);
