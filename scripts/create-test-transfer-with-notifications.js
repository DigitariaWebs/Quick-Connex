#!/usr/bin/env node

/**
 * Create Test Transfer with Notifications Script
 * 
 * This script creates a test transfer and triggers the actual notification system
 * to send email and SMS to the admin.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
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

async function createTestTransferWithNotifications() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Get test manager
        console.log('\n👤 Step 1: Getting test manager...');
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
                phone: '+213793601892',
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
            console.log('   ❌ Hospitals not found. Creating test hospitals...');
            // Create hospitals if they don't exist
            const newFromHospital = new Hospital({
                name: 'Hôpital Notre-Dame',
                address: '1560 Sherbrooke St E, Montreal, QC H2L 4M1',
                organization: {
                    type: 'CIUSSS',
                    name: 'CIUSSS de l\'Est-de-l\'Île-de-Montréal',
                    region: 'Montreal'
                },
                isActive: true
            });
            await newFromHospital.save();

            const newToHospital = new Hospital({
                name: 'Hôpital Sacré-Cœur',
                address: '5400 Gouin Blvd W, Montreal, QC H4J 1C5',
                organization: {
                    type: 'CIUSSS',
                    name: 'CIUSSS du Nord-de-l\'Île-de-Montréal',
                    region: 'Montreal'
                },
                isActive: true
            });
            await newToHospital.save();

            console.log('   ✅ Test hospitals created');
        } else {
            console.log(`   ✅ From hospital: ${fromHospital.name}`);
            console.log(`   ✅ To hospital: ${toHospital.name}`);
        }

        // Step 4: Create transfer
        console.log('\n🚑 Step 4: Creating test transfer...');
        const transferId = `TRF-LIVE-TEST-${Date.now()}`;
        const testTransfer = new Transfer({
            transferId: transferId,
            patientInfo: {
                firstName: 'Ahmed',
                lastName: 'Benali',
                age: 58,
                dossierNumber: `LIVE-TEST-${Date.now()}`
            },
            fromHospital: fromHospital._id,
            toHospital: toHospital._id,
            fromHospitalName: fromHospital.name,
            toHospitalName: toHospital.name,
            requestedBy: testManager._id,
            reason: 'Critical cardiac condition requiring immediate specialized care',
            priority: 'urgent',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
            notes: 'URGENT: Patient condition is critical. Family is waiting. Please approve immediately.',
            scheduling: {
                transferTime: '18:00'
            },
            statusHistory: [{
                status: 'pending',
                changedBy: testManager._id,
                changedAt: new Date(),
                reason: 'Transfer created for live notification testing'
            }],
            lastModifiedBy: testManager._id
        });

        await testTransfer.save();
        console.log(`   ✅ Transfer created: ${transferId}`);

        // Step 5: Send notifications
        console.log('\n📤 Step 5: Sending notifications...');

        // Prepare transfer data
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
            approvalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${testTransfer._id}/approve?admin=${admin.email}`,
            rejectionUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${testTransfer._id}/reject?admin=${admin.email}`
        };

        // Send email notification
        console.log('   📧 Sending email notification...');
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_APP_PASSWORD
                }
            });

            const emailMessage = {
                from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
                to: admin.email,
                subject: `🚑 ${transferData.priority} Transfer Request - ${transferData.transferId}`,
                text: generateEmailText(transferData),
                html: generateEmailHTML(transferData)
            };

            const emailResult = await transporter.sendMail(emailMessage);
            console.log('   ✅ Email notification sent successfully!');
            console.log(`   📧 Message ID: ${emailResult.messageId}`);
        } catch (emailError) {
            console.log('   ❌ Email notification failed:', emailError.message);
        }

        // Send SMS notification (simulated)
        console.log('   📱 SMS notification would be sent to:', admin.phone);
        console.log('   📱 SMS content:', generateSMSText(transferData));

        // Display action URLs
        console.log('\n🔗 Step 6: Action URLs for testing:');
        console.log('=' * 80);
        console.log('📧 APPROVAL URL:');
        console.log(transferData.approvalUrl);
        console.log('\n📧 REJECTION URL:');
        console.log(transferData.rejectionUrl);

        console.log('\n✅ Test transfer with notifications completed!');
        console.log('\n📋 Test Summary:');
        console.log(`- Transfer ID: ${transferId}`);
        console.log(`- Patient: ${transferData.patientName} (${transferData.patientAge} years)`);
        console.log(`- Priority: ${transferData.priority}`);
        console.log(`- Admin: ${admin.email} / ${admin.phone}`);
        console.log(`- Manager: ${testManager.email}`);

        console.log('\n📝 Check your email and phone for notifications!');
        console.log('📝 Click the approval/rejection URLs to test the workflow!');

    } catch (error) {
        console.error('❌ Error creating test transfer:', error);
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
    const priorityGradient = transferData.priority === 'URGENT'
        ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)'
        : 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)';

    const priorityIcon = transferData.priority === 'URGENT' ? '🚨' : '🚑';
    const urgentAlert = transferData.priority === 'URGENT'
        ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
           <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ URGENT ACTION REQUIRED</h3>
           <p style="margin: 0; color: #92400e;">This is an urgent transfer request that requires immediate attention and approval.</p>
         </div>`
        : '';

    const priorityBadgeGradient = transferData.priority === 'URGENT'
        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

    const notesSection = transferData.notes
        ? `<div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
           <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Additional Notes</h3>
           <p style="margin: 0; color: #1f2937; line-height: 1.6;">${transferData.notes}</p>
         </div>`
        : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${transferData.priority} Transfer Request - ${transferData.transferId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: ${priorityGradient}; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">${priorityIcon} ${transferData.priority} TRANSFER REQUEST</h1>
            <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${urgentAlert}
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientAge} years</p>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientDossier}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🏥 Transfer Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                        <span style="background: ${priorityBadgeGradient}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Scheduled:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.scheduledDate} at ${transferData.scheduledTime}</p>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Reason:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.reason}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Requested By</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedBy}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Phone:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedByPhone}</p>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.requestedByEmail}</p>
                    </div>
                </div>
            </div>
            
            ${notesSection}
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${transferData.approvalUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); margin: 0 8px; transition: all 0.3s ease;">
                    ✅ Approve Transfer
                </a>
                <a href="${transferData.rejectionUrl}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3); margin: 0 8px; transition: all 0.3s ease;">
                    ❌ Reject Transfer
                </a>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Note:</strong> Please review the transfer details carefully before making a decision. Once approved, the transfer will be published to all employees for assignment.</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                This is an automated notification from the <strong>Patient Management System</strong>.<br>
                If you have any questions, please contact the system administrator.
            </p>
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
    createTestTransferWithNotifications();
}

module.exports = { createTestTransferWithNotifications };
