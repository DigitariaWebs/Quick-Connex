#!/usr/bin/env node

/**
 * Script to list transfers in the database
 * Usage:
 *   node scripts/list-transfers.js                           - List all transfers
 *   node scripts/list-transfers.js --status pending          - List only pending transfers
 *   node scripts/list-transfers.js --priority urgent         - List only urgent transfers
 *   node scripts/list-transfers.js --format json             - Output in JSON format
 *   node scripts/list-transfers.js --limit 10                - Limit number of results
 *   node scripts/list-transfers.js --sort date               - Sort by date (default: newest first)
 *   node scripts/list-transfers.js --sort priority           - Sort by priority
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    patientInfo: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 120 },
        dossierNumber: { type: String, required: true, trim: true }
    },
    fromHospital: { type: String, required: true, trim: true },
    toHospital: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    requestedDate: { type: Date, required: true, default: Date.now },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    notes: { type: String, trim: true },
    medicalDocuments: [{ type: String, trim: true }],
    scheduling: {
        transferTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    statusHistory: [{
        status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'] },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        reason: { type: String, trim: true }
    }],
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Parse command line arguments
const args = process.argv.slice(2);
const statusFilter = args.find(arg => arg.startsWith('--status='))?.split('=')[1];
const priorityFilter = args.find(arg => arg.startsWith('--priority='))?.split('=')[1];
const format = args.includes('--format=json') ? 'json' : 'table';
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const sortArg = args.find(arg => arg.startsWith('--sort='))?.split('=')[1] || 'date';

function getPriorityEmoji(priority) {
    switch (priority) {
        case 'urgent': return '🚨';
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🟢';
        default: return '⚪';
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'pending': return '⏳';
        case 'accepted': return '✅';
        case 'in_progress': return '🚑';
        case 'completed': return '🏁';
        case 'cancelled': return '❌';
        default: return '❓';
    }
}

async function listTransfers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Build query
        const query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }
        if (priorityFilter) {
            query.priority = priorityFilter;
        }

        // Build sort
        let sort = {};
        switch (sortArg) {
            case 'priority':
                sort = { priority: 1, requestedDate: -1 }; // urgent first, then by date
                break;
            case 'date':
            default:
                sort = { requestedDate: -1 }; // newest first
                break;
        }

        // Get transfers with populated user data
        let transfersQuery = Transfer.find(query)
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('lastModifiedBy', 'firstName lastName email')
            .sort(sort);

        if (limit) {
            transfersQuery = transfersQuery.limit(limit);
        }

        const transfers = await transfersQuery.exec();

        if (format === 'json') {
            console.log(JSON.stringify(transfers, null, 2));
        } else {
            // Display in table format
            console.log('\n' + '='.repeat(140));
            console.log('🚑 TRANSFERS LIST');
            console.log('='.repeat(140));

            if (transfers.length === 0) {
                console.log('No transfers found matching the criteria.');
            } else {
                console.log(`Found ${transfers.length} transfer(s):\n`);

                transfers.forEach((transfer, index) => {
                    const priorityEmoji = getPriorityEmoji(transfer.priority);
                    const statusEmoji = getStatusEmoji(transfer.status);

                    console.log(`${index + 1}. ${statusEmoji} ${transfer.transferId}`);
                    console.log(`   👤 Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} (${transfer.patientInfo.age} years)`);
                    console.log(`   📋 Dossier: ${transfer.patientInfo.dossierNumber}`);
                    console.log(`   🏥 From: ${transfer.fromHospital}`);
                    console.log(`   🏥 To: ${transfer.toHospital}`);
                    console.log(`   ${priorityEmoji} Priority: ${transfer.priority.toUpperCase()}`);
                    console.log(`   📊 Status: ${transfer.status}`);
                    console.log(`   📝 Reason: ${transfer.reason}`);

                    if (transfer.requestedBy) {
                        console.log(`   👤 Requested by: ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName} (${transfer.requestedBy.userType})`);
                    }

                    if (transfer.scheduledDate) {
                        console.log(`   📅 Scheduled: ${transfer.scheduledDate.toLocaleString()}`);
                    }

                    if (transfer.scheduling?.transferTime) {
                        console.log(`   ⏰ Transfer time: ${transfer.scheduling.transferTime}`);
                    }

                    if (transfer.estimatedDuration) {
                        console.log(`   ⏱️  Estimated duration: ${transfer.estimatedDuration} minutes`);
                    }

                    if (transfer.actualDuration) {
                        console.log(`   ⏱️  Actual duration: ${transfer.actualDuration} minutes`);
                    }

                    if (transfer.completedDate) {
                        console.log(`   🏁 Completed: ${transfer.completedDate.toLocaleString()}`);
                    }

                    if (transfer.notes) {
                        console.log(`   📄 Notes: ${transfer.notes}`);
                    }

                    console.log(`   📅 Requested: ${transfer.requestedDate.toLocaleString()}`);
                    console.log(`   🔄 Last modified: ${transfer.updatedAt.toLocaleString()}`);
                    console.log('');
                });
            }

            // Display summary
            const totalTransfers = await Transfer.countDocuments();
            const pending = await Transfer.countDocuments({ status: 'pending' });
            const accepted = await Transfer.countDocuments({ status: 'accepted' });
            const inProgress = await Transfer.countDocuments({ status: 'in_progress' });
            const completed = await Transfer.countDocuments({ status: 'completed' });
            const cancelled = await Transfer.countDocuments({ status: 'cancelled' });
            const urgent = await Transfer.countDocuments({ priority: 'urgent' });
            const high = await Transfer.countDocuments({ priority: 'high' });
            const medium = await Transfer.countDocuments({ priority: 'medium' });
            const low = await Transfer.countDocuments({ priority: 'low' });

            console.log('='.repeat(140));
            console.log('📊 SUMMARY');
            console.log('='.repeat(140));
            console.log(`Total transfers: ${totalTransfers}`);
            console.log(`Status breakdown:`);
            console.log(`  ⏳ Pending: ${pending}`);
            console.log(`  ✅ Accepted: ${accepted}`);
            console.log(`  🚑 In Progress: ${inProgress}`);
            console.log(`  🏁 Completed: ${completed}`);
            console.log(`  ❌ Cancelled: ${cancelled}`);
            console.log(`Priority breakdown:`);
            console.log(`  🚨 Urgent: ${urgent}`);
            console.log(`  🔴 High: ${high}`);
            console.log(`  🟡 Medium: ${medium}`);
            console.log(`  🟢 Low: ${low}`);
        }

    } catch (error) {
        console.error('❌ Error listing transfers:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
listTransfers().catch(console.error);
