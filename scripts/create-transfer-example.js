#!/usr/bin/env node

/**
 * Transfer Example Creator Script
 * 
 * This script allows you to create example transfers for all transfer types:
 * - Patient transfers
 * - Envelope/Box transfers  
 * - Patient file transfers
 * - Medical equipment transfers
 * 
 * Usage:
 * node scripts/create-transfer-example.js --type patient
 * node scripts/create-transfer-example.js --type envelope
 * node scripts/create-transfer-example.js --type file
 * node scripts/create-transfer-example.js --type equipment
 * node scripts/create-transfer-example.js --type all
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

            // In a real implementation, this would send actual emails/SMS
            // For now, we'll just log the notification details
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

// Function to trigger real notifications directly
async function triggerRealNotifications(transfer, requestingUser) {
    try {
        console.log('📧 Triggering real notifications...');

        // Use the real notification service
        const RealNotificationService = require('./real-notification-service');
        const realNotificationService = new RealNotificationService();

        console.log('📧 Using real notification service...');

        // Send real notifications
        await realNotificationService.sendNewTransferRequestNotification(transfer, requestingUser);

        console.log('✅ Real notifications sent successfully!');
        console.log('📧 Email notifications: Sent via real service');

    } catch (error) {
        console.warn('⚠️ Error triggering real notifications:', error.message);
        console.log('💡 Falling back to simulation mode...');
        // Fallback to simulation
        await notificationService.sendNewTransferRequestNotification(transfer, requestingUser);
    }
}

// Sample data for different transfer types
const SAMPLE_DATA = {
    patient: {
        firstName: ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria'],
        lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
        ages: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
        dossierNumbers: ['DOS-2024-001', 'DOS-2024-002', 'DOS-2024-003', 'DOS-2024-004', 'DOS-2024-005']
    },
    envelope: {
        senders: ['Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Emily Rodriguez', 'Dr. David Kim', 'Dr. Lisa Wang'],
        recipients: ['Dr. Robert Smith', 'Dr. Maria Garcia', 'Dr. James Wilson', 'Dr. Anna Brown', 'Dr. Carlos Martinez'],
        contents: [
            'Medical supplies and medications',
            'Laboratory test results',
            'X-ray films and reports',
            'Patient records and documentation',
            'Surgical instruments',
            'Blood samples for analysis',
            'Prescription medications',
            'Medical equipment parts',
            'Research documents',
            'Administrative paperwork'
        ],
        weights: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]
    },
    file: {
        patientNames: ['John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'David Brown'],
        fileTypes: ['X-Ray', 'MRI', 'CT Scan', 'Lab Results', 'Blood Work', 'Pathology Report', 'Ultrasound', 'EKG'],
        urgencies: ['low', 'medium', 'high', 'urgent'],
        fileCounts: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    equipment: {
        names: [
            'Ventilator V60',
            'ECG Machine',
            'Defibrillator',
            'Patient Monitor',
            'Infusion Pump',
            'Oxygen Concentrator',
            'Ultrasound Machine',
            'X-Ray Machine',
            'Blood Pressure Monitor',
            'Pulse Oximeter'
        ],
        models: [
            'Philips Respironics V60',
            'GE Healthcare MAC 5500',
            'Zoll AED Plus',
            'Philips IntelliVue MX700',
            'Baxter Sigma Spectrum',
            'Invacare Perfecto2',
            'Siemens Acuson X300',
            'GE Healthcare Definium 8000',
            'Omron HEM-7156',
            'Masimo MightySat Rx'
        ],
        conditions: ['excellent', 'good', 'fair', 'poor'],
        serialNumbers: ['SN-2024-001', 'SN-2024-002', 'SN-2024-003', 'SN-2024-004', 'SN-2024-005']
    },
    hospitals: [
        'Montreal General Hospital',
        'Royal Victoria Hospital',
        'Jewish General Hospital',
        'St. Mary\'s Hospital',
        'Montreal Children\'s Hospital',
        'McGill University Health Centre',
        'Hôpital Notre-Dame',
        'Hôpital Sacré-Cœur'
    ],
    reasons: [
        'Patient transfer for specialized treatment',
        'Emergency medical evacuation',
        'Scheduled procedure transfer',
        'Equipment maintenance and repair',
        'Document delivery for patient care',
        'Medical supply transfer',
        'Research collaboration',
        'Administrative documentation'
    ],
    issuers: [
        'Dr. Sarah Johnson',
        'Dr. Michael Chen',
        'Dr. Emily Rodriguez',
        'Dr. David Kim',
        'Dr. Lisa Wang',
        'Nurse Jennifer Smith',
        'Nurse Robert Wilson',
        'Admin Maria Garcia'
    ]
};

// Utility functions
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function generateTransferId(category) {
    const prefixes = {
        [TransferCategory.PATIENT]: 'PAT',
        [TransferCategory.ENVELOPE]: 'ENV',
        [TransferCategory.PATIENT_FILE]: 'FIL',
        [TransferCategory.MEDICAL_EQUIPMENT]: 'EQP'
    };
    const prefix = prefixes[category] || 'TRF';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
}

function generatePatientTransfer() {
    const firstName = getRandomItem(SAMPLE_DATA.patient.firstName);
    const lastName = getRandomItem(SAMPLE_DATA.patient.lastName);
    const age = getRandomItem(SAMPLE_DATA.patient.ages);
    const dossierNumber = getRandomItem(SAMPLE_DATA.patient.dossierNumbers);

    return {
        transferCategory: TransferCategory.PATIENT,
        patientFirstName: firstName,
        patientLastName: lastName,
        patientAge: age,
        patientDossierNumber: dossierNumber,
        transferData: {
            patientInfo: {
                firstName,
                lastName,
                age,
                dossierNumber
            }
        }
    };
}

function generateEnvelopeTransfer() {
    const senderName = getRandomItem(SAMPLE_DATA.envelope.senders);
    const recipientName = getRandomItem(SAMPLE_DATA.envelope.recipients);
    const contents = getRandomItem(SAMPLE_DATA.envelope.contents);
    const weight = getRandomItem(SAMPLE_DATA.envelope.weights);
    const envelopeNumber = `ENV-${Date.now().toString().slice(-6)}`;

    return {
        transferCategory: TransferCategory.ENVELOPE,
        envelopeNumber,
        senderName,
        recipientName,
        contents,
        weight,
        dimensions: {
            length: Math.floor(Math.random() * 30) + 10,
            width: Math.floor(Math.random() * 20) + 5,
            height: Math.floor(Math.random() * 15) + 3
        },
        transferData: {
            envelopeInfo: {
                envelopeNumber,
                senderName,
                recipientName,
                contents,
                weight,
                dimensions: {
                    length: Math.floor(Math.random() * 30) + 10,
                    width: Math.floor(Math.random() * 20) + 5,
                    height: Math.floor(Math.random() * 15) + 3
                }
            }
        }
    };
}

function generateFileTransfer() {
    const patientName = getRandomItem(SAMPLE_DATA.file.patientNames);
    const dossierNumber = getRandomItem(SAMPLE_DATA.patient.dossierNumbers);
    const fileType = getRandomItem(SAMPLE_DATA.file.fileTypes);
    const fileCount = getRandomItem(SAMPLE_DATA.file.fileCounts);
    const urgency = getRandomItem(SAMPLE_DATA.file.urgencies);

    return {
        transferCategory: TransferCategory.PATIENT_FILE,
        patientName,
        dossierNumber,
        fileType,
        fileCount,
        fileUrgency: urgency,
        transferData: {
            fileInfo: {
                patientName,
                dossierNumber,
                fileType,
                fileCount,
                urgency
            }
        }
    };
}

function generateEquipmentTransfer() {
    const equipmentName = getRandomItem(SAMPLE_DATA.equipment.names);
    const model = getRandomItem(SAMPLE_DATA.equipment.models);
    const condition = getRandomItem(SAMPLE_DATA.equipment.conditions);
    const serialNumber = getRandomItem(SAMPLE_DATA.equipment.serialNumbers);
    const maintenanceRequired = Math.random() < 0.3; // 30% chance

    return {
        transferCategory: TransferCategory.MEDICAL_EQUIPMENT,
        equipmentName,
        serialNumber,
        model,
        condition,
        maintenanceRequired,
        specialInstructions: maintenanceRequired ?
            'Equipment requires maintenance before use. Please contact technical support.' :
            'Handle with care. Equipment is in good working condition.',
        transferData: {
            equipmentInfo: {
                equipmentName,
                serialNumber,
                model,
                condition,
                maintenanceRequired,
                specialInstructions: maintenanceRequired ?
                    'Equipment requires maintenance before use. Please contact technical support.' :
                    'Handle with care. Equipment is in good working condition.'
            }
        }
    };
}

async function createTransferExample(transferType) {
    try {
        console.log(`🚀 Creating ${transferType} transfer example...`);

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');
        console.log('✅ Connected to database');

        // Get a random user (manager) to be the requester
        const requestingUser = await User.findOne({ userType: 'manager', status: 'approved' });
        if (!requestingUser) {
            console.error('❌ No approved manager found. Please create a manager user first.');
            process.exit(1);
        }

        // Get two random hospitals
        const hospitals = await Hospital.find({});
        if (hospitals.length < 2) {
            console.error('❌ Need at least 2 hospitals in database. Please create hospitals first.');
            process.exit(1);
        }

        const [fromHospital, toHospital] = getRandomItems(hospitals, 2);

        // Generate transfer data based on type
        let transferData;
        switch (transferType) {
            case 'patient':
                transferData = generatePatientTransfer();
                break;
            case 'envelope':
                transferData = generateEnvelopeTransfer();
                break;
            case 'file':
                transferData = generateFileTransfer();
                break;
            case 'equipment':
                transferData = generateEquipmentTransfer();
                break;
            default:
                console.error('❌ Invalid transfer type. Use: patient, envelope, file, equipment, or all');
                process.exit(1);
        }

        // Common transfer fields
        const commonFields = {
            transferId: generateTransferId(transferData.transferCategory),
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: requestingUser._id,
            reason: getRandomItem(SAMPLE_DATA.reasons),
            priority: getRandomItem(['low', 'medium', 'high', 'urgent']),
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within 7 days
            notes: `Sample ${transferData.transferCategory} transfer created by script`,
            issuer: getRandomItem(SAMPLE_DATA.issuers),
            lastModifiedBy: requestingUser._id,
            statusHistory: [{
                status: 'pending',
                changedBy: requestingUser._id,
                changedAt: new Date(),
                reason: 'Transfer created by script'
            }],
            timeline: [{
                id: `timeline_${Date.now()}`,
                type: 'transfer_created',
                title: `${transferData.transferCategory} Transfer Created`,
                description: `New ${transferData.transferCategory} transfer request created`,
                timestamp: new Date().toISOString(),
                actor: {
                    id: requestingUser._id,
                    name: `${requestingUser.firstName} ${requestingUser.lastName}`,
                    email: requestingUser.email,
                    userType: requestingUser.userType
                },
                metadata: {
                    transferCategory: transferData.transferCategory
                },
                isSystemEvent: false,
                isVisible: true
            }]
        };

        // Create the transfer
        const transfer = new Transfer({
            ...commonFields,
            ...transferData
        });

        await transfer.save();

        console.log('✅ Transfer created successfully!');
        console.log(`📋 Transfer ID: ${transfer.transferId}`);
        console.log(`📂 Category: ${transferData.transferCategory}`);
        console.log(`🏥 From: ${fromHospital.name}`);
        console.log(`🏥 To: ${toHospital.name}`);
        console.log(`👤 Requested by: ${requestingUser.firstName} ${requestingUser.lastName}`);
        console.log(`📅 Scheduled: ${transfer.scheduledDate.toLocaleDateString()}`);
        console.log(`⚡ Priority: ${commonFields.priority}`);

        // Send notifications using real notification service
        await triggerRealNotifications(transfer, requestingUser);

        // Show category-specific details
        switch (transferData.transferCategory) {
            case TransferCategory.PATIENT:
                console.log(`👤 Patient: ${transferData.patientFirstName} ${transferData.patientLastName} (${transferData.patientAge}y)`);
                console.log(`📄 Dossier: ${transferData.patientDossierNumber}`);
                break;
            case TransferCategory.ENVELOPE:
                console.log(`📦 Envelope: ${transferData.senderName} → ${transferData.recipientName}`);
                console.log(`📋 Contents: ${transferData.contents}`);
                console.log(`⚖️ Weight: ${transferData.weight}kg`);
                break;
            case TransferCategory.PATIENT_FILE:
                console.log(`📁 Files: ${transferData.patientName} - ${transferData.fileCount} ${transferData.fileType} files`);
                console.log(`📄 Dossier: ${transferData.dossierNumber}`);
                console.log(`⚡ Urgency: ${transferData.fileUrgency}`);
                break;
            case TransferCategory.MEDICAL_EQUIPMENT:
                console.log(`🏥 Equipment: ${transferData.equipmentName}`);
                console.log(`🔧 Model: ${transferData.model}`);
                console.log(`📊 Condition: ${transferData.condition}`);
                console.log(`🔧 Maintenance: ${transferData.maintenanceRequired ? 'Required' : 'Not required'}`);
                break;
        }

        console.log('\n🎉 Transfer example created successfully!');
        console.log('💡 You can now test the notification system and UI components.');

    } catch (error) {
        console.error('❌ Error creating transfer example:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

async function createAllTransferExamples() {
    const types = ['patient', 'envelope', 'file', 'equipment'];

    console.log('🚀 Creating examples for all transfer types...\n');

    for (const type of types) {
        await createTransferExample(type);
        console.log('\n' + '='.repeat(50) + '\n');
    }

    console.log('🎉 All transfer examples created successfully!');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const typeArg = args.find(arg => arg.startsWith('--type=')) || args.find(arg => arg === '--type');

    if (!typeArg) {
        console.log(`
📋 Transfer Example Creator

Usage:
  node scripts/create-transfer-example.js --type=patient
  node scripts/create-transfer-example.js --type=envelope  
  node scripts/create-transfer-example.js --type=file
  node scripts/create-transfer-example.js --type=equipment
  node scripts/create-transfer-example.js --type=all

Available transfer types:
  • patient     - Patient transfers (legacy)
  • envelope    - Envelope/Box transfers
  • file        - Patient file transfers  
  • equipment   - Medical equipment transfers
  • all         - Create one example of each type

Examples:
  node scripts/create-transfer-example.js --type=patient
  node scripts/create-transfer-example.js --type=envelope
  node scripts/create-transfer-example.js --type=all
    `);
        process.exit(1);
    }

    const transferType = typeArg.includes('=') ? typeArg.split('=')[1] : args[args.indexOf('--type') + 1];

    if (transferType === 'all') {
        await createAllTransferExamples();
    } else {
        await createTransferExample(transferType);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
    process.exit(1);
});

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    createTransferExample,
    createAllTransferExamples,
    SAMPLE_DATA
};
