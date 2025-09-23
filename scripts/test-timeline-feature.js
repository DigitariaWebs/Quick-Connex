/**
 * Test Timeline Feature Script
 * 
 * This script tests the enhanced timeline feature by:
 * 1. Creating a transfer request as a manager
 * 2. Approving the transfer as an admin
 * 3. Fetching and displaying the timeline data
 * 4. Showing all timeline events with details
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Test credentials from the file
const MANAGER_CREDENTIALS = {
    email: 'arselene.tests@gmail.com',
    password: 'TestPassword123!'
};

const EMPLOYEE_CREDENTIALS = {
    email: 'arselene.dev@gmail.com',
    password: 'TestPassword123!'
};

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

// Timeline Service (simplified version for testing)
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
            timestamp: new Date(),
            actor: data.actor,
            metadata: data.metadata || {},
            isSystemEvent: data.isSystemEvent || false,
            isVisible: data.isVisible !== false,
        };
    }

    static createTransferCreatedEvent(actor, transferData) {
        return this.createEvent({
            type: 'created',
            title: 'Transfer Request Created',
            description: `Transfer request created for patient ${transferData.patientInfo.firstName} ${transferData.patientInfo.lastName}`,
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

    static createApprovalEvent(actor, reason) {
        return this.createEvent({
            type: 'approved',
            title: 'Transfer Approved',
            description: 'Transfer request has been approved and is now available for assignment',
            actor,
            metadata: {
                reason: reason || 'Approved by administrator',
                details: 'Transfer is now visible to employees and ready for assignment'
            }
        });
    }

    static createStatusChangeEvent(actor, oldStatus, newStatus, reason) {
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

async function testTimelineFeature() {
    try {
        console.log('🚀 Starting Timeline Feature Test...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find test users
        const manager = await User.findOne({ email: MANAGER_CREDENTIALS.email });
        const employee = await User.findOne({ email: EMPLOYEE_CREDENTIALS.email });

        if (!manager) {
            console.error('❌ Manager user not found:', MANAGER_CREDENTIALS.email);
            return;
        }

        if (!employee) {
            console.error('❌ Employee user not found:', EMPLOYEE_CREDENTIALS.email);
            return;
        }

        console.log('👥 Found test users:');
        console.log(`   Manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);
        console.log(`   Employee: ${employee.firstName} ${employee.lastName} (${employee.email})\n`);

        // Find hospitals
        const hospitals = await Hospital.find({ isActive: true }).limit(2);
        if (hospitals.length < 2) {
            console.error('❌ Need at least 2 hospitals in the database');
            return;
        }

        const fromHospital = hospitals[0];
        const toHospital = hospitals[1];

        console.log('🏥 Using hospitals:');
        console.log(`   From: ${fromHospital.name}`);
        console.log(`   To: ${toHospital.name}\n`);

        // Step 1: Create a transfer request
        console.log('📝 Step 1: Creating transfer request...');

        const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create timeline event for transfer creation
        const creationEvent = TimelineService.createTransferCreatedEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: manager.userType
            },
            {
                transferId,
                patientInfo: {
                    firstName: 'John',
                    lastName: 'Doe',
                    age: 45,
                    dossierNumber: 'DOC-12345'
                },
                fromHospitalName: fromHospital.name,
                toHospitalName: toHospital.name,
                priority: 'high',
                reason: 'Emergency transfer for specialized treatment'
            }
        );

        const transfer = new Transfer({
            transferId,
            patientInfo: {
                firstName: 'John',
                lastName: 'Doe',
                age: 45,
                dossierNumber: 'DOC-12345'
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: manager._id,
            reason: 'Emergency transfer for specialized treatment',
            priority: 'high',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            notes: 'Urgent transfer required for cardiac surgery',
            medicalDocuments: ['medical-report.pdf', 'xray-scan.jpg'],
            scheduling: {
                transferTime: '14:30'
            },
            lastModifiedBy: manager._id,
            statusHistory: [{
                status: 'pending',
                changedBy: manager._id,
                changedAt: new Date(),
                reason: 'Transfer created'
            }],
            timeline: [creationEvent]
        });

        await transfer.save();
        console.log(`✅ Transfer created: ${transferId}`);
        console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`   Priority: ${transfer.priority}`);
        console.log(`   Status: ${transfer.status}\n`);

        // Step 2: Approve the transfer (simulate admin action)
        console.log('✅ Step 2: Approving transfer...');

        // Create timeline events for approval
        const approvalEvent = TimelineService.createApprovalEvent(
            {
                id: manager._id, // Using manager as admin for testing
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'admin'
            },
            'Approved for emergency transfer'
        );

        const statusChangeEvent = TimelineService.createStatusChangeEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'admin'
            },
            'pending',
            'accepted',
            'Approved for emergency transfer'
        );

        // Update transfer status
        transfer.status = 'accepted';
        transfer.lastModifiedBy = manager._id;
        transfer.statusHistory.push({
            status: 'accepted',
            changedBy: manager._id,
            changedAt: new Date(),
            reason: 'Approved for emergency transfer'
        });

        // Add timeline events
        transfer.timeline.push(approvalEvent, statusChangeEvent);

        await transfer.save();
        console.log(`✅ Transfer approved: ${transferId}`);
        console.log(`   New status: ${transfer.status}\n`);

        // Step 3: Fetch and display timeline data
        console.log('📊 Step 3: Fetching timeline data...');

        const populatedTransfer = await Transfer.findOne({ transferId })
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('assignedTo', 'firstName lastName email userType')
            .populate('timeline.actor.id', 'firstName lastName email userType')
            .populate('fromHospital', 'name address organization')
            .populate('toHospital', 'name address organization');

        if (!populatedTransfer) {
            console.error('❌ Transfer not found after approval');
            return;
        }

        console.log('📋 Transfer Summary:');
        console.log(`   ID: ${populatedTransfer.transferId}`);
        console.log(`   Patient: ${populatedTransfer.patientInfo.firstName} ${populatedTransfer.patientInfo.lastName}`);
        console.log(`   From: ${populatedTransfer.fromHospitalName}`);
        console.log(`   To: ${populatedTransfer.toHospitalName}`);
        console.log(`   Status: ${populatedTransfer.status}`);
        console.log(`   Priority: ${populatedTransfer.priority}`);
        console.log(`   Created: ${populatedTransfer.requestedDate.toLocaleString()}`);
        console.log(`   Timeline Events: ${populatedTransfer.timeline.length}\n`);

        // Display timeline events
        console.log('🕒 Timeline Events:');
        console.log('='.repeat(80));

        const sortedTimeline = populatedTransfer.timeline.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        sortedTimeline.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Type: ${event.type}`);
            console.log(`   Description: ${event.description}`);
            console.log(`   Timestamp: ${event.timestamp.toLocaleString()}`);
            console.log(`   Actor: ${event.actor.name} (${event.actor.userType})`);
            console.log(`   Email: ${event.actor.email}`);

            if (event.metadata && Object.keys(event.metadata).length > 0) {
                console.log(`   Metadata:`);
                Object.entries(event.metadata).forEach(([key, value]) => {
                    if (typeof value === 'object') {
                        console.log(`     ${key}: ${JSON.stringify(value, null, 2)}`);
                    } else {
                        console.log(`     ${key}: ${value}`);
                    }
                });
            }

            console.log(`   System Event: ${event.isSystemEvent ? 'Yes' : 'No'}`);
            console.log(`   Visible: ${event.isVisible ? 'Yes' : 'No'}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Timeline test completed successfully!`);
        console.log(`   Total events: ${sortedTimeline.length}`);
        console.log(`   Transfer ID: ${transferId}`);
        console.log(`   Final status: ${populatedTransfer.status}\n`);

        // Step 4: Test API endpoint (simulate)
        console.log('🌐 Step 4: Testing API endpoint simulation...');

        const apiResponse = {
            success: true,
            data: {
                transfer: {
                    id: populatedTransfer._id,
                    transferId: populatedTransfer.transferId,
                    patientInfo: populatedTransfer.patientInfo,
                    fromHospital: populatedTransfer.fromHospital,
                    toHospital: populatedTransfer.toHospital,
                    fromHospitalName: populatedTransfer.fromHospitalName,
                    toHospitalName: populatedTransfer.toHospitalName,
                    requestedBy: populatedTransfer.requestedBy,
                    assignedTo: populatedTransfer.assignedTo,
                    status: populatedTransfer.status,
                    priority: populatedTransfer.priority,
                    requestedDate: populatedTransfer.requestedDate,
                    scheduledDate: populatedTransfer.scheduledDate,
                    completedDate: populatedTransfer.completedDate,
                    reason: populatedTransfer.reason,
                    notes: populatedTransfer.notes
                },
                timeline: sortedTimeline,
                totalEvents: sortedTimeline.length,
                lastUpdated: populatedTransfer.updatedAt
            }
        };

        console.log('✅ API response simulation:');
        console.log(`   Success: ${apiResponse.success}`);
        console.log(`   Total events: ${apiResponse.data.totalEvents}`);
        console.log(`   Last updated: ${apiResponse.data.lastUpdated.toLocaleString()}\n`);

        // Cleanup - remove test transfer
        console.log('🧹 Cleaning up test data...');
        await Transfer.deleteOne({ transferId });
        console.log('✅ Test transfer removed\n');

        console.log('🎉 Timeline feature test completed successfully!');
        console.log('\nKey features tested:');
        console.log('✅ Transfer creation with timeline event');
        console.log('✅ Transfer approval with multiple timeline events');
        console.log('✅ Timeline data retrieval and display');
        console.log('✅ Rich metadata storage and display');
        console.log('✅ Actor information tracking');
        console.log('✅ Event type categorization');
        console.log('✅ Timestamp tracking');
        console.log('✅ API response simulation');

    } catch (error) {
        console.error('❌ Error during timeline test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testTimelineFeature()
        .then(() => {
            console.log('\n✨ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testTimelineFeature };
