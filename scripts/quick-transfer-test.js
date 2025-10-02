#!/usr/bin/env node

/**
 * Quick Transfer Test Script
 * 
 * A simplified script for quickly creating test transfers
 * Usage: node scripts/quick-transfer-test.js [type]
 * 
 * Types: patient, envelope, file, equipment, all
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Transfer categories
const TransferCategory = {
    PATIENT: 'patient',
    ENVELOPE: 'envelope',
    PATIENT_FILE: 'patient_file',
    MEDICAL_EQUIPMENT: 'medical_equipment'
};

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

// Hospital schema
const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    organization: {
        type: { type: String, required: true },
        name: { type: String, required: true },
        region: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

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

const User = mongoose.model('User', userSchema);
const Hospital = mongoose.model('Hospital', hospitalSchema);
const Transfer = mongoose.model('Transfer', transferSchema);

// Notification service (simplified version for scripts)
class SimpleNotificationService {
    async sendNewTransferRequestNotification(transfer, requestedBy) {
        try {
            console.log('📧 Sending transfer request notifications...');

            // Get admin users (managers act as admins in this system)
            const admins = await User.find({ userType: 'manager', status: 'approved' });

            if (admins.length === 0) {
                console.warn('⚠️ No admin users found for notifications');
                return;
            }

            console.log(`📬 Notifications will be sent to ${admins.length} admin(s)`);

            // Log notification details
            console.log('📧 Email notification would be sent to:');
            admins.forEach(admin => {
                console.log(`   • ${admin.firstName} ${admin.lastName} (${admin.email})`);
            });

            console.log('📱 SMS notification would be sent to admins with phone numbers');

            // Log transfer details that would be in the notification
            console.log('📋 Notification content:');
            console.log(`   • Transfer ID: ${transfer.transferId}`);
            console.log(`   • Category: ${transfer.transferCategory}`);
            console.log(`   • From: ${transfer.fromHospitalName}`);
            console.log(`   • To: ${transfer.toHospitalName}`);
            console.log(`   • Priority: ${transfer.priority}`);
            console.log(`   • Requested by: ${requestedBy.firstName} ${requestedBy.lastName}`);

            console.log('✅ Notification service called successfully');

        } catch (error) {
            console.error('❌ Error sending notifications:', error.message);
        }
    }
}

const notificationService = new SimpleNotificationService();

// Function to trigger real notifications via API
async function triggerRealNotifications(transfer, requestingUser) {
    try {
        console.log('📧 Triggering real notifications...');

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/transfers/${transfer._id}/notify`;

        console.log(`📧 Calling notification API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transferId: transfer._id,
                requestedBy: requestingUser._id
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Real notifications sent successfully!');
            console.log(`📧 Email notifications: ${result.emailSent ? 'Sent' : 'Failed'}`);
            console.log(`📱 SMS notifications: ${result.smsSent ? 'Sent' : 'Failed'}`);
        } else {
            console.warn('⚠️ Failed to trigger real notifications:', response.status, response.statusText);
            console.log('💡 Falling back to simulation mode...');
            // Fallback to simulation
            await notificationService.sendNewTransferRequestNotification(transfer, requestingUser);
        }
    } catch (error) {
        console.warn('⚠️ Error triggering real notifications:', error.message);
        console.log('💡 Make sure the Next.js server is running (npm run dev)');
        console.log('💡 Falling back to simulation mode...');
        // Fallback to simulation
        await notificationService.sendNewTransferRequestNotification(transfer, requestingUser);
    }
}

// Quick sample data
const QUICK_DATA = {
    patient: {
        firstName: 'John',
        lastName: 'Smith',
        age: 45,
        dossierNumber: 'DOS-2024-001'
    },
    envelope: {
        senderName: 'Dr. Sarah Johnson',
        recipientName: 'Dr. Michael Chen',
        contents: 'Medical supplies and test results',
        weight: 2.5
    },
    file: {
        patientName: 'Jane Doe',
        dossierNumber: 'DOS-2024-002',
        fileType: 'X-Ray',
        fileCount: 3,
        urgency: 'high'
    },
    equipment: {
        equipmentName: 'Ventilator V60',
        model: 'Philips Respironics V60',
        condition: 'good',
        serialNumber: 'SN-2024-001',
        maintenanceRequired: false
    }
};

async function createQuickTransfer(type) {
    try {
        console.log(`🚀 Creating quick ${type} transfer...`);

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');

        // Get required data
        const requestingUser = await User.findOne({ userType: 'manager', status: 'approved' });
        const hospitals = await Hospital.find({});

        if (!requestingUser) {
            console.error('❌ No manager found. Create a manager user first.');
            return;
        }

        if (hospitals.length < 2) {
            console.error('❌ Need at least 2 hospitals. Create hospitals first.');
            return;
        }

        const [fromHospital, toHospital] = hospitals.slice(0, 2);

        // Generate transfer data
        let transferData = {};
        const transferId = `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`;

        switch (type) {
            case 'patient':
                transferData = {
                    transferCategory: TransferCategory.PATIENT,
                    patientFirstName: QUICK_DATA.patient.firstName,
                    patientLastName: QUICK_DATA.patient.lastName,
                    patientAge: QUICK_DATA.patient.age,
                    patientDossierNumber: QUICK_DATA.patient.dossierNumber,
                    transferData: {
                        patientInfo: QUICK_DATA.patient
                    }
                };
                break;

            case 'envelope':
                transferData = {
                    transferCategory: TransferCategory.ENVELOPE,
                    envelopeNumber: `ENV-${Date.now().toString().slice(-6)}`,
                    senderName: QUICK_DATA.envelope.senderName,
                    recipientName: QUICK_DATA.envelope.recipientName,
                    contents: QUICK_DATA.envelope.contents,
                    weight: QUICK_DATA.envelope.weight,
                    transferData: {
                        envelopeInfo: QUICK_DATA.envelope
                    }
                };
                break;

            case 'file':
                transferData = {
                    transferCategory: TransferCategory.PATIENT_FILE,
                    patientName: QUICK_DATA.file.patientName,
                    dossierNumber: QUICK_DATA.file.dossierNumber,
                    fileType: QUICK_DATA.file.fileType,
                    fileCount: QUICK_DATA.file.fileCount,
                    fileUrgency: QUICK_DATA.file.urgency,
                    transferData: {
                        fileInfo: QUICK_DATA.file
                    }
                };
                break;

            case 'equipment':
                transferData = {
                    transferCategory: TransferCategory.MEDICAL_EQUIPMENT,
                    equipmentName: QUICK_DATA.equipment.equipmentName,
                    model: QUICK_DATA.equipment.model,
                    condition: QUICK_DATA.equipment.condition,
                    serialNumber: QUICK_DATA.equipment.serialNumber,
                    maintenanceRequired: QUICK_DATA.equipment.maintenanceRequired,
                    transferData: {
                        equipmentInfo: QUICK_DATA.equipment
                    }
                };
                break;

            default:
                console.error('❌ Invalid type. Use: patient, envelope, file, equipment');
                return;
        }

        // Create transfer
        const transfer = new Transfer({
            transferId,
            ...transferData,
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: requestingUser._id,
            reason: 'Quick test transfer',
            priority: 'medium',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            notes: `Quick test ${type} transfer`,
            issuer: 'Test Script',
            lastModifiedBy: requestingUser._id,
            statusHistory: [{
                status: 'pending',
                changedBy: requestingUser._id,
                changedAt: new Date(),
                reason: 'Quick test transfer created'
            }]
        });

        await transfer.save();

        console.log('✅ Transfer created!');
        console.log(`📋 ID: ${transferId}`);
        console.log(`📂 Type: ${type}`);
        console.log(`🏥 From: ${fromHospital.name}`);
        console.log(`🏥 To: ${toHospital.name}`);

        // Send notifications using real notification service
        await triggerRealNotifications(transfer, requestingUser);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

async function createAllQuick() {
    const types = ['patient', 'envelope', 'file', 'equipment'];
    for (const type of types) {
        await createQuickTransfer(type);
        console.log('');
    }
    console.log('🎉 All quick transfers created!');
}

// Main execution
const type = process.argv[2];
if (!type) {
    console.log(`
📋 Quick Transfer Test

Usage:
  node scripts/quick-transfer-test.js patient
  node scripts/quick-transfer-test.js envelope
  node scripts/quick-transfer-test.js file
  node scripts/quick-transfer-test.js equipment
  node scripts/quick-transfer-test.js all
  `);
    process.exit(1);
}

if (type === 'all') {
    createAllQuick();
} else {
    createQuickTransfer(type);
}
