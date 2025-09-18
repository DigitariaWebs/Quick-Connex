#!/usr/bin/env node

/**
 * Script to list users in the database
 * Usage:
 *   node scripts/list-users.js                           - List all users
 *   node scripts/list-users.js --type manager            - List only managers
 *   node scripts/list-users.js --type employee           - List only employees
 *   node scripts/list-users.js --status pending          - List only pending users
 *   node scripts/list-users.js --status approved         - List only approved users
 *   node scripts/list-users.js --format json             - Output in JSON format
 *   node scripts/list-users.js --limit 10                - Limit number of results
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
const typeFilter = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
const statusFilter = args.find(arg => arg.startsWith('--status='))?.split('=')[1];
const format = args.includes('--format=json') ? 'json' : 'table';
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function listUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Build query
        const query = {};
        if (typeFilter) {
            query.userType = typeFilter;
        }
        if (statusFilter) {
            query.status = statusFilter;
        }

        // Get users
        let usersQuery = User.find(query).select('-password').sort({ createdAt: -1 });
        if (limit) {
            usersQuery = usersQuery.limit(limit);
        }

        const users = await usersQuery.exec();

        if (format === 'json') {
            console.log(JSON.stringify(users, null, 2));
        } else {
            // Display in table format
            console.log('\n' + '='.repeat(120));
            console.log('👥 USERS LIST');
            console.log('='.repeat(120));

            if (users.length === 0) {
                console.log('No users found matching the criteria.');
            } else {
                console.log(`Found ${users.length} user(s):\n`);

                users.forEach((user, index) => {
                    console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
                    console.log(`   📧 Email: ${user.email}`);
                    console.log(`   📱 Phone: ${user.phone}`);
                    console.log(`   👤 Type: ${user.userType}`);
                    console.log(`   📊 Status: ${user.status}`);

                    if (user.userType === 'manager') {
                        console.log(`   💼 Post: ${user.post || 'N/A'}`);
                        console.log(`   🏥 CIUSSS: ${user.ciuss || 'N/A'}`);
                    } else if (user.userType === 'employee') {
                        console.log(`   📄 Documents: ${user.documents?.length || 0}`);
                        if (user.documents && user.documents.length > 0) {
                            const docTypes = user.documents.map(doc => doc.documentType).join(', ');
                            console.log(`   📋 Document Types: ${docTypes}`);
                        }
                    }

                    if (user.status === 'approved' && user.approvedBy) {
                        console.log(`   ✅ Approved by: ${user.approvedBy}`);
                        console.log(`   📅 Approved at: ${user.approvedAt?.toLocaleString() || 'N/A'}`);
                    } else if (user.status === 'rejected' && user.rejectionReason) {
                        console.log(`   ❌ Rejection reason: ${user.rejectionReason}`);
                    }

                    console.log(`   📅 Created: ${user.createdAt.toLocaleString()}`);
                    console.log(`   🔄 Updated: ${user.updatedAt.toLocaleString()}`);
                    console.log('');
                });
            }

            // Display summary
            const totalUsers = await User.countDocuments();
            const managers = await User.countDocuments({ userType: 'manager' });
            const employees = await User.countDocuments({ userType: 'employee' });
            const approved = await User.countDocuments({ status: 'approved' });
            const pending = await User.countDocuments({ status: 'pending' });
            const rejected = await User.countDocuments({ status: 'rejected' });

            console.log('='.repeat(120));
            console.log('📊 SUMMARY');
            console.log('='.repeat(120));
            console.log(`Total users: ${totalUsers}`);
            console.log(`Managers: ${managers}`);
            console.log(`Employees: ${employees}`);
            console.log(`Approved: ${approved}`);
            console.log(`Pending: ${pending}`);
            console.log(`Rejected: ${rejected}`);
        }

    } catch (error) {
        console.error('❌ Error listing users:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
listUsers().catch(console.error);
