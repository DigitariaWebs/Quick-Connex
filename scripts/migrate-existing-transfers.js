/**
 * Migrate Existing Transfers Script
 * 
 * This script adds timeline data to existing transfers that were created
 * before the timeline feature was implemented.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true },
    documents: [{
        type: { type: String, required: true },
        filename: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
}, {
    timestamps: true,
    versionKey: false
});

// Hospital schema
const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    organization: {
        type: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    versionKey: false
});

// Enhanced Transfer schema with timeline
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
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Timeline Service
class TimelineService {
    static generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static createEvent(data) {
        return {
            id: this.generateEventId(),
            type: data.type,
            title: data.title,
            description: data.description,
            timestamp: data.timestamp || new Date(),
            actor: data.actor,
            metadata: data.metadata || {},
            isSystemEvent: data.isSystemEvent || false,
            isVisible: data.isVisible !== false,
        };
    }

    static createTransferCreatedEvent(actor, transferData, timestamp) {
        return this.createEvent({
            type: 'created',
            title: 'Transfer Request Created',
            description: `Transfer request created for patient ${transferData.patientInfo.firstName} ${transferData.patientInfo.lastName}`,
            timestamp: timestamp,
            actor,
            metadata: {
                patientName: `${transferData.patientInfo.firstName} ${transferData.patientInfo.lastName}`,
                fromHospital: transferData.fromHospitalName,
                toHospital: transferData.toHospitalName,
                priority: transferData.priority,
                reason: transferData.reason,
                details: `Transfer ID: ${transferData.transferId}`
            }
        });
    }

    static createApprovalEvent(actor, reason, timestamp) {
        return this.createEvent({
            type: 'approved',
            title: 'Transfer Approved',
            description: 'Transfer request has been approved and is now available for assignment',
            timestamp: timestamp,
            actor,
            metadata: {
                reason: reason || 'Approved by administrator',
                details: 'Transfer is now visible to employees and ready for assignment'
            }
        });
    }

    static createStatusChangeEvent(actor, oldStatus, newStatus, reason, timestamp) {
        const statusLabels = {
            'pending': 'Pending Approval',
            'accepted': 'Approved',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };

        return this.createEvent({
            type: 'status_changed',
            title: 'Status Updated',
            description: `Transfer status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus] || newStatus}`,
            timestamp: timestamp,
            actor,
            metadata: {
                oldValue: oldStatus,
                newValue: newStatus,
                reason: reason || 'Status updated',
                details: `Previous status: ${statusLabels[oldStatus] || oldStatus}`
            }
        });
    }
}

async function migrateExistingTransfers() {
    try {
        console.log('🔄 Migrating Existing Transfers to Timeline System...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all transfers without timeline data
        const transfersWithoutTimeline = await Transfer.find({
            $or: [
                { timeline: { $exists: false } },
                { timeline: { $size: 0 } }
            ]
        }).populate('requestedBy', 'firstName lastName email userType');

        console.log(`📋 Found ${transfersWithoutTimeline.length} transfers without timeline data\n`);

        if (transfersWithoutTimeline.length === 0) {
            console.log('✅ All transfers already have timeline data!');
            return;
        }

        let migratedCount = 0;
        let errorCount = 0;

        for (const transfer of transfersWithoutTimeline) {
            try {
                console.log(`🔄 Migrating transfer: ${transfer.transferId}`);

                const timeline = [];

                // Create creation event
                const creationEvent = TimelineService.createTransferCreatedEvent(
                    {
                        id: transfer.requestedBy._id,
                        name: `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`,
                        email: transfer.requestedBy.email,
                        userType: transfer.requestedBy.userType
                    },
                    {
                        transferId: transfer.transferId,
                        patientInfo: transfer.patientInfo,
                        fromHospitalName: transfer.fromHospitalName,
                        toHospitalName: transfer.toHospitalName,
                        priority: transfer.priority,
                        reason: transfer.reason
                    },
                    transfer.requestedDate
                );

                timeline.push(creationEvent);

                // Add status history events
                if (transfer.statusHistory && transfer.statusHistory.length > 0) {
                    for (let i = 0; i < transfer.statusHistory.length; i++) {
                        const statusEntry = transfer.statusHistory[i];

                        // Skip the first entry if it's the same as creation
                        if (i === 0 && statusEntry.status === 'pending') {
                            continue;
                        }

                        // Find the user who made the change
                        const changedByUser = await User.findById(statusEntry.changedBy);
                        if (changedByUser) {
                            const statusChangeEvent = TimelineService.createStatusChangeEvent(
                                {
                                    id: changedByUser._id,
                                    name: `${changedByUser.firstName} ${changedByUser.lastName}`,
                                    email: changedByUser.email,
                                    userType: changedByUser.userType
                                },
                                i > 0 ? transfer.statusHistory[i - 1].status : 'pending',
                                statusEntry.status,
                                statusEntry.reason,
                                statusEntry.changedAt
                            );

                            timeline.push(statusChangeEvent);

                            // Add approval event if status changed to accepted
                            if (statusEntry.status === 'accepted') {
                                const approvalEvent = TimelineService.createApprovalEvent(
                                    {
                                        id: changedByUser._id,
                                        name: `${changedByUser.firstName} ${changedByUser.lastName}`,
                                        email: changedByUser.email,
                                        userType: 'admin' // Assume admin for existing approvals
                                    },
                                    statusEntry.reason,
                                    statusEntry.changedAt
                                );

                                timeline.push(approvalEvent);
                            }
                        }
                    }
                }

                // Update the transfer with timeline
                transfer.timeline = timeline;
                await transfer.save();

                console.log(`   ✅ Added ${timeline.length} timeline events`);
                migratedCount++;

            } catch (error) {
                console.error(`   ❌ Error migrating transfer ${transfer.transferId}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successfully migrated: ${migratedCount} transfers`);
        console.log(`   ❌ Errors: ${errorCount} transfers`);
        console.log(`   📋 Total processed: ${transfersWithoutTimeline.length} transfers`);

        if (migratedCount > 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log('   All existing transfers now have timeline data.');
            console.log('   The timeline feature should now work for all transfers.');
        }

    } catch (error) {
        console.error('❌ Error during migration:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
if (require.main === module) {
    migrateExistingTransfers()
        .then(() => {
            console.log('\n✨ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateExistingTransfers };
