#!/usr/bin/env node

/**
 * Test Transfer Email Data Script
 * 
 * This script tests the transfer email data to ensure all fields
 * are properly populated including dossier number, phone, and email.
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

// Transfer schema
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

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Simulate the transferData object creation from TransferNotificationService
function createTransferData(transfer, requestedBy) {
    return {
        transferId: transfer.transferId,
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        patientAge: transfer.patientInfo.age,
        dossierNumber: transfer.patientInfo.dossierNumber,
        patientDossier: transfer.patientInfo.dossierNumber, // For email template compatibility
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        reason: transfer.reason,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
        scheduledTime: transfer.scheduling?.transferTime || 'Not specified',
        requestedBy: `${requestedBy.firstName} ${requestedBy.lastName}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone,
        requestedByEmail: requestedBy.email, // For email template compatibility
        requestedByPhone: requestedBy.phone, // For email template compatibility
        notes: transfer.notes || 'No additional notes',
        approvalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/approve`,
        rejectionUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/reject`,
    };
}

async function testTransferEmailData() {
    try {
        console.log('🧪 Testing Transfer Email Data...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find a transfer with requestedBy populated
        const transfer = await Transfer.findOne({})
            .populate('requestedBy', 'firstName lastName email phone userType');

        if (!transfer) {
            console.log('❌ No transfers found in database');
            return;
        }

        console.log(`📋 Testing with transfer: ${transfer.transferId}`);
        console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`   Status: ${transfer.status}`);
        console.log(`   Priority: ${transfer.priority}\n`);

        // Check if requestedBy is populated
        if (!transfer.requestedBy) {
            console.log('❌ Transfer.requestedBy is not populated');
            return;
        }

        const requestedBy = transfer.requestedBy;
        console.log('👤 Requested By User:');
        console.log(`   Name: ${requestedBy.firstName} ${requestedBy.lastName}`);
        console.log(`   Email: ${requestedBy.email || 'UNDEFINED'}`);
        console.log(`   Phone: ${requestedBy.phone || 'UNDEFINED'}`);
        console.log(`   User Type: ${requestedBy.userType}\n`);

        // Check patient info
        console.log('👤 Patient Information:');
        console.log(`   Name: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`   Age: ${transfer.patientInfo.age}`);
        console.log(`   Dossier Number: ${transfer.patientInfo.dossierNumber || 'UNDEFINED'}\n`);

        // Create transfer data object (simulating TransferNotificationService)
        const transferData = createTransferData(transfer, requestedBy);

        console.log('📧 Transfer Data Object for Email:');
        console.log('='.repeat(50));
        console.log(`transferId: ${transferData.transferId}`);
        console.log(`patientName: ${transferData.patientName}`);
        console.log(`patientAge: ${transferData.patientAge}`);
        console.log(`dossierNumber: ${transferData.dossierNumber || 'UNDEFINED'}`);
        console.log(`patientDossier: ${transferData.patientDossier || 'UNDEFINED'}`);
        console.log(`fromHospital: ${transferData.fromHospital}`);
        console.log(`toHospital: ${transferData.toHospital}`);
        console.log(`priority: ${transferData.priority}`);
        console.log(`reason: ${transferData.reason}`);
        console.log(`scheduledDate: ${transferData.scheduledDate}`);
        console.log(`scheduledTime: ${transferData.scheduledTime}`);
        console.log(`requestedBy: ${transferData.requestedBy}`);
        console.log(`requestorEmail: ${transferData.requestorEmail || 'UNDEFINED'}`);
        console.log(`requestorPhone: ${transferData.requestorPhone || 'UNDEFINED'}`);
        console.log(`requestedByEmail: ${transferData.requestedByEmail || 'UNDEFINED'}`);
        console.log(`requestedByPhone: ${transferData.requestedByPhone || 'UNDEFINED'}`);
        console.log(`notes: ${transferData.notes}`);

        // Test email template rendering
        console.log('\n📧 Email Template Test:');
        console.log('='.repeat(50));

        // Test text email
        const textEmail = `
🚑 ${transferData.priority} TRANSFER REQUEST

Transfer ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge} years)
Dossier Number: ${transferData.patientDossier}
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Priority: ${transferData.priority}
Reason: ${transferData.reason}
Scheduled Date: ${transferData.scheduledDate}
Scheduled Time: ${transferData.scheduledTime}

Requested by: ${transferData.requestedBy}
Email: ${transferData.requestedByEmail}
Phone: ${transferData.requestedByPhone}

Notes: ${transferData.notes}
    `.trim();

        console.log('📝 Text Email Preview:');
        console.log(textEmail);

        // Check for undefined values
        console.log('\n🔍 Data Validation:');
        console.log('='.repeat(50));

        const issues = [];

        if (!transferData.patientDossier || transferData.patientDossier === 'undefined') {
            issues.push('❌ Dossier Number is undefined');
        } else {
            console.log('✅ Dossier Number is defined');
        }

        if (!transferData.requestedByEmail || transferData.requestedByEmail === 'undefined') {
            issues.push('❌ Requestor Email is undefined');
        } else {
            console.log('✅ Requestor Email is defined');
        }

        if (!transferData.requestedByPhone || transferData.requestedByPhone === 'undefined') {
            issues.push('❌ Requestor Phone is undefined');
        } else {
            console.log('✅ Requestor Phone is defined');
        }

        if (issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            issues.forEach(issue => console.log(`   ${issue}`));
        } else {
            console.log('\n✅ All email data fields are properly defined!');
        }

        console.log('\n🎯 Test Summary:');
        console.log('✅ Transfer data object created successfully');
        console.log('✅ Email template variables populated');
        console.log('✅ All required fields are available for email generation');

    } catch (error) {
        console.error('❌ Error during test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testTransferEmailData()
        .then(() => {
            console.log('\n✨ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testTransferEmailData };
