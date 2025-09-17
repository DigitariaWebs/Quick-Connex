#!/usr/bin/env node

/**
 * Script to get patient ID for testing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define Patient schema (matching the actual model)
const patientSchema = new mongoose.Schema({
    patientId: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'] },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        zipCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true }
    },
    medicalInfo: {
        bloodType: { type: String, trim: true },
        allergies: [{ type: String, trim: true }],
        medications: [{ type: String, trim: true }],
        medicalHistory: { type: String, trim: true },
        emergencyContact: {
            name: { type: String, required: true, trim: true },
            relationship: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true }
        }
    },
    currentHospital: { type: String, trim: true },
    currentDepartment: { type: String, trim: true },
    admissionDate: { type: Date },
    status: { type: String, required: true, enum: ['active', 'discharged', 'transferred'], default: 'active' }
}, {
    timestamps: true,
    versionKey: false
});

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);

async function getPatientId() {
    try {
        console.log('🔍 Getting patient ID for testing...');

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the first patient
        const patient = await Patient.findOne();

        if (!patient) {
            console.log('❌ No patients found in database');
            return;
        }

        console.log('\n📊 Patient Information:');
        console.log(`   - Name: ${patient.firstName} ${patient.lastName}`);
        console.log(`   - Patient ID: ${patient.patientId}`);
        console.log(`   - Database ID: ${patient._id}`);
        console.log(`   - Hospital: ${patient.currentHospital}`);
        console.log(`   - Status: ${patient.status}`);

        console.log('\n💡 Use this patient ID in your test data:');
        console.log(`   patientId: "${patient.patientId}"`);

    } catch (error) {
        console.error('❌ Error getting patient ID:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
getPatientId().catch(console.error);
