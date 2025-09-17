#!/usr/bin/env node

/**
 * Script to check database status
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
    class: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    versionKey: false
});

const patientSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    medicalRecordNumber: { type: String, required: true, unique: true },
    diagnosis: { type: String, required: true },
    currentHospital: { type: String, required: true },
    roomNumber: { type: String },
    bedNumber: { type: String },
    condition: { type: String, enum: ['stable', 'critical', 'urgent'], default: 'stable' },
    allergies: [String],
    medications: [String],
    notes: String
}, {
    timestamps: true,
    versionKey: false
});

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    fromHospital: { type: String, required: true },
    toHospital: { type: String, required: true },
    transferDate: { type: Date, required: true },
    transferTime: { type: String, required: true },
    transferType: { type: String, enum: ['emergency', 'scheduled'], required: true },
    issuer: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    notes: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

async function checkDatabase() {
    try {
        console.log('🔍 Checking database status...');
        console.log(`🔗 Using MongoDB URI: ${MONGODB_URI}`);

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check users
        const userCount = await User.countDocuments();
        const managerCount = await User.countDocuments({ userType: 'manager' });
        const employeeCount = await User.countDocuments({ userType: 'employee' });

        console.log('\n📊 Users:');
        console.log(`   - Total: ${userCount}`);
        console.log(`   - Managers: ${managerCount}`);
        console.log(`   - Employees: ${employeeCount}`);

        // Check patients
        const patientCount = await Patient.countDocuments();
        console.log('\n🏥 Patients:');
        console.log(`   - Total: ${patientCount}`);

        if (patientCount > 0) {
            const patients = await Patient.find().limit(5);
            console.log('   - Sample patients:');
            patients.forEach((patient, index) => {
                console.log(`     ${index + 1}. ${patient.firstName} ${patient.lastName} (${patient.age} years) - ${patient.currentHospital}`);
            });
        }

        // Check transfers
        const transferCount = await Transfer.countDocuments();
        console.log('\n🚑 Transfers:');
        console.log(`   - Total: ${transferCount}`);

        if (transferCount > 0) {
            const transfers = await Transfer.find().limit(5);
            console.log('   - Sample transfers:');
            transfers.forEach((transfer, index) => {
                console.log(`     ${index + 1}. ${transfer.transferId} - ${transfer.status} (${transfer.fromHospital} → ${transfer.toHospital})`);
            });
        }

        // Check if we need to create sample data
        if (patientCount === 0) {
            console.log('\n⚠️  No patients found. Transfer creation requires existing patients.');
            console.log('💡 Consider running: node scripts/seed-data.js');
        }

    } catch (error) {
        console.error('❌ Error checking database:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
checkDatabase().catch(console.error);
