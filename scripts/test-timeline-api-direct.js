/**
 * Direct Timeline API Test Script
 * 
 * This script tests the timeline API endpoint directly to debug the issue.
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

async function testTimelineAPIDirect() {
    try {
        console.log('🔍 Testing Timeline API Directly...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find an existing transfer
        const transfer = await Transfer.findOne({ status: 'accepted' });
        if (!transfer) {
            console.error('❌ No accepted transfers found');
            return;
        }

        console.log(`📋 Testing with transfer: ${transfer.transferId}`);
        console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`   Status: ${transfer.status}`);
        console.log(`   Has timeline: ${transfer.timeline ? transfer.timeline.length : 0} events\n`);

        // Check if transfer has timeline field
        if (!transfer.timeline) {
            console.log('⚠️  Transfer does not have timeline field - this is the issue!');
            console.log('   The existing transfers were created before timeline feature was implemented.\n');

            // Let's add a timeline to this transfer for testing
            console.log('🔧 Adding timeline to existing transfer...');

            const manager = await User.findOne({ email: 'arselene.tests@gmail.com' });
            if (!manager) {
                console.error('❌ Manager user not found');
                return;
            }

            // Create a timeline event for the existing transfer
            const timelineEvent = {
                id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'created',
                title: 'Transfer Request Created',
                description: `Transfer request created for patient ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
                timestamp: transfer.requestedDate,
                actor: {
                    id: manager._id,
                    name: `${manager.firstName} ${manager.lastName}`,
                    email: manager.email,
                    userType: manager.userType
                },
                metadata: {
                    patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
                    fromHospital: transfer.fromHospitalName,
                    toHospital: transfer.toHospitalName,
                    priority: transfer.priority,
                    reason: transfer.reason,
                    details: `Transfer ID: ${transfer.transferId}`
                },
                isSystemEvent: false,
                isVisible: true
            };

            // Add timeline to transfer
            transfer.timeline = [timelineEvent];
            await transfer.save();

            console.log('✅ Added timeline to existing transfer\n');
        }

        // Now test the API endpoint logic
        console.log('🌐 Testing API endpoint logic...');

        const populatedTransfer = await Transfer.findOne({ transferId: transfer.transferId })
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('assignedTo', 'firstName lastName email userType')
            .populate('timeline.actor.id', 'firstName lastName email userType')
            .populate('fromHospital', 'name address organization')
            .populate('toHospital', 'name address organization');

        if (!populatedTransfer) {
            console.error('❌ Transfer not found after population');
            return;
        }

        // Process timeline events (same logic as API)
        const timelineEvents = populatedTransfer.timeline?.map(event => {
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

        console.log('✅ API logic test successful!');
        console.log(`   Timeline events: ${timelineEvents.length}`);

        if (timelineEvents.length > 0) {
            console.log('\n📋 Timeline Events:');
            timelineEvents.forEach((event, index) => {
                console.log(`   ${index + 1}. ${event.title}`);
                console.log(`      Type: ${event.type}`);
                console.log(`      Actor: ${event.actor.name} (${event.actor.userType})`);
                console.log(`      Timestamp: ${event.timestamp.toLocaleString()}`);
            });
        }

        // Test the actual API response format
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
                timeline: timelineEvents,
                totalEvents: timelineEvents.length,
                lastUpdated: populatedTransfer.updatedAt
            }
        };

        console.log('\n📊 API Response Format:');
        console.log(`   Success: ${apiResponse.success}`);
        console.log(`   Total Events: ${apiResponse.data.totalEvents}`);
        console.log(`   Last Updated: ${apiResponse.data.lastUpdated.toLocaleString()}`);

        console.log('\n🎉 Direct API test completed successfully!');
        console.log('\n💡 The issue is that existing transfers don\'t have timeline data.');
        console.log('   New transfers created after the timeline feature will work correctly.');

    } catch (error) {
        console.error('❌ Error during direct API test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testTimelineAPIDirect()
        .then(() => {
            console.log('\n✨ Direct API Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Direct API Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testTimelineAPIDirect };
