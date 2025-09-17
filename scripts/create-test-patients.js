#!/usr/bin/env node

/**
 * Script to create test patients for transfer testing
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

async function createTestPatients() {
    try {
        console.log('🏥 Creating test patients...');

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if patients already exist
        const existingCount = await Patient.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  ${existingCount} patients already exist, skipping creation`);
            return;
        }

        // Create test patients
        const testPatients = [
            {
                patientId: 'PAT-001-2024',
                firstName: 'John',
                lastName: 'Doe',
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
                currentHospital: 'Toronto General Hospital',
                currentDepartment: 'Cardiology',
                admissionDate: new Date(),
                status: 'active'
            },
            {
                patientId: 'PAT-002-2024',
                firstName: 'Jane',
                lastName: 'Smith',
                dateOfBirth: new Date('1992-08-22'),
                gender: 'female',
                phone: '(555) 234-5678',
                email: 'jane.smith@email.com',
                address: {
                    street: '456 Oak Avenue',
                    city: 'Toronto',
                    state: 'Ontario',
                    zipCode: 'M6K 1A1',
                    country: 'Canada'
                },
                medicalInfo: {
                    bloodType: 'A+',
                    allergies: [],
                    medications: ['Pain medication'],
                    medicalHistory: 'Neurological condition',
                    emergencyContact: {
                        name: 'Robert Smith',
                        relationship: 'Father',
                        phone: '(555) 234-5679'
                    }
                },
                currentHospital: 'Mount Sinai Hospital',
                currentDepartment: 'Neurology',
                admissionDate: new Date(),
                status: 'active'
            },
            {
                patientId: 'PAT-003-2024',
                firstName: 'Robert',
                lastName: 'Johnson',
                dateOfBirth: new Date('1957-12-03'),
                gender: 'male',
                phone: '(555) 345-6789',
                email: 'robert.johnson@email.com',
                address: {
                    street: '789 Pine Street',
                    city: 'Toronto',
                    state: 'Ontario',
                    zipCode: 'M4W 2B2',
                    country: 'Canada'
                },
                medicalInfo: {
                    bloodType: 'B+',
                    allergies: ['Latex'],
                    medications: ['Blood thinner'],
                    medicalHistory: 'Orthopedic surgery required',
                    emergencyContact: {
                        name: 'Mary Johnson',
                        relationship: 'Wife',
                        phone: '(555) 345-6790'
                    }
                },
                currentHospital: 'St. Michael\'s Hospital',
                currentDepartment: 'Orthopedics',
                admissionDate: new Date(),
                status: 'active'
            }
        ];

        for (const patientData of testPatients) {
            const patient = new Patient(patientData);
            await patient.save();
            console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
        }

        console.log('\n🎉 Test patients created successfully!');
        console.log('\n📊 Patient Summary:');
        const totalPatients = await Patient.countDocuments();
        console.log(`   - Total patients: ${totalPatients}`);

        const patients = await Patient.find();
        patients.forEach((patient, index) => {
            const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            console.log(`   ${index + 1}. ${patient.firstName} ${patient.lastName} (${age} years)`);
            console.log(`      - Patient ID: ${patient.patientId}`);
            console.log(`      - Hospital: ${patient.currentHospital}`);
            console.log(`      - Status: ${patient.status}`);
            console.log(`      - Medical History: ${patient.medicalInfo.medicalHistory}`);
        });

    } catch (error) {
        console.error('❌ Error creating test patients:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
createTestPatients().catch(console.error);
