#!/usr/bin/env node

/**
 * Clear All Transfers Script
 * 
 * This script removes all transfer records from the database.
 * Use with caution - this action cannot be undone!
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Transfer schema (minimal for deletion)
const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    patientInfo: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 120 },
        dossierNumber: { type: String, required: true, trim: true }
    },
    fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    toHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    fromHospitalName: { type: String, required: true, trim: true },
    toHospitalName: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
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
    timeline: [{
        id: { type: String, required: true },
        type: {
            type: String, required: true, enum: [
                'created', 'status_changed', 'assigned', 'unassigned', 'patient_updated',
                'hospital_updated', 'scheduled', 'rescheduled', 'document_uploaded',
                'document_removed', 'notes_updated', 'priority_changed', 'reason_updated',
                'approved', 'rejected', 'accepted', 'started', 'completed', 'cancelled',
                'communication', 'system', 'admin_action', 'manager_action', 'employee_action'
            ]
        },
        title: { type: String, required: true },
        description: { type: String, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
        actor: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
            userType: { type: String, required: true, enum: ['manager', 'employee', 'admin'] }
        },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        isSystemEvent: { type: Boolean, default: false },
        isVisible: { type: Boolean, default: true }
    }],
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 }
}, {
    timestamps: true,
    versionKey: false
});

// Create model
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

async function clearAllTransfers() {
    try {
        console.log('🗑️  Clearing All Transfers from Database...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Count existing transfers
        const transferCount = await Transfer.countDocuments();
        console.log(`📊 Found ${transferCount} transfers in the database`);

        if (transferCount === 0) {
            console.log('ℹ️  No transfers to delete. Database is already empty.');
            return;
        }

        // Show some sample transfers before deletion
        console.log('\n📋 Sample transfers to be deleted:');
        const sampleTransfers = await Transfer.find({}).limit(3).select('transferId patientInfo status priority');
        sampleTransfers.forEach((transfer, index) => {
            console.log(`   ${index + 1}. ${transfer.transferId} - ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} (${transfer.status}, ${transfer.priority})`);
        });

        if (transferCount > 3) {
            console.log(`   ... and ${transferCount - 3} more transfers`);
        }

        // Confirmation prompt
        console.log('\n⚠️  WARNING: This action will permanently delete ALL transfers!');
        console.log('   This includes:');
        console.log('   - All transfer records');
        console.log('   - All timeline events');
        console.log('   - All status history');
        console.log('   - All associated data');
        console.log('\n   This action CANNOT be undone!');

        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed with the deletion
        console.log('\n🗑️  Proceeding with deletion...');

        // Delete all transfers
        const deleteResult = await Transfer.deleteMany({});

        console.log(`✅ Successfully deleted ${deleteResult.deletedCount} transfers`);
        console.log('🎉 Database cleared successfully!');

        // Verify deletion
        const remainingCount = await Transfer.countDocuments();
        console.log(`📊 Remaining transfers: ${remainingCount}`);

        if (remainingCount === 0) {
            console.log('✅ Confirmed: All transfers have been deleted');
        } else {
            console.log('⚠️  Warning: Some transfers may still remain');
        }

    } catch (error) {
        console.error('❌ Error clearing transfers:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    clearAllTransfers()
        .then(() => {
            console.log('\n✨ Clear transfers completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Clear transfers failed:', error);
            process.exit(1);
        });
}

module.exports = { clearAllTransfers };
