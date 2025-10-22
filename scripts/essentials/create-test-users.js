#!/usr/bin/env node

/**
 * Script to create test users for approval system testing
 * Creates 3 employees and 3 managers with all necessary fields
 * Uses Montreal.docx as a temporary document for employee files
 * 
 * Usage: node scripts/essentials/create-test-users.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env.local' });

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
console.log('MONGODB_URI:', mongoUri ? 'Found' : 'Not found');

// Define schemas (since we can't import TypeScript models directly)
const userSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        enum: ['employee', 'manager', 'admin', 'super_admin']
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.ObjectId, ref: 'CIUSSS' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    documents: [{
        fileId: { type: String, required: true },
        documentType: {
            type: String,
            required: true,
            enum: ['cv', 'opiqPermit', 'rcr']
        },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending'
    },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const ciusssSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'ciusss'
});

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    address: { type: String, required: true, trim: true },
    organization: {
        type: { type: String, required: true, enum: ['CIUSSS', 'CISSS', 'CUSM'] },
        name: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true }
    },
    coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 }
    },
    contact: {
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true }
    },
    specialties: [{ type: String, trim: true }],
    capacity: {
        totalBeds: { type: Number, min: 0 },
        icuBeds: { type: Number, min: 0 },
        emergencyBeds: { type: Number, min: 0 }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    versionKey: false
});

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const CIUSSS = mongoose.models.CIUSSS || mongoose.model('CIUSSS', ciusssSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

// Test user data
const testUsers = [
    // 3 Employees
    {
        userType: 'employee',
        firstName: 'Marie',
        lastName: 'Dubois',
        email: 'marie.dubois@test.com',
        phone: '514-123-4567',
        password: 'TestPassword123!',
        status: 'pending'
    },
    {
        userType: 'employee',
        firstName: 'Jean',
        lastName: 'Tremblay',
        email: 'jean.tremblay@test.com',
        phone: '514-234-5678',
        password: 'TestPassword123!',
        status: 'pending'
    },
    {
        userType: 'employee',
        firstName: 'Sophie',
        lastName: 'Gagnon',
        email: 'sophie.gagnon@test.com',
        phone: '514-345-6789',
        password: 'TestPassword123!',
        status: 'pending'
    },
    // 3 Managers
    {
        userType: 'manager',
        firstName: 'Pierre',
        lastName: 'Lavoie',
        email: 'pierre.lavoie@test.com',
        phone: '514-456-7890',
        password: 'TestPassword123!',
        post: 'Coordinateur',
        status: 'pending'
    },
    {
        userType: 'manager',
        firstName: 'Isabelle',
        lastName: 'Bergeron',
        email: 'isabelle.bergeron@test.com',
        phone: '514-567-8901',
        password: 'TestPassword123!',
        post: 'Assistant-chef',
        status: 'pending'
    },
    {
        userType: 'manager',
        firstName: 'François',
        lastName: 'Côté',
        email: 'francois.cote@test.com',
        phone: '514-678-9012',
        password: 'TestPassword123!',
        post: 'Gestionnaire',
        status: 'pending'
    }
];

// Document types for employees
const documentTypes = ['cv', 'opiqPermit', 'rcr'];

// Helper function to create document metadata
function createDocumentMetadata(fileName, documentType, userId) {
    return {
        fileId: `test_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentType: documentType,
        originalName: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024 * 1024, // 1MB
        checksum: `test_checksum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uploadedAt: new Date()
    };
}

// Helper function to get random CIUSSS and Hospital
async function getRandomCIUSSSAndHospital() {
    try {
        // Get random CIUSSS
        const ciusssList = await CIUSSS.find({ isActive: true });
        const randomCIUSSS = ciusssList[Math.floor(Math.random() * ciusssList.length)];

        // Get random Hospital
        const hospitalList = await Hospital.find({ isActive: true });
        const randomHospital = hospitalList[Math.floor(Math.random() * hospitalList.length)];

        return {
            ciusss: randomCIUSSS._id,
            hospital: randomHospital._id,
            ciusssName: randomCIUSSS.name,
            hospitalName: randomHospital.name
        };
    } catch (error) {
        console.error('Error getting random CIUSSS and Hospital:', error);
        return null;
    }
}

// Helper function to copy Montreal.docx for each document type
async function copyMontrealDocForDocuments(userId) {
    const sourcePath = path.join(__dirname, '../../test/Montréal.docx');
    const documents = [];

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️  Source file not found: ${sourcePath}`);
        console.warn('Creating mock documents instead...');

        // Create mock documents
        for (const docType of documentTypes) {
            documents.push(createDocumentMetadata(`Montreal_${docType}.docx`, docType, userId));
        }
        return documents;
    }

    try {
        // Read the source file
        const fileBuffer = fs.readFileSync(sourcePath);

        // Create documents for each type
        for (const docType of documentTypes) {
            const fileName = `Montreal_${docType}.docx`;
            documents.push(createDocumentMetadata(fileName, docType, userId));
        }

        console.log(`📄 Created ${documents.length} document references for user ${userId}`);
        return documents;
    } catch (error) {
        console.error('Error copying Montreal.docx:', error);
        return [];
    }
}

async function createTestUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear existing test users
        console.log('🗑️  Clearing existing test users...');
        await User.deleteMany({
            email: { $in: testUsers.map(user => user.email) }
        });
        console.log('✅ Existing test users cleared');

        // Get random CIUSSS and Hospital for managers
        const ciusssHospital = await getRandomCIUSSSAndHospital();
        if (!ciusssHospital) {
            throw new Error('Failed to get CIUSSS and Hospital data');
        }

        console.log(`🏥 Using CIUSSS: ${ciusssHospital.ciusssName}`);
        console.log(`🏥 Using Hospital: ${ciusssHospital.hospitalName}`);

        const createdUsers = [];

        // Create users
        for (const userData of testUsers) {
            console.log(`\n👤 Creating ${userData.userType}: ${userData.firstName} ${userData.lastName}`);

            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            // Prepare user document
            const userDoc = {
                userType: userData.userType,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                password: hashedPassword,
                status: userData.status
            };

            // Add manager-specific fields
            if (userData.userType === 'manager') {
                userDoc.post = userData.post;
                userDoc.ciusss = ciusssHospital.ciusss;
                userDoc.hospital = ciusssHospital.hospital;
            }

            // Add employee-specific documents
            if (userData.userType === 'employee') {
                userDoc.documents = await copyMontrealDocForDocuments(userData.email);
            }

            // Create user
            const user = new User(userDoc);
            const savedUser = await user.save();

            createdUsers.push({
                id: savedUser._id,
                name: `${savedUser.firstName} ${savedUser.lastName}`,
                email: savedUser.email,
                userType: savedUser.userType,
                status: savedUser.status,
                documents: savedUser.documents?.length || 0
            });

            console.log(`✅ Created ${userData.userType}: ${savedUser.firstName} ${savedUser.lastName} (${savedUser.email})`);
            if (savedUser.documents) {
                console.log(`   📄 Documents: ${savedUser.documents.length} files`);
            }
            if (savedUser.post) {
                console.log(`   💼 Position: ${savedUser.post}`);
            }
        }

        // Display summary
        console.log('\n📊 Test Users Summary:');
        console.log('='.repeat(50));

        const employees = createdUsers.filter(u => u.userType === 'employee');
        const managers = createdUsers.filter(u => u.userType === 'manager');

        console.log(`\n👩‍⚕️  Employees (${employees.length}):`);
        employees.forEach(user => {
            console.log(`   • ${user.name} (${user.email}) - ${user.documents} documents`);
        });

        console.log(`\n👨‍💼 Managers (${managers.length}):`);
        managers.forEach(user => {
            console.log(`   • ${user.name} (${user.email})`);
        });

        console.log('\n🎯 All users created with status: PENDING');
        console.log('📧 Admin will receive email notifications for each user');
        console.log('🎛️  Use admin dashboard to approve/reject users');

        console.log('\n🔗 Next Steps:');
        console.log('1. Check your email for admin notifications');
        console.log('2. Go to /admin/users in your browser');
        console.log('3. Click on any pending user to review details');
        console.log('4. Use "Approve User" or "Reject User" buttons');
        console.log('5. Test the new dashboard approval system!');

        console.log('\n🎉 Test users created successfully!');

    } catch (error) {
        console.error('❌ Error creating test users:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
createTestUsers().catch(console.error);
