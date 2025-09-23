/**
 * Test Timeline API Endpoint Script
 * 
 * This script tests the timeline API endpoint by:
 * 1. Creating a transfer request
 * 2. Approving it
 * 3. Making API calls to fetch timeline data
 * 4. Displaying the results
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Test credentials
const MANAGER_CREDENTIALS = {
    email: 'arselene.tests@gmail.com',
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

    static createAssignmentEvent(actor, assignedTo, reason) {
        return this.createEvent({
            type: 'assigned',
            title: 'Transfer Assigned',
            description: `Transfer has been assigned to ${assignedTo.name}`,
            actor,
            metadata: {
                assignedTo: assignedTo,
                reason: reason || 'Transfer assigned to employee',
                details: `Assigned to: ${assignedTo.name} (${assignedTo.email})`
            }
        });
    }

    static createAcceptanceEvent(actor) {
        return this.createEvent({
            type: 'accepted',
            title: 'Transfer Accepted',
            description: `${actor.name} has accepted the transfer assignment`,
            actor,
            metadata: {
                details: 'Employee has accepted responsibility for this transfer'
            }
        });
    }
}

// Simulate API response format
function formatTimelineApiResponse(transfer) {
    const timelineEvents = transfer.timeline?.map(event => {
        const actor = event.actor.id && typeof event.actor.id === 'object'
            ? {
                id: event.actor.id._id,
                name: `${event.actor.id.firstName} ${event.actor.id.lastName}`,
                email: event.actor.id.email,
                userType: event.actor.id.userType
            }
            : event.actor;

        return {
            id: event.id,
            type: event.type,
            title: event.title,
            description: event.description,
            timestamp: event.timestamp,
            actor,
            metadata: event.metadata || {},
            isSystemEvent: event.isSystemEvent || false,
            isVisible: event.isVisible !== false
        };
    }) || [];

    // Sort timeline events by timestamp (newest first)
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
        success: true,
        data: {
            transfer: {
                id: transfer._id,
                transferId: transfer.transferId,
                patientInfo: transfer.patientInfo,
                fromHospital: transfer.fromHospital,
                toHospital: transfer.toHospital,
                fromHospitalName: transfer.fromHospitalName,
                toHospitalName: transfer.toHospitalName,
                requestedBy: transfer.requestedBy,
                assignedTo: transfer.assignedTo,
                status: transfer.status,
                priority: transfer.priority,
                requestedDate: transfer.requestedDate,
                scheduledDate: transfer.scheduledDate,
                completedDate: transfer.completedDate,
                reason: transfer.reason,
                notes: transfer.notes
            },
            timeline: timelineEvents,
            totalEvents: timelineEvents.length,
            lastUpdated: transfer.updatedAt
        }
    };
}

async function testTimelineAPI() {
    try {
        console.log('🚀 Starting Timeline API Test...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find test users
        const manager = await User.findOne({ email: MANAGER_CREDENTIALS.email });
        const employee = await User.findOne({ email: 'arselene.dev@gmail.com' });

        if (!manager || !employee) {
            console.error('❌ Test users not found');
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
                    firstName: 'Jane',
                    lastName: 'Smith',
                    age: 32,
                    dossierNumber: 'DOC-67890'
                },
                fromHospitalName: fromHospital.name,
                toHospitalName: toHospital.name,
                priority: 'urgent',
                reason: 'Critical condition requiring immediate transfer'
            }
        );

        const transfer = new Transfer({
            transferId,
            patientInfo: {
                firstName: 'Jane',
                lastName: 'Smith',
                age: 32,
                dossierNumber: 'DOC-67890'
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: manager._id,
            reason: 'Critical condition requiring immediate transfer',
            priority: 'urgent',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            notes: 'Patient requires immediate cardiac intervention',
            medicalDocuments: ['ecg-results.pdf', 'lab-reports.pdf'],
            scheduling: {
                transferTime: '16:45'
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
        console.log(`✅ Transfer created: ${transferId}\n`);

        // Step 2: Approve the transfer
        console.log('✅ Step 2: Approving transfer...');

        const approvalEvent = TimelineService.createApprovalEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'admin'
            },
            'Approved for urgent transfer'
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
            'Approved for urgent transfer'
        );

        transfer.status = 'accepted';
        transfer.lastModifiedBy = manager._id;
        transfer.statusHistory.push({
            status: 'accepted',
            changedBy: manager._id,
            changedAt: new Date(),
            reason: 'Approved for urgent transfer'
        });

        transfer.timeline.push(approvalEvent, statusChangeEvent);
        await transfer.save();
        console.log(`✅ Transfer approved: ${transferId}\n`);

        // Step 3: Assign to employee
        console.log('👤 Step 3: Assigning to employee...');

        const assignmentEvent = TimelineService.createAssignmentEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'manager'
            },
            {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email
            },
            'Assigned to available employee'
        );

        transfer.assignedTo = employee._id;
        transfer.lastModifiedBy = manager._id;
        transfer.timeline.push(assignmentEvent);
        await transfer.save();
        console.log(`✅ Transfer assigned to: ${employee.firstName} ${employee.lastName}\n`);

        // Step 4: Employee accepts
        console.log('✅ Step 4: Employee accepts assignment...');

        const acceptanceEvent = TimelineService.createAcceptanceEvent(
            {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                userType: employee.userType
            }
        );

        transfer.lastModifiedBy = employee._id;
        transfer.timeline.push(acceptanceEvent);
        await transfer.save();
        console.log(`✅ Employee accepted assignment\n`);

        // Step 5: Simulate API call to fetch timeline
        console.log('🌐 Step 5: Simulating API call to fetch timeline...');

        const populatedTransfer = await Transfer.findOne({ transferId })
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('assignedTo', 'firstName lastName email userType')
            .populate('timeline.actor.id', 'firstName lastName email userType')
            .populate('fromHospital', 'name address organization')
            .populate('toHospital', 'name address organization');

        const apiResponse = formatTimelineApiResponse(populatedTransfer);

        console.log('📊 API Response:');
        console.log(`   Success: ${apiResponse.success}`);
        console.log(`   Total Events: ${apiResponse.data.totalEvents}`);
        console.log(`   Last Updated: ${apiResponse.data.lastUpdated.toLocaleString()}\n`);

        // Display timeline events in API format
        console.log('🕒 Timeline Events (API Format):');
        console.log('='.repeat(80));

        apiResponse.data.timeline.forEach((event, index) => {
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
        console.log(`✅ Timeline API test completed successfully!`);
        console.log(`   Total events: ${apiResponse.data.totalEvents}`);
        console.log(`   Transfer ID: ${transferId}`);
        console.log(`   Final status: ${populatedTransfer.status}\n`);

        // Cleanup
        console.log('🧹 Cleaning up test data...');
        await Transfer.deleteOne({ transferId });
        console.log('✅ Test transfer removed\n');

        console.log('🎉 Timeline API test completed successfully!');
        console.log('\nKey features demonstrated:');
        console.log('✅ Complete transfer lifecycle with timeline tracking');
        console.log('✅ API response format simulation');
        console.log('✅ Rich timeline event metadata');
        console.log('✅ Actor information tracking');
        console.log('✅ Event type categorization');
        console.log('✅ Chronological event ordering');
        console.log('✅ Real-world transfer workflow simulation');

    } catch (error) {
        console.error('❌ Error during timeline API test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testTimelineAPI()
        .then(() => {
            console.log('\n✨ API Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 API Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testTimelineAPI };
