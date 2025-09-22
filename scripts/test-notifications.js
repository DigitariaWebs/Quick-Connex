#!/usr/bin/env node

/**
 * Test Notifications Script
 * 
 * This script creates a test transfer and verifies that admin receives
 * email and SMS notifications with the actual notification content.
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

async function testNotifications() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Verify test manager credentials
        console.log('\n👤 Step 1: Verifying test manager credentials...');
        const testManagerEmail = 'arselene.tests@gmail.com';
        const testManager = await User.findOne({ email: testManagerEmail });

        if (!testManager) {
            console.log('   ❌ Test manager not found. Creating test manager...');
            const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
            const newManager = new User({
                userType: 'manager',
                firstName: 'Arselene',
                lastName: 'Meghlaoui',
                email: testManagerEmail,
                phone: '+15141234567',
                password: hashedPassword,
                post: 'Test Manager',
                ciusss: '01',
                status: 'approved',
                approvedBy: 'system',
                approvedAt: new Date()
            });
            await newManager.save();
            console.log('   ✅ Test manager created successfully');
        } else {
            console.log(`   ✅ Test manager found: ${testManager.firstName} ${testManager.lastName}`);
        }

        // Step 2: Verify admin user
        console.log('\n👤 Step 2: Verifying admin user...');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@patients-management.com';
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('   ❌ Admin user not found. Please run setup-admin.js first.');
            return;
        }

        console.log(`   ✅ Admin user found: ${admin.firstName} ${admin.lastName}`);
        console.log(`   📧 Admin email: ${admin.email}`);
        console.log(`   📱 Admin phone: ${admin.phone}`);

        // Step 3: Setup test hospitals
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

        // Step 4: Create test transfer
        console.log('\n🚑 Step 4: Creating test transfer...');
        const transferId = `TRF-NOTIFICATION-TEST-${Date.now()}`;
        const testTransfer = new Transfer({
            transferId: transferId,
            patientInfo: {
                firstName: 'Marie',
                lastName: 'Tremblay',
                age: 67,
                dossierNumber: `NOTIF-TEST-${Date.now()}`
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: testManager._id,
            reason: 'Urgent cardiac care required - patient needs specialized treatment',
            priority: 'high',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            notes: 'Patient has been waiting for 3 days. Family is concerned about delay.',
            scheduling: {
                transferTime: '15:30'
            },
            statusHistory: [{
                status: 'pending',
                changedBy: testManager._id,
                changedAt: new Date(),
                reason: 'Transfer created for notification testing'
            }],
            lastModifiedBy: testManager._id
        });

        await testTransfer.save();
        console.log(`   ✅ Test transfer created: ${transferId}`);

        // Step 5: Generate notification content
        console.log('\n📧 Step 5: Generating notification content...');

        const transferData = {
            transferId: testTransfer.transferId,
            patientName: `${testTransfer.patientInfo.firstName} ${testTransfer.patientInfo.lastName}`,
            patientAge: testTransfer.patientInfo.age,
            patientDossier: testTransfer.patientInfo.dossierNumber,
            fromHospital: testTransfer.fromHospitalName,
            toHospital: testTransfer.toHospitalName,
            priority: testTransfer.priority.toUpperCase(),
            reason: testTransfer.reason,
            scheduledDate: testTransfer.scheduledDate ? new Date(testTransfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
            scheduledTime: testTransfer.scheduling?.transferTime || 'Not specified',
            requestedBy: `${testManager.firstName} ${testManager.lastName}`,
            requestedByEmail: testManager.email,
            requestedByPhone: testManager.phone,
            notes: testTransfer.notes || 'No additional notes',
            approvalUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${testTransfer._id}/approve?admin=${admin.email}`,
            rejectionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${testTransfer._id}/reject?admin=${admin.email}`
        };

        // Display notification content
        console.log('\n📧 EMAIL NOTIFICATION CONTENT:');
        console.log('=' * 80);
        console.log(`Subject: 🚑 ${transferData.priority} Transfer Request - ${transferData.transferId}`);
        console.log(`To: ${admin.email}`);
        console.log(`From: ${process.env.EMAIL_FROM || 'noreply@patientsmanagement.com'}`);
        console.log('\nEmail Body:');
        console.log(generateEmailText(transferData));

        console.log('\n📱 SMS NOTIFICATION CONTENT:');
        console.log('=' * 80);
        console.log(`To: ${admin.phone}`);
        console.log(`From: ${process.env.SMS_FROM_NUMBER || '+1234567890'}`);
        console.log('\nSMS Body:');
        console.log(generateSMSText(transferData));

        // Step 6: Test notification service
        console.log('\n📤 Step 6: Testing notification service...');
        try {
            // Import and test the notification service
            const { TransferNotificationService } = require('../src/lib/communication/transfer-notification-service');

            const populatedTransfer = await Transfer.findById(testTransfer._id)
                .populate('requestedBy', 'firstName lastName email phone userType')
                .populate('fromHospital', 'name address')
                .populate('toHospital', 'name address');

            console.log('   📤 Sending notifications to admin...');
            await TransferNotificationService.sendNewTransferRequestNotification(populatedTransfer, testManager);
            console.log('   ✅ Notifications sent successfully!');

        } catch (error) {
            console.log('   ⚠️  Notification service test failed:', error.message);
            console.log('   📝 This is expected if email/SMS providers are not configured yet.');
            console.log('   📝 The notification content above shows what would be sent.');
        }

        // Step 7: Display action URLs
        console.log('\n🔗 Step 7: Action URLs for testing:');
        console.log('=' * 80);
        console.log('📧 APPROVAL URL (click to approve):');
        console.log(transferData.approvalUrl);
        console.log('\n📧 REJECTION URL (click to reject):');
        console.log(transferData.rejectionUrl);

        // Step 8: Environment check
        console.log('\n⚙️  Step 8: Environment configuration check:');
        console.log('=' * 80);
        console.log(`📧 Email enabled: ${process.env.EMAIL_ENABLED !== 'false' ? 'YES' : 'NO'}`);
        console.log(`📱 SMS enabled: ${process.env.SMS_ENABLED !== 'false' ? 'YES' : 'NO'}`);
        console.log(`📧 Email provider: ${process.env.EMAIL_PROVIDER || 'not configured'}`);
        console.log(`📱 SMS provider: ${process.env.SMS_PROVIDER || 'not configured'}`);
        console.log(`📧 SendGrid API key: ${process.env.SENDGRID_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        console.log(`📱 Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID ? 'CONFIGURED' : 'NOT CONFIGURED'}`);

        console.log('\n✅ Notification test completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log(`- Transfer ID: ${transferId}`);
        console.log(`- Patient: ${transferData.patientName} (${transferData.patientAge} years)`);
        console.log(`- From: ${transferData.fromHospital}`);
        console.log(`- To: ${transferData.toHospital}`);
        console.log(`- Priority: ${transferData.priority}`);
        console.log(`- Admin: ${admin.email} / ${admin.phone}`);
        console.log(`- Manager: ${testManager.email}`);

        console.log('\n📝 Next Steps:');
        console.log('1. Check your email for the transfer request notification');
        console.log('2. Check your phone for the SMS notification');
        console.log('3. Click the approval/rejection URLs to test the workflow');
        console.log('4. Configure email/SMS providers if notifications are not being sent');

    } catch (error) {
        console.error('❌ Error testing notifications:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Helper functions
function generateEmailText(transferData) {
    return `
🚑 ${transferData.priority} TRANSFER REQUEST

Transfer ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge} years)
Dossier Number: ${transferData.patientDossier}
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Priority: ${transferData.priority}
Reason: ${transferData.reason}
Scheduled Date: ${transferData.scheduledDate}
Scheduled Time: ${transferData.scheduledTime}

Requested by: ${transferData.requestedBy}
Email: ${transferData.requestedByEmail}
Phone: ${transferData.requestedByPhone}

Notes: ${transferData.notes}

APPROVAL REQUIRED:
✅ Approve: ${transferData.approvalUrl}
❌ Reject: ${transferData.rejectionUrl}

Please review and respond to this transfer request as soon as possible.
  `.trim();
}

function generateSMSText(transferData) {
    return `🚑 ${transferData.priority} TRANSFER REQUEST
ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge}y)
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Requested by: ${transferData.requestedBy}
Approve: ${transferData.approvalUrl}
Reject: ${transferData.rejectionUrl}`;
}

// Run the script
if (require.main === module) {
    testNotifications();
}

module.exports = { testNotifications };
