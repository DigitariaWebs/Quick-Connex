/**
 * Real Notification Service for Scripts
 * 
 * This service actually sends real emails and SMS notifications
 * for transfer requests created by scripts.
 */

const nodemailer = require('nodemailer');

class RealNotificationService {
    constructor() {
        this.transporter = null;
        this.initializeEmailService();
    }

    async initializeEmailService() {
        try {
            // Create email transporter
            this.transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.warn('⚠️ Email service initialization failed:', error.message);
            console.log('💡 Make sure SMTP credentials are configured in .env.local');
        }
    }

    async sendNewTransferRequestNotification(transfer, requestedBy) {
        try {
            console.log('📧 Sending real transfer request notifications...');

            // Get admin users (managers act as admins in this system)
            const User = require('../src/models/User');
            const admins = await User.find({ userType: 'manager', status: 'approved' });

            if (admins.length === 0) {
                console.warn('⚠️ No admin users found for notifications');
                return;
            }

            console.log(`📬 Sending notifications to ${admins.length} admin(s)`);

            // Send emails to all admins
            for (const admin of admins) {
                if (admin.email) {
                    await this.sendEmailNotification(admin, transfer, requestedBy);
                }
            }

            console.log('✅ Real notifications sent successfully!');

        } catch (error) {
            console.error('❌ Error sending real notifications:', error.message);
        }
    }

    async sendEmailNotification(admin, transfer, requestedBy) {
        try {
            if (!this.transporter) {
                console.warn('⚠️ Email service not available, skipping email to:', admin.email);
                return;
            }

            // Generate email content
            const subject = `🚨 New ${transfer.transferCategory} Transfer Request - ${transfer.transferId}`;
            const htmlContent = this.generateEmailHTML(transfer, requestedBy);
            const textContent = this.generateEmailText(transfer, requestedBy);

            // Send email
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: admin.email,
                subject: subject,
                text: textContent,
                html: htmlContent
            });

            console.log(`📧 Email sent to ${admin.firstName} ${admin.lastName} (${admin.email}): ${info.messageId}`);

        } catch (error) {
            console.error(`❌ Failed to send email to ${admin.email}:`, error.message);
        }
    }

    generateEmailHTML(transfer, requestedBy) {
        const transferDisplayInfo = this.getTransferDisplayInfo(transfer);

        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New ${transfer.transferCategory} Transfer Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">🚨 NEW ${transfer.transferCategory.toUpperCase()} TRANSFER REQUEST</h1>
            <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transfer.transferId}</strong></p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">${transferDisplayInfo.icon} ${transferDisplayInfo.category} Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Title:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferDisplayInfo.title}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Details:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferDisplayInfo.subtitle}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🏥 Transfer Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transfer.fromHospitalName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transfer.toHospitalName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                        <span style="background: ${this.getPriorityColor(transfer.priority)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transfer.priority}</span>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Scheduled:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled'}</p>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Reason:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transfer.reason}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Requested By</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${requestedBy.firstName} ${requestedBy.lastName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Email:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${requestedBy.email}</p>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Please log into the system to review and approve this transfer request.
                </p>
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

    generateEmailText(transfer, requestedBy) {
        const transferDisplayInfo = this.getTransferDisplayInfo(transfer);

        return `
NEW ${transfer.transferCategory.toUpperCase()} TRANSFER REQUEST

Transfer ID: ${transfer.transferId}
Category: ${transferDisplayInfo.category}
Title: ${transferDisplayInfo.title}
Details: ${transferDisplayInfo.subtitle}

Transfer Details:
- From: ${transfer.fromHospitalName}
- To: ${transfer.toHospitalName}
- Priority: ${transfer.priority}
- Scheduled: ${transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled'}
- Reason: ${transfer.reason}

Requested By:
- Name: ${requestedBy.firstName} ${requestedBy.lastName}
- Email: ${requestedBy.email}

Please log into the system to review and approve this transfer request.

---
This is an automated notification from the Patient Management System.
    `;
    }

    getTransferDisplayInfo(transfer) {
        const category = transfer.transferCategory || 'patient';

        switch (category) {
            case 'patient':
                const patientInfo = transfer.patientInfo || transfer.transferData?.patientInfo;
                return {
                    title: patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'Patient Transfer',
                    subtitle: patientInfo?.dossierNumber || 'Patient',
                    icon: '👤',
                    category: 'Patient'
                };

            case 'envelope':
                const envelopeInfo = transfer.transferData?.envelopeInfo;
                return {
                    title: envelopeInfo ? `Envelope: ${envelopeInfo.senderName} → ${envelopeInfo.recipientName}` : 'Envelope Transfer',
                    subtitle: envelopeInfo?.contents || 'Package/Envelope',
                    icon: '📦',
                    category: 'Envelope'
                };

            case 'patient_file':
                const fileInfo = transfer.transferData?.fileInfo;
                return {
                    title: fileInfo ? `Files: ${fileInfo.patientName}` : 'File Transfer',
                    subtitle: fileInfo ? `${fileInfo.fileCount} ${fileInfo.fileType} files` : 'Patient Files',
                    icon: '📁',
                    category: 'Files'
                };

            case 'medical_equipment':
                const equipmentInfo = transfer.transferData?.equipmentInfo;
                return {
                    title: equipmentInfo ? equipmentInfo.equipmentName : 'Equipment Transfer',
                    subtitle: equipmentInfo ? `${equipmentInfo.model} (${equipmentInfo.condition})` : 'Medical Equipment',
                    icon: '🏥',
                    category: 'Equipment'
                };

            default:
                return {
                    title: 'Transfer',
                    subtitle: 'Unknown Type',
                    icon: '❓',
                    category: 'Unknown'
                };
        }
    }

    getPriorityColor(priority) {
        switch (priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'medium': return '#3b82f6';
            case 'low': return '#10b981';
            default: return '#6b7280';
        }
    }
}

module.exports = RealNotificationService;
