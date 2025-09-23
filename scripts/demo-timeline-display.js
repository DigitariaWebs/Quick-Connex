/**
 * Timeline Display Demo Script
 * 
 * This script demonstrates how the timeline data would be displayed
 * in the frontend TransferTimeline component, showing the visual
 * representation of timeline events.
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

    static createCompletionEvent(actor, duration) {
        return this.createEvent({
            type: 'completed',
            title: 'Transfer Completed',
            description: 'Transfer has been successfully completed',
            actor,
            metadata: {
                duration: duration,
                details: duration ? `Transfer completed in ${duration} minutes` : 'Transfer completed successfully'
            }
        });
    }

    static createCommunicationEvent(actor, communicationType, recipient, subject) {
        return this.createEvent({
            type: 'communication',
            title: 'Communication Sent',
            description: `${communicationType.toUpperCase()} sent to ${recipient}`,
            actor,
            metadata: {
                communicationType,
                recipient,
                subject,
                details: subject || `${communicationType.toUpperCase()} notification sent`
            },
            isSystemEvent: true
        });
    }
}

// Get icon for timeline event type (simulated)
function getEventIcon(type) {
    const icons = {
        'created': '📝',
        'approved': '✅',
        'rejected': '❌',
        'status_changed': '🔄',
        'assigned': '👤',
        'accepted': '✅',
        'completed': '🎉',
        'cancelled': '❌',
        'patient_updated': '🏥',
        'hospital_updated': '🏥',
        'priority_changed': '⚠️',
        'document_uploaded': '📄',
        'notes_updated': '📝',
        'communication': '📧',
        'system': '⚙️',
        'scheduled': '📅',
        'rescheduled': '📅'
    };
    return icons[type] || '📋';
}

// Get status color for timeline event (simulated)
function getEventStatusColor(type, isSystemEvent) {
    if (isSystemEvent) {
        return '🔘'; // Gray
    }

    const colors = {
        'created': '🔵', // Blue
        'approved': '🟢', // Green
        'accepted': '🟢', // Green
        'completed': '🟢', // Green
        'rejected': '🔴', // Red
        'cancelled': '🔴', // Red
        'status_changed': '🟣', // Purple
        'assigned': '🟦', // Indigo
        'priority_changed': '🟡', // Yellow
        'communication': '🔵', // Blue
        'system': '⚫', // Black
        'default': '⚪' // White
    };
    return colors[type] || colors['default'];
}

// Format timestamp
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function demoTimelineDisplay() {
    try {
        console.log('🎨 Timeline Display Demo\n');
        console.log('This demo shows how the timeline data would appear in the frontend component.\n');

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

        // Find hospitals
        const hospitals = await Hospital.find({ isActive: true }).limit(2);
        if (hospitals.length < 2) {
            console.error('❌ Need at least 2 hospitals in the database');
            return;
        }

        const fromHospital = hospitals[0];
        const toHospital = hospitals[1];

        // Create a comprehensive transfer with full timeline
        console.log('📝 Creating comprehensive transfer with full timeline...');

        const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create multiple timeline events
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
                    firstName: 'Marie',
                    lastName: 'Dubois',
                    age: 67,
                    dossierNumber: 'DOC-11111'
                },
                fromHospitalName: fromHospital.name,
                toHospitalName: toHospital.name,
                priority: 'high',
                reason: 'Post-surgical complications requiring specialized care'
            }
        );

        const transfer = new Transfer({
            transferId,
            patientInfo: {
                firstName: 'Marie',
                lastName: 'Dubois',
                age: 67,
                dossierNumber: 'DOC-11111'
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: manager._id,
            reason: 'Post-surgical complications requiring specialized care',
            priority: 'high',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
            notes: 'Patient requires continuous monitoring during transfer',
            medicalDocuments: ['surgical-report.pdf', 'vital-signs.pdf', 'medication-list.pdf'],
            scheduling: {
                transferTime: '18:30'
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

        // Add approval events
        const approvalEvent = TimelineService.createApprovalEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'admin'
            },
            'Approved for high-priority transfer'
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
            'Approved for high-priority transfer'
        );

        transfer.status = 'accepted';
        transfer.lastModifiedBy = manager._id;
        transfer.statusHistory.push({
            status: 'accepted',
            changedBy: manager._id,
            changedAt: new Date(),
            reason: 'Approved for high-priority transfer'
        });

        transfer.timeline.push(approvalEvent, statusChangeEvent);

        // Add assignment event
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
            'Assigned to experienced employee'
        );

        transfer.assignedTo = employee._id;
        transfer.timeline.push(assignmentEvent);

        // Add acceptance event
        const acceptanceEvent = TimelineService.createAcceptanceEvent(
            {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                userType: employee.userType
            }
        );

        transfer.timeline.push(acceptanceEvent);

        // Add communication events
        const emailEvent = TimelineService.createCommunicationEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'manager'
            },
            'email',
            'family@example.com',
            'Transfer Notification - Marie Dubois'
        );

        const smsEvent = TimelineService.createCommunicationEvent(
            {
                id: manager._id,
                name: `${manager.firstName} ${manager.lastName}`,
                email: manager.email,
                userType: 'manager'
            },
            'sms',
            '+1-555-0123',
            'Transfer Update'
        );

        transfer.timeline.push(emailEvent, smsEvent);

        // Add completion event
        const completionEvent = TimelineService.createCompletionEvent(
            {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                userType: employee.userType
            },
            45 // 45 minutes duration
        );

        transfer.status = 'completed';
        transfer.completedDate = new Date();
        transfer.actualDuration = 45;
        transfer.timeline.push(completionEvent);

        await transfer.save();

        // Populate the transfer
        const populatedTransfer = await Transfer.findOne({ transferId })
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('assignedTo', 'firstName lastName email userType')
            .populate('timeline.actor.id', 'firstName lastName email userType')
            .populate('fromHospital', 'name address organization')
            .populate('toHospital', 'name address organization');

        console.log('✅ Transfer created with comprehensive timeline\n');

        // Display the timeline as it would appear in the frontend
        console.log('🎨 FRONTEND TIMELINE DISPLAY SIMULATION');
        console.log('='.repeat(80));
        console.log(`\n📋 Transfer Timeline: ${populatedTransfer.patientInfo.firstName} ${populatedTransfer.patientInfo.lastName} • ${populatedTransfer.transferId}`);
        console.log(`🏥 ${populatedTransfer.fromHospitalName} → ${populatedTransfer.toHospitalName}`);
        console.log(`📊 Status: ${populatedTransfer.status.toUpperCase()} | Priority: ${populatedTransfer.priority.toUpperCase()}`);
        console.log(`⏰ Started: ${formatTimestamp(populatedTransfer.requestedDate)}`);
        console.log('');

        // Sort timeline events chronologically
        const sortedTimeline = populatedTransfer.timeline.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Display each timeline event as it would appear in the UI
        sortedTimeline.forEach((event, index) => {
            const icon = getEventIcon(event.type);
            const color = getEventStatusColor(event.type, event.isSystemEvent);
            const timestamp = formatTimestamp(event.timestamp);

            console.log(`${color} ${icon} ${event.title}`);
            console.log(`   📝 ${event.description}`);
            console.log(`   👤 ${event.actor.name} (${event.actor.userType})`);
            console.log(`   ⏰ ${timestamp}`);

            if (event.metadata && Object.keys(event.metadata).length > 0) {
                console.log(`   📋 Details:`);
                Object.entries(event.metadata).forEach(([key, value]) => {
                    if (key === 'assignedTo' && typeof value === 'object') {
                        console.log(`      ${key}: ${value.name} (${value.email})`);
                    } else if (typeof value === 'object') {
                        console.log(`      ${key}: ${JSON.stringify(value)}`);
                    } else {
                        console.log(`      ${key}: ${value}`);
                    }
                });
            }

            if (event.isSystemEvent) {
                console.log(`   ⚙️  System Event`);
            }

            console.log('');
        });

        console.log('='.repeat(80));
        console.log(`\n📊 Timeline Summary:`);
        console.log(`   Total Events: ${sortedTimeline.length}`);
        console.log(`   Duration: ${populatedTransfer.actualDuration || 'N/A'} minutes`);
        console.log(`   Final Status: ${populatedTransfer.status}`);
        console.log(`   Completed: ${populatedTransfer.completedDate ? formatTimestamp(populatedTransfer.completedDate) : 'N/A'}`);

        console.log('\n🎨 Visual Timeline Representation:');
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│                    TRANSFER TIMELINE                        │');
        console.log('├─────────────────────────────────────────────────────────────┤');

        sortedTimeline.forEach((event, index) => {
            const icon = getEventIcon(event.type);
            const color = getEventStatusColor(event.type, event.isSystemEvent);
            const timestamp = formatTimestamp(event.timestamp);
            const isLast = index === sortedTimeline.length - 1;

            console.log(`│ ${color} ${icon} ${event.title.padEnd(35)} ${timestamp} │`);
            console.log(`│    ${event.description.padEnd(50)} │`);
            console.log(`│    👤 ${event.actor.name} (${event.actor.userType})`.padEnd(55) + ' │');

            if (!isLast) {
                console.log('│    │'.padEnd(63) + ' │');
            }
        });

        console.log('└─────────────────────────────────────────────────────────────┘');

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await Transfer.deleteOne({ transferId });
        console.log('✅ Test transfer removed\n');

        console.log('🎉 Timeline display demo completed successfully!');
        console.log('\nKey visual features demonstrated:');
        console.log('✅ Color-coded event types');
        console.log('✅ Appropriate icons for each event');
        console.log('✅ Actor information display');
        console.log('✅ Timestamp formatting');
        console.log('✅ Rich metadata display');
        console.log('✅ System event identification');
        console.log('✅ Chronological ordering');
        console.log('✅ Visual timeline representation');

    } catch (error) {
        console.error('❌ Error during timeline display demo:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the demo
if (require.main === module) {
    demoTimelineDisplay()
        .then(() => {
            console.log('\n✨ Display Demo completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Display Demo failed:', error);
            process.exit(1);
        });
}

module.exports = { demoTimelineDisplay };
