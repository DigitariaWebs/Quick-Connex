#!/usr/bin/env node

/**
 * Script to fix patient data
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

async function fixPatient() {
    try {
        console.log('🔧 Fixing patient data...');

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find patient without patientId
        const patient = await Patient.findOne({ patientId: { $exists: false } });

        if (!patient) {
            console.log('❌ No patient found without patientId');
            return;
        }

        console.log(`Found patient: ${patient.firstName} ${patient.lastName}`);

        // Update patient with proper data
        const updatedPatient = await Patient.findByIdAndUpdate(
            patient._id,
            {
                patientId: 'PAT-001-2024',
                dateOfBirth: new Date('1979-05-15'),
                gender: 'male',
                phone: '(555) 123-4567',
                email: 'john.doe@email.com',
                address: {
                    street: '123 Main Street',
                    city: 'Toronto',
                    state: 'Ontario',
                    zipCode: 'M5V 3A8',
                    country: 'Canada'
                },
                medicalInfo: {
                    bloodType: 'O+',
                    allergies: ['Penicillin'],
                    medications: ['Aspirin', 'Beta-blocker'],
                    medicalHistory: 'Cardiac condition requiring specialized surgery',
                    emergencyContact: {
                        name: 'Jane Doe',
                        relationship: 'Spouse',
                        phone: '(555) 123-4568'
                    }
                },
                currentDepartment: 'Cardiology',
                admissionDate: new Date(),
                status: 'active'
            },
            { new: true }
        );

        console.log('\n✅ Patient updated successfully!');
        console.log(`   - Name: ${updatedPatient.firstName} ${updatedPatient.lastName}`);
        console.log(`   - Patient ID: ${updatedPatient.patientId}`);
        console.log(`   - Database ID: ${updatedPatient._id}`);
        console.log(`   - Hospital: ${updatedPatient.currentHospital}`);
        console.log(`   - Status: ${updatedPatient.status}`);

    } catch (error) {
        console.error('❌ Error fixing patient:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
fixPatient().catch(console.error);
