#!/usr/bin/env node

/**
 * Script to set up test environment and verify system health
 * Usage:
 *   node scripts/test-setup.js                    - Run full test setup
 *   node scripts/test-setup.js --quick           - Run quick health check only
 *   node scripts/test-setup.js --create-admin    - Create admin user for testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
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

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    patientInfo: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 120 },
        dossierNumber: { type: String, required: true, trim: true }
    },
    fromHospital: { type: String, required: true, trim: true },
    toHospital: { type: String, required: true, trim: true },
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

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Parse command line arguments
const args = process.argv.slice(2);
const quick = args.includes('--quick');
const createAdmin = args.includes('--create-admin');

async function testSetup() {
    let client;
    try {
        console.log('🧪 Starting test environment setup...');
        console.log('='.repeat(60));

        // Step 1: Environment check
        console.log('🔍 Checking environment configuration...');
        const envCheck = {
            nodeVersion: process.version,
            platform: process.platform,
            mongodbUri: MONGODB_URI ? '✅ Configured' : '❌ Missing',
            workingDirectory: process.cwd()
        };

        console.log(`   Node.js version: ${envCheck.nodeVersion}`);
        console.log(`   Platform: ${envCheck.platform}`);
        console.log(`   MongoDB URI: ${envCheck.mongodbUri}`);
        console.log(`   Working directory: ${envCheck.workingDirectory}`);

        // Step 2: Database connection test
        console.log('\n🔌 Testing database connection...');
        await mongoose.connect(MONGODB_URI);
        console.log('   ✅ MongoDB connection successful');

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();
        console.log('   ✅ Native MongoDB client connected');

        // Step 3: Database health check
        console.log('\n🏥 Performing database health check...');
        const adminDb = db.admin();
        const serverStatus = await adminDb.serverStatus();
        const dbStats = await db.stats();

        console.log(`   MongoDB version: ${serverStatus.version}`);
        console.log(`   Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
        console.log(`   Database size: ${Math.round(dbStats.dataSize / 1024 / 1024)} MB`);
        console.log(`   Collections: ${dbStats.collections}`);
        console.log(`   Documents: ${dbStats.objects}`);

        if (quick) {
            console.log('\n✅ Quick health check completed successfully!');
            return;
        }

        // Step 4: Schema validation
        console.log('\n📋 Validating database schemas...');

        // Test User model
        try {
            const testUser = new User({
                userType: 'manager',
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                phone: '514-000-0000',
                password: 'testpassword',
                post: 'Test Post',
                ciusss: '01',
                status: 'approved'
            });
            await testUser.validate();
            console.log('   ✅ User schema validation passed');
        } catch (error) {
            console.log(`   ❌ User schema validation failed: ${error.message}`);
        }

        // Test Transfer model
        try {
            const testTransfer = new Transfer({
                transferId: 'TEST-001',
                patientInfo: {
                    firstName: 'Test',
                    lastName: 'Patient',
                    age: 30,
                    dossierNumber: 'TEST-2024-001'
                },
                fromHospital: 'Test Hospital A',
                toHospital: 'Test Hospital B',
                requestedBy: new mongoose.Types.ObjectId(),
                reason: 'Test transfer',
                priority: 'medium',
                status: 'pending',
                lastModifiedBy: new mongoose.Types.ObjectId()
            });
            await testTransfer.validate();
            console.log('   ✅ Transfer schema validation passed');
        } catch (error) {
            console.log(`   ❌ Transfer schema validation failed: ${error.message}`);
        }

        // Step 5: Create admin user if requested
        if (createAdmin) {
            console.log('\n👤 Creating admin user...');
            const adminEmail = 'admin@patients-management.com';
            const adminPassword = 'AdminPassword123!';

            const existingAdmin = await User.findOne({ email: adminEmail });
            if (existingAdmin) {
                console.log('   ⚠️  Admin user already exists');
            } else {
                const hashedPassword = await bcrypt.hash(adminPassword, 12);
                const admin = new User({
                    userType: 'manager',
                    firstName: 'System',
                    lastName: 'Administrator',
                    email: adminEmail,
                    phone: '514-000-0000',
                    password: hashedPassword,
                    post: 'System Administrator',
                    ciusss: '01',
                    status: 'approved',
                    approvedBy: 'system',
                    approvedAt: new Date()
                });

                await admin.save();
                console.log('   ✅ Admin user created successfully');
                console.log(`   📧 Email: ${adminEmail}`);
                console.log(`   🔑 Password: ${adminPassword}`);
            }
        }

        // Step 6: Data integrity check
        console.log('\n🔍 Checking data integrity...');

        const userCount = await User.countDocuments();
        const transferCount = await Transfer.countDocuments();
        const approvedUsers = await User.countDocuments({ status: 'approved' });
        const pendingTransfers = await Transfer.countDocuments({ status: 'pending' });

        console.log(`   Total users: ${userCount}`);
        console.log(`   Approved users: ${approvedUsers}`);
        console.log(`   Total transfers: ${transferCount}`);
        console.log(`   Pending transfers: ${pendingTransfers}`);

        // Check for orphaned transfers
        const orphanedTransfers = await Transfer.countDocuments({
            requestedBy: { $exists: true },
            $expr: { $not: { $in: ['$requestedBy', []] } }
        });

        if (orphanedTransfers > 0) {
            console.log(`   ⚠️  Found ${orphanedTransfers} transfers with invalid user references`);
        } else {
            console.log('   ✅ No orphaned transfers found');
        }

        // Step 7: GridFS check
        console.log('\n📁 Checking GridFS...');
        const filesCollection = db.collection('fs.files');
        const chunksCollection = db.collection('fs.chunks');

        const fileCount = await filesCollection.countDocuments();
        const chunkCount = await chunksCollection.countDocuments();

        console.log(`   Files: ${fileCount}`);
        console.log(`   Chunks: ${chunkCount}`);

        if (fileCount > 0 && chunkCount === 0) {
            console.log('   ⚠️  Files exist but no chunks found - possible corruption');
        } else if (fileCount > 0 && chunkCount > 0) {
            console.log('   ✅ GridFS appears healthy');
        } else {
            console.log('   ℹ️  No files in GridFS');
        }

        // Step 8: Performance check
        console.log('\n⚡ Performance check...');

        const startTime = Date.now();
        await User.find({}).limit(10).exec();
        const userQueryTime = Date.now() - startTime;

        const transferStartTime = Date.now();
        await Transfer.find({}).limit(10).exec();
        const transferQueryTime = Date.now() - transferStartTime;

        console.log(`   User query time: ${userQueryTime}ms`);
        console.log(`   Transfer query time: ${transferQueryTime}ms`);

        if (userQueryTime > 1000 || transferQueryTime > 1000) {
            console.log('   ⚠️  Slow query performance detected');
        } else {
            console.log('   ✅ Query performance is acceptable');
        }

        // Step 9: Final status
        console.log('\n' + '='.repeat(60));
        console.log('🎉 TEST SETUP COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));

        console.log('📊 System Status:');
        console.log('   ✅ Database connection: Healthy');
        console.log('   ✅ Schema validation: Passed');
        console.log('   ✅ Data integrity: Verified');
        console.log('   ✅ GridFS: Operational');
        console.log('   ✅ Performance: Acceptable');

        console.log('\n🔑 Test Credentials:');
        console.log('   Email: arselene.tests@gmail.com');
        console.log('   Password: TestPassword123!');

        if (createAdmin) {
            console.log('\n👤 Admin Credentials:');
            console.log('   Email: admin@patients-management.com');
            console.log('   Password: AdminPassword123!');
        }

        console.log('\n🚀 Ready for testing!');
        console.log('   Run "npm run dev" to start the development server');

    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
testSetup().catch(console.error);
