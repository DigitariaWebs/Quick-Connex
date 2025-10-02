#!/usr/bin/env node

/**
 * Script to update transfer status
 * Usage:
 *   node scripts/update-transfer-status.js <transfer_id> --status accepted                    - Update transfer status
 *   node scripts/update-transfer-status.js <transfer_id> --status in_progress                 - Update transfer status
 *   node scripts/update-transfer-status.js <transfer_id> --status completed                   - Update transfer status
 *   node scripts/update-transfer-status.js <transfer_id> --status cancelled --reason "reason" - Cancel transfer with reason
 *   node scripts/update-transfer-status.js <transfer_id> --schedule "2024-01-15 14:30"       - Schedule transfer
 *   node scripts/update-transfer-status.js <transfer_id> --complete --duration 90            - Complete transfer with duration
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
const transferId = args[0];
const statusArg = args.find(arg => arg.startsWith('--status='))?.split('=')[1];
const scheduleArg = args.find(arg => arg.startsWith('--schedule='))?.split('=')[1];
const completeArg = args.includes('--complete');
const durationArg = args.find(arg => arg.startsWith('--duration='))?.split('=')[1];
const reasonArg = args.find(arg => arg.startsWith('--reason='))?.split('=')[1];

async function updateTransferStatus() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        if (!transferId) {
            console.error('❌ Transfer ID is required');
            console.error('Usage: node scripts/update-transfer-status.js <transfer_id> [options]');
            process.exit(1);
        }

        // Find the transfer
        const transfer = await Transfer.findOne({ transferId }).populate('requestedBy', 'firstName lastName email');
        if (!transfer) {
            console.error(`❌ Transfer not found: ${transferId}`);
            process.exit(1);
        }

        console.log(`🚑 Found transfer: ${transfer.transferId}`);
        console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`   From: ${transfer.fromHospital} → To: ${transfer.toHospital}`);
        console.log(`   Current status: ${transfer.status}`);
        console.log(`   Priority: ${transfer.priority}`);

        // Get a user to be the modifier (prefer manager, fallback to any user)
        let modifier = await User.findOne({ userType: 'manager', status: 'approved' });
        if (!modifier) {
            modifier = await User.findOne({ status: 'approved' });
        }
        if (!modifier) {
            console.error('❌ No approved user found to perform the update');
            process.exit(1);
        }

        console.log(`👤 Using modifier: ${modifier.firstName} ${modifier.lastName} (${modifier.userType})`);

        let updated = false;
        const updateReason = reasonArg || 'Status updated via script';

        // Update status
        if (statusArg) {
            if (!['pending', 'accepted', 'in_progress', 'completed', 'cancelled'].includes(statusArg)) {
                console.error(`❌ Invalid status: ${statusArg}`);
                console.error('Valid statuses: pending, accepted, in_progress, completed, cancelled');
                process.exit(1);
            }

            const oldStatus = transfer.status;
            transfer.status = statusArg;
            transfer.lastModifiedBy = modifier._id;

            // Add to status history
            transfer.statusHistory.push({
                status: statusArg,
                changedBy: modifier._id,
                changedAt: new Date(),
                reason: updateReason
            });

            // Set completion date if completing
            if (statusArg === 'completed') {
                transfer.completedDate = new Date();
                if (durationArg) {
                    transfer.actualDuration = parseInt(durationArg);
                }
            }

            await transfer.save();
            console.log(`✅ Status updated: ${oldStatus} → ${statusArg}`);
            updated = true;
        }

        // Schedule transfer
        if (scheduleArg) {
            const scheduledDate = new Date(scheduleArg);
            if (isNaN(scheduledDate.getTime())) {
                console.error(`❌ Invalid date format: ${scheduleArg}`);
                console.error('Expected format: YYYY-MM-DD HH:MM or ISO string');
                process.exit(1);
            }

            transfer.scheduledDate = scheduledDate;
            transfer.lastModifiedBy = modifier._id;

            // If not already accepted, accept it
            if (transfer.status === 'pending') {
                transfer.status = 'accepted';
                transfer.statusHistory.push({
                    status: 'accepted',
                    changedBy: modifier._id,
                    changedAt: new Date(),
                    reason: 'Transfer scheduled'
                });
            }

            await transfer.save();
            console.log(`📅 Transfer scheduled for: ${scheduledDate.toLocaleString()}`);
            updated = true;
        }

        // Complete transfer
        if (completeArg) {
            transfer.status = 'completed';
            transfer.completedDate = new Date();
            transfer.lastModifiedBy = modifier._id;

            if (durationArg) {
                transfer.actualDuration = parseInt(durationArg);
            }

            transfer.statusHistory.push({
                status: 'completed',
                changedBy: modifier._id,
                changedAt: new Date(),
                reason: updateReason
            });

            await transfer.save();
            console.log(`🏁 Transfer completed at: ${transfer.completedDate.toLocaleString()}`);
            if (transfer.actualDuration) {
                console.log(`⏱️  Actual duration: ${transfer.actualDuration} minutes`);
            }
            updated = true;
        }

        if (!updated) {
            console.log('⚠️  No updates specified. Use --status, --schedule, or --complete');
            console.log('Available options:');
            console.log('  --status=<status>     Update transfer status');
            console.log('  --schedule=<datetime> Schedule the transfer');
            console.log('  --complete            Mark transfer as completed');
            console.log('  --duration=<minutes>  Set actual duration (with --complete)');
            console.log('  --reason=<reason>     Add reason for the update');
        } else {
            console.log(`\n🎉 Transfer ${transferId} updated successfully!`);

            // Show final status
            const updatedTransfer = await Transfer.findOne({ transferId }).populate('requestedBy', 'firstName lastName email');
            console.log(`📊 Final status: ${updatedTransfer.status}`);
            if (updatedTransfer.scheduledDate) {
                console.log(`📅 Scheduled: ${updatedTransfer.scheduledDate.toLocaleString()}`);
            }
            if (updatedTransfer.completedDate) {
                console.log(`🏁 Completed: ${updatedTransfer.completedDate.toLocaleString()}`);
            }
        }

    } catch (error) {
        console.error('❌ Error updating transfer status:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
updateTransferStatus().catch(console.error);
