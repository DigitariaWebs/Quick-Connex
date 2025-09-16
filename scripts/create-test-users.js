#!/usr/bin/env node

/**
 * Script to create test users (1 manager and 1 employee)
 * This will create users with proper document uploads for testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
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

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Helper function to capitalize first letter of each word
const capitalizeName = (name) => {
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Create a simple test PDF content
function createTestPDF(filename) {
    const testContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Document: ${filename}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

    return Buffer.from(testContent, 'utf8');
}

async function createTestUsers() {
    try {
        console.log('👥 Starting test user creation...');

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Hash password for both users
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('TestPassword123!', saltRounds);

        // Create Manager User
        console.log('👨‍💼 Creating manager user...');
        const managerData = {
            userType: 'manager',
            firstName: capitalizeName('john'),
            lastName: capitalizeName('manager'),
            email: 'manager@test.com',
            phone: '1234567890',
            password: hashedPassword,
            post: capitalizeName('head of department'),
            ciusss: '03',
            documents: []
        };

        const manager = new User(managerData);
        await manager.save();
        console.log(`✅ Manager created: ${manager.email} (ID: ${manager._id})`);

        // Create Employee User with documents
        console.log('👨‍💻 Creating employee user...');

        // Create test documents
        const cvBuffer = createTestPDF('CV_Document.pdf');
        const opiqBuffer = createTestPDF('OPIQ_Permit.pdf');
        const rcrBuffer = createTestPDF('RCR_Document.pdf');

        // Generate file IDs (simulating GridFS file IDs)
        const cvFileId = new mongoose.Types.ObjectId().toString();
        const opiqFileId = new mongoose.Types.ObjectId().toString();
        const rcrFileId = new mongoose.Types.ObjectId().toString();

        const employeeData = {
            userType: 'employee',
            firstName: capitalizeName('jane'),
            lastName: capitalizeName('employee'),
            email: 'employee@test.com',
            phone: '0987654321',
            password: hashedPassword,
            documents: [
                {
                    fileId: cvFileId,
                    documentType: 'cv',
                    originalName: 'CV_Document.pdf',
                    mimeType: 'application/pdf',
                    size: cvBuffer.length,
                    checksum: 'test-cv-checksum',
                    uploadedAt: new Date()
                },
                {
                    fileId: opiqFileId,
                    documentType: 'opiqPermit',
                    originalName: 'OPIQ_Permit.pdf',
                    mimeType: 'application/pdf',
                    size: opiqBuffer.length,
                    checksum: 'test-opiq-checksum',
                    uploadedAt: new Date()
                },
                {
                    fileId: rcrFileId,
                    documentType: 'rcr',
                    originalName: 'RCR_Document.pdf',
                    mimeType: 'application/pdf',
                    size: rcrBuffer.length,
                    checksum: 'test-rcr-checksum',
                    uploadedAt: new Date()
                }
            ]
        };

        const employee = new User(employeeData);
        await employee.save();
        console.log(`✅ Employee created: ${employee.email} (ID: ${employee._id})`);
        console.log(`   - Documents: ${employee.documents.length} files`);

        // Display summary
        console.log('\n🎉 Test users created successfully!');
        console.log('\n📊 User Summary:');
        console.log('👨‍💼 Manager:');
        console.log(`   - Name: ${manager.firstName} ${manager.lastName}`);
        console.log(`   - Email: manager@test.com`);
        console.log(`   - Password: TestPassword123!`);
        console.log(`   - Post: ${manager.post}`);
        console.log(`   - Class: A`);
        console.log(`   - Documents: 0 (managers don't need documents)`);

        console.log('\n👨‍💻 Employee:');
        console.log(`   - Name: ${employee.firstName} ${employee.lastName}`);
        console.log(`   - Email: employee@test.com`);
        console.log(`   - Password: TestPassword123!`);
        console.log(`   - Documents: 3 files (CV, OPIQ Permit, RCR)`);
        console.log(`   - CV: ${employee.documents[0].originalName}`);
        console.log(`   - OPIQ: ${employee.documents[1].originalName}`);
        console.log(`   - RCR: ${employee.documents[2].originalName}`);

        console.log('\n🔐 Login Credentials:');
        console.log('   Manager: manager@test.com / TestPassword123!');
        console.log('   Employee: employee@test.com / TestPassword123!');

        // Verify users in database
        const totalUsers = await User.countDocuments();
        const managerCount = await User.countDocuments({ userType: 'manager' });
        const employeeCount = await User.countDocuments({ userType: 'employee' });

        console.log('\n📈 Database Status:');
        console.log(`   - Total Users: ${totalUsers}`);
        console.log(`   - Managers: ${managerCount}`);
        console.log(`   - Employees: ${employeeCount}`);

    } catch (error) {
        console.error('❌ Error creating test users:', error);
        process.exit(1);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
createTestUsers().catch(console.error);
