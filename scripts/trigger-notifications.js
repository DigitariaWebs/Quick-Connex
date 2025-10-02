#!/usr/bin/env node

/**
 * Notification Trigger Script
 * 
 * This script calls the real notification service to send actual emails and SMS
 * Usage: node scripts/trigger-notifications.js <transferId>
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Transfer schema
const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    transferCategory: {
        type: String,
        required: true,
        enum: ['patient', 'envelope', 'patient_file', 'medical_equipment'],
        default: 'patient'
    },
    patientInfo: {
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        age: { type: Number, min: 0, max: 120 },
        dossierNumber: { type: String, trim: true }
    },
    transferData: {
        patientInfo: {
            firstName: { type: String, trim: true },
            lastName: { type: String, trim: true },
            age: { type: Number, min: 0, max: 120 },
            dossierNumber: { type: String, trim: true }
        },
        envelopeInfo: {
            envelopeNumber: { type: String, trim: true },
            senderName: { type: String, trim: true },
            recipientName: { type: String, trim: true },
            contents: { type: String, trim: true },
            weight: { type: Number, min: 0 },
            dimensions: {
                length: { type: Number, min: 0 },
                width: { type: Number, min: 0 },
                height: { type: Number, min: 0 }
            }
        },
        fileInfo: {
            patientName: { type: String, trim: true },
            dossierNumber: { type: String, trim: true },
            fileType: { type: String, trim: true },
            fileCount: { type: Number, min: 1 },
            urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
        },
        equipmentInfo: {
            equipmentName: { type: String, trim: true },
            serialNumber: { type: String, trim: true },
            model: { type: String, trim: true },
            condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
            maintenanceRequired: { type: Boolean, default: false },
            specialInstructions: { type: String, trim: true }
        }
    },
    fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    toHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    fromHospitalName: { type: String, trim: true },
    toHospitalName: { type: String, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    requestedDate: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    notes: { type: String, trim: true },
    issuer: { type: String, trim: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [{
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true }
    }],
    timeline: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        timestamp: { type: Date, required: true },
        actor: {
            id: { type: mongoose.Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
            userType: { type: String, required: true }
        },
        metadata: { type: mongoose.Schema.Types.Mixed },
        isSystemEvent: { type: Boolean, default: false },
        isVisible: { type: Boolean, default: true }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Transfer = mongoose.model('Transfer', transferSchema);
const User = mongoose.model('User', userSchema);

async function triggerNotifications(transferId) {
    try {
        console.log(`🚀 Triggering notifications for transfer: ${transferId}`);

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to database');

        // Find the transfer
        const transfer = await Transfer.findOne({ transferId })
            .populate('requestedBy', 'firstName lastName email userType phone')
            .populate('fromHospital', 'name address organization')
            .populate('toHospital', 'name address organization');

        if (!transfer) {
            console.error(`❌ Transfer not found: ${transferId}`);
            return;
        }

        console.log(`📋 Found transfer: ${transfer.transferId}`);
        console.log(`📂 Category: ${transfer.transferCategory}`);
        console.log(`🏥 From: ${transfer.fromHospitalName}`);
        console.log(`🏥 To: ${transfer.toHospitalName}`);
        console.log(`👤 Requested by: ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`);

        // Make HTTP request to trigger real notifications
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/transfers/${transfer._id}/notify`;

        console.log(`📧 Calling notification API: ${apiUrl}`);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transferId: transfer._id,
                    requestedBy: transfer.requestedBy._id
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Notifications triggered successfully!');
                console.log(`📧 Email notifications sent: ${result.emailSent || 0}`);
                console.log(`📱 SMS notifications sent: ${result.smsSent || 0}`);
            } else {
                console.error('❌ Failed to trigger notifications:', response.status, response.statusText);
            }
        } catch (fetchError) {
            console.error('❌ Error calling notification API:', fetchError.message);
            console.log('💡 Make sure the Next.js server is running (npm run dev)');
        }

    } catch (error) {
        console.error('❌ Error triggering notifications:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

// Main execution
const transferId = process.argv[2];
if (!transferId) {
    console.log(`
📋 Notification Trigger Script

Usage:
  node scripts/trigger-notifications.js <transferId>

Examples:
  node scripts/trigger-notifications.js PAT-123456
  node scripts/trigger-notifications.js ENV-789012
  node scripts/trigger-notifications.js FIL-345678
  node scripts/trigger-notifications.js EQP-901234
  `);
    process.exit(1);
}

triggerNotifications(transferId);
