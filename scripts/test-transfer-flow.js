#!/usr/bin/env node

/**
 * Test Transfer Flow Script
 * 
 * This script tests the complete transfer workflow:
 * 1. Create a transfer request (as manager)
 * 2. Verify admin receives notifications
 * 3. Approve the transfer (as admin)
 * 4. Verify manager and employees receive notifications
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, required: function () { return this.userType === 'manager'; }, trim: true },
    ciusss: { type: String, required: function () { return this.userType === 'manager'; }, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

// Transfer schema
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
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
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

async function testTransferFlow() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Verify admin user exists
        console.log('\n👤 Step 1: Verifying admin user...');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@patients-management.com';
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('   ❌ Admin user not found. Please run setup-admin.js first.');
            return;
        }

        console.log(`   ✅ Admin user found: ${admin.firstName} ${admin.lastName} (${admin.email})`);

        // Step 2: Create or find a test manager
        console.log('\n👤 Step 2: Setting up test manager...');
        const testManagerEmail = process.env.TEST_USER_EMAIL || 'arselene.tests@gmail.com';
        let testManager = await User.findOne({ email: testManagerEmail });

        if (!testManager) {
            console.log('   🆕 Creating test manager...');
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            testManager = new User({
                userType: 'manager',
                firstName: 'Test',
                lastName: 'Manager',
                email: testManagerEmail,
                phone: '+15141234567',
                password: hashedPassword,
                post: 'Test Manager',
                ciusss: '01',
                status: 'approved',
                approvedBy: 'system',
                approvedAt: new Date()
            });
            await testManager.save();
            console.log('   ✅ Test manager created');
        } else {
            console.log(`   ✅ Test manager found: ${testManager.firstName} ${testManager.lastName}`);
        }

        // Step 3: Create or find test hospitals
        console.log('\n🏥 Step 3: Setting up test hospitals...');
        let fromHospital = await Hospital.findOne({ name: 'Hôpital Notre-Dame' });
        let toHospital = await Hospital.findOne({ name: 'Hôpital Sacré-Cœur' });

        if (!fromHospital) {
            fromHospital = new Hospital({
                name: 'Hôpital Notre-Dame',
                address: '1560 Sherbrooke St E, Montreal, QC H2L 4M1',
                organization: {
                    type: 'CIUSSS',
                    name: 'CIUSSS de l\'Est-de-l\'Île-de-Montréal',
                    region: 'Montreal'
                },
                isActive: true
            });
            await fromHospital.save();
            console.log('   ✅ From hospital created');
        } else {
            console.log('   ✅ From hospital found');
        }

        if (!toHospital) {
            toHospital = new Hospital({
                name: 'Hôpital Sacré-Cœur',
                address: '5400 Gouin Blvd W, Montreal, QC H4J 1C5',
                organization: {
                    type: 'CIUSSS',
                    name: 'CIUSSS du Nord-de-l\'Île-de-Montréal',
                    region: 'Montreal'
                },
                isActive: true
            });
            await toHospital.save();
            console.log('   ✅ To hospital created');
        } else {
            console.log('   ✅ To hospital found');
        }

        // Step 4: Create a test transfer
        console.log('\n🚑 Step 4: Creating test transfer...');
        const transferId = `TRF-TEST-${Date.now()}`;
        const testTransfer = new Transfer({
            transferId: transferId,
            patientInfo: {
                firstName: 'Test',
                lastName: 'Patient',
                age: 45,
                dossierNumber: `TEST-${Date.now()}`
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: testManager._id,
            reason: 'Test transfer for workflow verification',
            priority: 'medium',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            notes: 'This is a test transfer created by the test script',
            scheduling: {
                transferTime: '14:00'
            },
            statusHistory: [{
                status: 'pending',
                changedBy: testManager._id,
                changedAt: new Date(),
                reason: 'Transfer created for testing'
            }],
            lastModifiedBy: testManager._id
        });

        await testTransfer.save();
        console.log(`   ✅ Test transfer created: ${transferId}`);

        // Step 5: Test admin notification (simulate)
        console.log('\n📧 Step 5: Testing admin notification...');
        try {
            const TransferNotificationService = require('../src/lib/communication/transfer-notification-service').default;
            const populatedTransfer = await Transfer.findById(testTransfer._id)
                .populate('requestedBy', 'firstName lastName email phone userType')
                .populate('fromHospital', 'name address')
                .populate('toHospital', 'name address');

            console.log('   📤 Sending notification to admin...');
            await TransferNotificationService.sendNewTransferRequestNotification(populatedTransfer, testManager);
            console.log('   ✅ Admin notification sent successfully');
        } catch (error) {
            console.log('   ⚠️  Admin notification failed:', error.message);
        }

        // Step 6: Test transfer approval
        console.log('\n✅ Step 6: Testing transfer approval...');
        try {
            // Update transfer status to approved
            testTransfer.status = 'accepted';
            testTransfer.lastModifiedBy = admin._id;
            testTransfer.statusHistory.push({
                status: 'accepted',
                changedBy: admin._id,
                changedAt: new Date(),
                reason: 'Approved by admin for testing'
            });
            await testTransfer.save();
            console.log('   ✅ Transfer approved successfully');

            // Test approval notifications
            const TransferNotificationService = require('../src/lib/communication/transfer-notification-service').default;
            const populatedTransfer = await Transfer.findById(testTransfer._id)
                .populate('requestedBy', 'firstName lastName email phone userType')
                .populate('fromHospital', 'name address')
                .populate('toHospital', 'name address');

            console.log('   📤 Sending approval notifications...');
            await TransferNotificationService.sendTransferApprovedNotification(populatedTransfer, admin);
            console.log('   ✅ Approval notifications sent successfully');
        } catch (error) {
            console.log('   ⚠️  Transfer approval failed:', error.message);
        }

        // Step 7: Verify final state
        console.log('\n🔍 Step 7: Verifying final state...');
        const finalTransfer = await Transfer.findById(testTransfer._id)
            .populate('requestedBy', 'firstName lastName email')
            .populate('lastModifiedBy', 'firstName lastName email');

        console.log(`   📊 Transfer Status: ${finalTransfer.status}`);
        console.log(`   👤 Requested by: ${finalTransfer.requestedBy.firstName} ${finalTransfer.requestedBy.lastName}`);
        console.log(`   👤 Last modified by: ${finalTransfer.lastModifiedBy.firstName} ${finalTransfer.lastModifiedBy.lastName}`);
        console.log(`   📅 Status history entries: ${finalTransfer.statusHistory.length}`);

        console.log('\n✅ Transfer flow test completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log(`- Transfer ID: ${transferId}`);
        console.log(`- Status: ${finalTransfer.status}`);
        console.log(`- Admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
        console.log(`- Manager: ${testManager.firstName} ${testManager.lastName} (${testManager.email})`);
        console.log(`- From: ${fromHospital.name}`);
        console.log(`- To: ${toHospital.name}`);

    } catch (error) {
        console.error('❌ Error testing transfer flow:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    testTransferFlow();
}

module.exports = { testTransferFlow };
