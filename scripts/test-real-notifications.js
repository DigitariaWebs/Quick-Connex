#!/usr/bin/env node

/**
 * Test Real Notifications Script
 * 
 * This script creates a transfer via the actual API endpoint to trigger
 * real email and SMS notifications to the admin.
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

async function testRealNotifications() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Get test manager
        console.log('\n👤 Step 1: Getting test manager...');
        const testManagerEmail = 'arselene.tests@gmail.com';
        const testManager = await User.findOne({ email: testManagerEmail });

        if (!testManager) {
            console.log('   ❌ Test manager not found. Please run the notification test first.');
            return;
        }

        console.log(`   ✅ Test manager found: ${testManager.firstName} ${testManager.lastName}`);

        // Step 2: Get admin user
        console.log('\n👤 Step 2: Getting admin user...');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@patients-management.com';
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('   ❌ Admin user not found. Please run setup-admin.js first.');
            return;
        }

        console.log(`   ✅ Admin user found: ${admin.firstName} ${admin.lastName}`);
        console.log(`   📧 Admin email: ${admin.email}`);
        console.log(`   📱 Admin phone: ${admin.phone}`);

        // Step 3: Get hospitals
        console.log('\n🏥 Step 3: Getting hospitals...');
        const fromHospital = await Hospital.findOne({ name: 'Hôpital Notre-Dame' });
        const toHospital = await Hospital.findOne({ name: 'Hôpital Sacré-Cœur' });

        if (!fromHospital || !toHospital) {
            console.log('   ❌ Hospitals not found. Please run the notification test first.');
            return;
        }

        console.log(`   ✅ From hospital: ${fromHospital.name}`);
        console.log(`   ✅ To hospital: ${toHospital.name}`);

        // Step 4: Create transfer using the actual service
        console.log('\n🚑 Step 4: Creating transfer with real notifications...');

        // Import the transfer notification service
        const path = require('path');
        const transferNotificationPath = path.join(__dirname, '../src/lib/communication/transfer-notification-service.ts');

        try {
            // Create transfer data
            const transferId = `TRF-REAL-TEST-${Date.now()}`;
            const testTransfer = new Transfer({
                transferId: transferId,
                patientInfo: {
                    firstName: 'Jean',
                    lastName: 'Dubois',
                    age: 72,
                    dossierNumber: `REAL-TEST-${Date.now()}`
                },
                fromHospital: fromHospital._id,
                toHospital: toHospital._id,
                fromHospitalName: fromHospital.name,
                toHospitalName: toHospital.name,
                requestedBy: testManager._id,
                reason: 'Emergency transfer required - patient condition deteriorating',
                priority: 'urgent',
                status: 'pending',
                requestedDate: new Date(),
                scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                notes: 'URGENT: Patient needs immediate transfer. Family notified.',
                scheduling: {
                    transferTime: '16:00'
                },
                statusHistory: [{
                    status: 'pending',
                    changedBy: testManager._id,
                    changedAt: new Date(),
                    reason: 'Transfer created for real notification testing'
                }],
                lastModifiedBy: testManager._id
            });

            await testTransfer.save();
            console.log(`   ✅ Transfer created: ${transferId}`);

            // Populate the transfer for notifications
            const populatedTransfer = await Transfer.findById(testTransfer._id)
                .populate('requestedBy', 'firstName lastName email phone userType')
                .populate('fromHospital', 'name address')
                .populate('toHospital', 'name address');

            // Test the notification service directly
            console.log('\n📤 Step 5: Sending real notifications...');

            // Simulate the notification service call
            const adminContact = {
                email: admin.email,
                phone: admin.phone,
                name: `${admin.firstName} ${admin.lastName}`
            };

            const transferData = {
                transferId: populatedTransfer.transferId,
                patientName: `${populatedTransfer.patientInfo.firstName} ${populatedTransfer.patientInfo.lastName}`,
                patientAge: populatedTransfer.patientInfo.age,
                patientDossier: populatedTransfer.patientInfo.dossierNumber,
                fromHospital: populatedTransfer.fromHospitalName,
                toHospital: populatedTransfer.toHospitalName,
                priority: populatedTransfer.priority.toUpperCase(),
                reason: populatedTransfer.reason,
                scheduledDate: populatedTransfer.scheduledDate ? new Date(populatedTransfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
                scheduledTime: populatedTransfer.scheduling?.transferTime || 'Not specified',
                requestedBy: `${testManager.firstName} ${testManager.lastName}`,
                requestedByEmail: testManager.email,
                requestedByPhone: testManager.phone,
                notes: populatedTransfer.notes || 'No additional notes',
                approvalUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${populatedTransfer._id}/approve?admin=${admin.email}`,
                rejectionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${populatedTransfer._id}/reject?admin=${admin.email}`
            };

            // Test email notification
            console.log('   📧 Testing email notification...');
            try {
                const { CommunicationService } = require('../src/lib/communication/communication-service');
                const communicationService = new CommunicationService();

                const emailMessage = {
                    id: `transfer_request_email_${Date.now()}`,
                    channel: 'email',
                    priority: 'urgent',
                    status: 'pending',
                    recipient: {
                        email: adminContact.email,
                        name: adminContact.name
                    },
                    content: {
                        subject: `🚑 ${transferData.priority} Transfer Request - ${transferData.transferId}`,
                        text: generateEmailText(transferData),
                        html: generateEmailHTML(transferData)
                    },
                    metadata: {
                        source: 'transfer_workflow',
                        category: 'transfer_request',
                        transferId: transferData.transferId,
                        priority: transferData.priority
                    },
                    tracking: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const emailResult = await communicationService.sendEmail(emailMessage);
                if (emailResult.success) {
                    console.log('   ✅ Email notification sent successfully!');
                } else {
                    console.log('   ⚠️  Email notification failed:', emailResult.error);
                }
            } catch (emailError) {
                console.log('   ⚠️  Email service error:', emailError.message);
            }

            // Test SMS notification
            console.log('   📱 Testing SMS notification...');
            try {
                const { CommunicationService } = require('../src/lib/communication/communication-service');
                const communicationService = new CommunicationService();

                const smsMessage = {
                    id: `transfer_request_sms_${Date.now()}`,
                    channel: 'sms',
                    priority: 'urgent',
                    status: 'pending',
                    recipient: {
                        phone: adminContact.phone,
                        name: adminContact.name,
                        countryCode: '1'
                    },
                    content: {
                        text: generateSMSText(transferData)
                    },
                    metadata: {
                        source: 'transfer_workflow',
                        category: 'transfer_request',
                        transferId: transferData.transferId,
                        priority: transferData.priority
                    },
                    tracking: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const smsResult = await communicationService.sendSMS(smsMessage);
                if (smsResult.success) {
                    console.log('   ✅ SMS notification sent successfully!');
                } else {
                    console.log('   ⚠️  SMS notification failed:', smsResult.error);
                }
            } catch (smsError) {
                console.log('   ⚠️  SMS service error:', smsError.message);
            }

            // Display the action URLs
            console.log('\n🔗 Step 6: Action URLs for testing:');
            console.log('=' * 80);
            console.log('📧 APPROVAL URL:');
            console.log(transferData.approvalUrl);
            console.log('\n📧 REJECTION URL:');
            console.log(transferData.rejectionUrl);

            console.log('\n✅ Real notification test completed!');
            console.log('\n📋 Test Summary:');
            console.log(`- Transfer ID: ${transferId}`);
            console.log(`- Patient: ${transferData.patientName} (${transferData.patientAge} years)`);
            console.log(`- Priority: ${transferData.priority}`);
            console.log(`- Admin: ${admin.email} / ${admin.phone}`);
            console.log(`- Manager: ${testManager.email}`);

            console.log('\n📝 Check your email and phone for notifications!');

        } catch (error) {
            console.log('   ❌ Error creating transfer:', error.message);
        }

    } catch (error) {
        console.error('❌ Error testing real notifications:', error);
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

function generateEmailHTML(transferData) {
    const priorityColor = transferData.priority === 'URGENT' ? '#dc3545' : '#ffc107';

    return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <title>Transfer Request - ${transferData.transferId}</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${priorityColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .transfer-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid ${priorityColor}; }
          .patient-info { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .action-buttons { text-align: center; margin: 20px 0; }
          .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .btn-approve { background: #28a745; color: white; }
          .btn-reject { background: #dc3545; color: white; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>🚑 ${transferData.priority} TRANSFER REQUEST</h1>
              <p>Transfer ID: ${transferData.transferId}</p>
          </div>
          
          <div class="content">
              <div class="patient-info">
                  <h3>👤 Patient Information</h3>
                  <p><strong>Name:</strong> ${transferData.patientName}</p>
                  <p><strong>Age:</strong> ${transferData.patientAge} years</p>
                  <p><strong>Dossier Number:</strong> ${transferData.patientDossier}</p>
              </div>
              
              <div class="transfer-info">
                  <h3>🏥 Transfer Details</h3>
                  <p><strong>From:</strong> ${transferData.fromHospital}</p>
                  <p><strong>To:</strong> ${transferData.toHospital}</p>
                  <p><strong>Priority:</strong> ${transferData.priority}</p>
                  <p><strong>Reason:</strong> ${transferData.reason}</p>
                  <p><strong>Scheduled Date:</strong> ${transferData.scheduledDate}</p>
                  <p><strong>Scheduled Time:</strong> ${transferData.scheduledTime}</p>
              </div>
              
              <div class="transfer-info">
                  <h3>👤 Requested By</h3>
                  <p><strong>Name:</strong> ${transferData.requestedBy}</p>
                  <p><strong>Email:</strong> ${transferData.requestedByEmail}</p>
                  <p><strong>Phone:</strong> ${transferData.requestedByPhone}</p>
              </div>
              
              <div class="transfer-info">
                  <h3>📝 Notes</h3>
                  <p>${transferData.notes}</p>
              </div>
              
              <div class="action-buttons">
                  <a href="${transferData.approvalUrl}" class="btn btn-approve">✅ APPROVE TRANSFER</a>
                  <a href="${transferData.rejectionUrl}" class="btn btn-reject">❌ REJECT TRANSFER</a>
              </div>
              
              <p style="text-align: center; margin-top: 20px;">
                  <strong>Please review and respond to this transfer request as soon as possible.</strong>
              </p>
          </div>
          
          <div class="footer">
              <p>This is an automated notification from the Patient Management System.</p>
          </div>
      </div>
  </body>
  </html>
  `;
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
    testRealNotifications();
}

module.exports = { testRealNotifications };
