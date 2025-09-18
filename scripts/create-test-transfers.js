#!/usr/bin/env node

/**
 * Script to create test transfers for development and testing
 * Usage:
 *   node scripts/create-test-transfers.js                    - Create default test transfers
 *   node scripts/create-test-transfers.js --count 5          - Create 5 transfers
 *   node scripts/create-test-transfers.js --priority urgent  - Create transfers with specific priority
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

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
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 }
}, {
    timestamps: true,
    versionKey: false
});

// Hospital schema
const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    address: { type: String, required: true, trim: true },
    organization: {
        type: { type: String, required: true, enum: ['CIUSSS', 'CISSS', 'CUSM'] },
        name: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

// Test data
const hospitals = [
    'Hôpital Notre-Dame',
    'Hôpital Sacré-Cœur',
    'Hôpital Sainte-Justine',
    'Hôpital Royal Victoria',
    'Hôpital Général de Montréal',
    'Hôpital Maisonneuve-Rosemont',
    'Hôpital Jean-Talon',
    'Hôpital Fleury',
    'Hôpital Cité-de-la-Santé',
    'Hôpital Pierre-Boucher'
];

const transferReasons = [
    'Specialized cardiac care required',
    'Emergency surgery needed',
    'ICU bed availability',
    'Specialist consultation required',
    'Patient family request',
    'Equipment not available',
    'Overcrowding situation',
    'Medical emergency',
    'Post-operative care',
    'Rehabilitation services needed'
];

const patientNames = [
    { firstName: 'Marie', lastName: 'Tremblay' },
    { firstName: 'Jean', lastName: 'Gagnon' },
    { firstName: 'Sophie', lastName: 'Lavoie' },
    { firstName: 'Pierre', lastName: 'Martin' },
    { firstName: 'Isabelle', lastName: 'Dubois' },
    { firstName: 'Marc', lastName: 'Bouchard' },
    { firstName: 'Julie', lastName: 'Roy' },
    { firstName: 'François', lastName: 'Côté' },
    { firstName: 'Nathalie', lastName: 'Bergeron' },
    { firstName: 'Michel', lastName: 'Lévesque' }
];

// Parse command line arguments
const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1]) || 3 : 3;
const priorityArg = args.find(arg => arg.startsWith('--priority='));
const priority = priorityArg ? priorityArg.split('=')[1] : null;

function generateTransferId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TRF-${timestamp}-${random}`.toUpperCase();
}

function generateDossierNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}-${random}`;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomAge() {
    return Math.floor(Math.random() * 80) + 18; // Ages 18-97
}

function getRandomTime() {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

async function createTestTransfers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get a manager to be the requester
        const manager = await User.findOne({ userType: 'manager', status: 'approved' });
        if (!manager) {
            console.error('❌ No approved manager found. Please create a manager first using create-test-users.js');
            process.exit(1);
        }

        console.log(`👤 Using manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);

        // Get available hospitals from database
        const availableHospitals = await Hospital.find({ isActive: true });
        if (availableHospitals.length < 2) {
            console.error('❌ Not enough hospitals found in database. Please run seed-hospitals.js first');
            process.exit(1);
        }

        console.log(`🏥 Found ${availableHospitals.length} hospitals in database`);

        let createdCount = 0;

        console.log(`\n🚑 Creating ${count} test transfer(s)...`);

        for (let i = 0; i < count; i++) {
            const patient = getRandomElement(patientNames);
            const fromHospital = getRandomElement(availableHospitals);
            let toHospital = getRandomElement(availableHospitals);

            // Ensure from and to hospitals are different
            while (toHospital._id.toString() === fromHospital._id.toString()) {
                toHospital = getRandomElement(availableHospitals);
            }

            const transferData = {
                transferId: generateTransferId(),
                patientInfo: {
                    firstName: patient.firstName,
                    lastName: patient.lastName,
                    age: getRandomAge(),
                    dossierNumber: generateDossierNumber()
                },
                fromHospital: fromHospital._id,
                toHospital: toHospital._id,
                fromHospitalName: fromHospital.name,
                toHospitalName: toHospital.name,
                requestedBy: manager._id,
                reason: getRandomElement(transferReasons),
                priority: priority || getRandomElement(['low', 'medium', 'high', 'urgent']),
                status: getRandomElement(['pending', 'accepted', 'in_progress']),
                requestedDate: new Date(),
                notes: `Test transfer created by script - ${new Date().toLocaleString()}`,
                medicalDocuments: [],
                scheduling: {
                    transferTime: getRandomTime()
                },
                statusHistory: [{
                    status: 'pending',
                    changedBy: manager._id,
                    changedAt: new Date(),
                    reason: 'Transfer request created'
                }],
                lastModifiedBy: manager._id,
                estimatedDuration: Math.floor(Math.random() * 120) + 30 // 30-150 minutes
            };

            // Add scheduled date if status is not pending
            if (transferData.status !== 'pending') {
                const scheduledDate = new Date();
                scheduledDate.setHours(scheduledDate.getHours() + Math.floor(Math.random() * 48) + 1);
                transferData.scheduledDate = scheduledDate;
            }

            // Add completed date if status is completed
            if (transferData.status === 'completed') {
                const completedDate = new Date();
                completedDate.setHours(completedDate.getHours() - Math.floor(Math.random() * 24));
                transferData.completedDate = completedDate;
                transferData.actualDuration = Math.floor(Math.random() * 60) + 30;
            }

            try {
                const transfer = new Transfer(transferData);
                await transfer.save();
                console.log(`   ✅ Created transfer: ${transfer.transferId}`);
                console.log(`      Patient: ${patient.firstName} ${patient.lastName} (${transfer.patientInfo.age} years)`);
                console.log(`      From: ${fromHospital.name} → To: ${toHospital.name}`);
                console.log(`      Priority: ${transfer.priority} | Status: ${transfer.status}`);
                createdCount++;
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`   ⚠️  Transfer ID ${transferData.transferId} already exists, generating new one...`);
                    i--; // Retry with new ID
                } else {
                    console.log(`   ❌ Error creating transfer: ${error.message}`);
                }
            }
        }

        console.log(`\n🎉 Test transfer creation completed!`);
        console.log(`📊 Total transfers created: ${createdCount}`);

        // Display summary
        const totalTransfers = await Transfer.countDocuments();
        const pending = await Transfer.countDocuments({ status: 'pending' });
        const accepted = await Transfer.countDocuments({ status: 'accepted' });
        const inProgress = await Transfer.countDocuments({ status: 'in_progress' });
        const completed = await Transfer.countDocuments({ status: 'completed' });
        const urgent = await Transfer.countDocuments({ priority: 'urgent' });

        console.log(`\n📈 Transfer Summary:`);
        console.log(`   - Total transfers: ${totalTransfers}`);
        console.log(`   - Pending: ${pending}`);
        console.log(`   - Accepted: ${accepted}`);
        console.log(`   - In Progress: ${inProgress}`);
        console.log(`   - Completed: ${completed}`);
        console.log(`   - Urgent priority: ${urgent}`);

    } catch (error) {
        console.error('❌ Error creating test transfers:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
createTestTransfers().catch(console.error);
