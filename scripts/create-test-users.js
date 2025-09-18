#!/usr/bin/env node

/**
 * Script to create test users for development and testing
 * Usage:
 *   node scripts/create-test-users.js                    - Create default test users
 *   node scripts/create-test-users.js --manager          - Create only manager users
 *   node scripts/create-test-users.js --employee         - Create only employee users
 *   node scripts/create-test-users.js --count 5          - Create 5 of each type
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define User schema directly in the script
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date, default: Date.now },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Test data
const testManagers = [
    {
        userType: 'manager',
        firstName: 'Marie',
        lastName: 'Dubois',
        email: 'marie.dubois@test.com',
        phone: '514-123-4567',
        post: 'Directrice des soins',
        ciusss: '01',
        status: 'approved',
        approvedBy: 'admin@system.com',
        approvedAt: new Date()
    },
    {
        userType: 'manager',
        firstName: 'Jean',
        lastName: 'Tremblay',
        email: 'jean.tremblay@test.com',
        phone: '514-234-5678',
        post: 'Chef de service',
        ciusss: '02',
        status: 'approved',
        approvedBy: 'admin@system.com',
        approvedAt: new Date()
    },
    {
        userType: 'manager',
        firstName: 'Sophie',
        lastName: 'Gagnon',
        email: 'sophie.gagnon@test.com',
        phone: '514-345-6789',
        post: 'Superviseure clinique',
        ciusss: '03',
        status: 'approved',
        approvedBy: 'admin@system.com',
        approvedAt: new Date()
    }
];

const testEmployees = [
    {
        userType: 'employee',
        firstName: 'Pierre',
        lastName: 'Martin',
        email: 'pierre.martin@test.com',
        phone: '514-456-7890',
        status: 'approved',
        approvedBy: 'admin@system.com',
        approvedAt: new Date(),
        documents: [
            {
                fileId: 'test-cv-001',
                documentType: 'cv',
                originalName: 'Pierre_Martin_CV.pdf',
                mimeType: 'application/pdf',
                size: 1024000,
                checksum: 'test-cv-checksum-001',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-opiq-001',
                documentType: 'opiqPermit',
                originalName: 'Pierre_Martin_OPIQ.pdf',
                mimeType: 'application/pdf',
                size: 512000,
                checksum: 'test-opiq-checksum-001',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-rcr-001',
                documentType: 'rcr',
                originalName: 'Pierre_Martin_RCR.pdf',
                mimeType: 'application/pdf',
                size: 768000,
                checksum: 'test-rcr-checksum-001',
                uploadedAt: new Date()
            }
        ]
    },
    {
        userType: 'employee',
        firstName: 'Isabelle',
        lastName: 'Lavoie',
        email: 'isabelle.lavoie@test.com',
        phone: '514-567-8901',
        status: 'approved',
        approvedBy: 'admin@system.com',
        approvedAt: new Date(),
        documents: [
            {
                fileId: 'test-cv-002',
                documentType: 'cv',
                originalName: 'Isabelle_Lavoie_CV.pdf',
                mimeType: 'application/pdf',
                size: 1152000,
                checksum: 'test-cv-checksum-002',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-opiq-002',
                documentType: 'opiqPermit',
                originalName: 'Isabelle_Lavoie_OPIQ.pdf',
                mimeType: 'application/pdf',
                size: 640000,
                checksum: 'test-opiq-checksum-002',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-rcr-002',
                documentType: 'rcr',
                originalName: 'Isabelle_Lavoie_RCR.pdf',
                mimeType: 'application/pdf',
                size: 896000,
                checksum: 'test-rcr-checksum-002',
                uploadedAt: new Date()
            }
        ]
    },
    {
        userType: 'employee',
        firstName: 'Marc',
        lastName: 'Bouchard',
        email: 'marc.bouchard@test.com',
        phone: '514-678-9012',
        status: 'pending',
        documents: [
            {
                fileId: 'test-cv-003',
                documentType: 'cv',
                originalName: 'Marc_Bouchard_CV.pdf',
                mimeType: 'application/pdf',
                size: 1280000,
                checksum: 'test-cv-checksum-003',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-opiq-003',
                documentType: 'opiqPermit',
                originalName: 'Marc_Bouchard_OPIQ.pdf',
                mimeType: 'application/pdf',
                size: 512000,
                checksum: 'test-opiq-checksum-003',
                uploadedAt: new Date()
            },
            {
                fileId: 'test-rcr-003',
                documentType: 'rcr',
                originalName: 'Marc_Bouchard_RCR.pdf',
                mimeType: 'application/pdf',
                size: 1024000,
                checksum: 'test-rcr-checksum-003',
                uploadedAt: new Date()
            }
        ]
    }
];

// Parse command line arguments
const args = process.argv.slice(2);
const createManagers = !args.includes('--employee');
const createEmployees = !args.includes('--manager');
const countArg = args.find(arg => arg.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1]) || 1 : 1;

async function createTestUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const defaultPassword = 'TestPassword123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        let createdCount = 0;

        // Create managers
        if (createManagers) {
            console.log(`\n👔 Creating ${count} manager(s)...`);
            for (let i = 0; i < count; i++) {
                const managerData = { ...testManagers[i % testManagers.length] };
                managerData.email = `manager${i + 1}@test.com`;
                managerData.password = hashedPassword;

                try {
                    const manager = new User(managerData);
                    await manager.save();
                    console.log(`   ✅ Created manager: ${manager.firstName} ${manager.lastName} (${manager.email})`);
                    createdCount++;
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Manager ${managerData.email} already exists`);
                    } else {
                        console.log(`   ❌ Error creating manager ${managerData.email}: ${error.message}`);
                    }
                }
            }
        }

        // Create employees
        if (createEmployees) {
            console.log(`\n👩‍⚕️ Creating ${count} employee(s)...`);
            for (let i = 0; i < count; i++) {
                const employeeData = { ...testEmployees[i % testEmployees.length] };
                employeeData.email = `employee${i + 1}@test.com`;
                employeeData.password = hashedPassword;

                // Update document fileIds to be unique
                employeeData.documents = employeeData.documents.map((doc, docIndex) => ({
                    ...doc,
                    fileId: `test-${doc.documentType}-${i + 1}-${docIndex + 1}`,
                    checksum: `test-${doc.documentType}-checksum-${i + 1}-${docIndex + 1}`
                }));

                try {
                    const employee = new User(employeeData);
                    await employee.save();
                    console.log(`   ✅ Created employee: ${employee.firstName} ${employee.lastName} (${employee.email})`);
                    createdCount++;
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Employee ${employeeData.email} already exists`);
                    } else {
                        console.log(`   ❌ Error creating employee ${employeeData.email}: ${error.message}`);
                    }
                }
            }
        }

        console.log(`\n🎉 Test user creation completed!`);
        console.log(`📊 Total users created: ${createdCount}`);
        console.log(`🔑 Default password for all users: ${defaultPassword}`);

        // Display summary
        const totalUsers = await User.countDocuments();
        const managers = await User.countDocuments({ userType: 'manager' });
        const employees = await User.countDocuments({ userType: 'employee' });
        const approved = await User.countDocuments({ status: 'approved' });
        const pending = await User.countDocuments({ status: 'pending' });

        console.log(`\n📈 Database Summary:`);
        console.log(`   - Total users: ${totalUsers}`);
        console.log(`   - Managers: ${managers}`);
        console.log(`   - Employees: ${employees}`);
        console.log(`   - Approved: ${approved}`);
        console.log(`   - Pending: ${pending}`);

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
