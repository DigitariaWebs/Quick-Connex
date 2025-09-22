/**
 * Transfer Notification Service
 * 
 * This service handles comprehensive notifications for the transfer workflow:
 * 1. New transfer request → Email + SMS to Admin
 * 2. Admin approval → Email + SMS to Manager + Employees
 * 3. Transfer status changes → Notifications to relevant parties
 */

import { CommunicationService } from './communication-service';
import { EmailMessage, SMSMessage } from '@/types/communication-types';
import AdminService from '@/lib/admin-service';
import User from '@/models/User';
import dbConnect from '@/lib/mongoose';

export class TransferNotificationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = new CommunicationService();
  }

  /**
   * Send comprehensive notification for new transfer request
   * This includes both email and SMS to admins
   */
  async sendNewTransferRequestNotification(transfer: any, requestedBy: any): Promise<void> {
    try {
      console.log('📧 Sending new transfer request notifications...');

      // Get admin contact information
      const adminContact = await AdminService.getAdminContactInfo();
      if (!adminContact) {
        console.error('No admin contact information found');
        return;
      }

      // Prepare transfer data for templates
      const transferData = {
        transferId: transfer.transferId,
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        patientAge: transfer.patientInfo.age,
        dossierNumber: transfer.patientInfo.dossierNumber,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        reason: transfer.reason,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
        scheduledTime: transfer.scheduling?.transferTime || 'Not specified',
        requestedBy: `${requestedBy.firstName} ${requestedBy.lastName}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone,
        notes: transfer.notes || 'No additional notes',
        approvalLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/approve?admin=${adminContact.email}`,
        rejectionLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/reject?admin=${adminContact.email}`,
        // New template variables for modern design
        priorityGradient: transfer.priority.toUpperCase() === 'URGENT' 
          ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)'
          : 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)',
        priorityIcon: transfer.priority.toUpperCase() === 'URGENT' ? '🚨' : '🚑',
        urgentAlert: transfer.priority.toUpperCase() === 'URGENT' 
          ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
               <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ URGENT ACTION REQUIRED</h3>
               <p style="margin: 0; color: #92400e;">This is an urgent transfer request that requires immediate attention and approval.</p>
             </div>`
          : '',
        priorityBadgeGradient: transfer.priority.toUpperCase() === 'URGENT' 
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        notesSection: transfer.notes 
          ? `<div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
               <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Additional Notes</h3>
               <p style="margin: 0; color: #1f2937; line-height: 1.6;">${transfer.notes}</p>
             </div>`
          : '',
      };

      // Send email notification to admin
      await this.sendTransferRequestEmail(adminContact, transferData);

      // Send SMS notification to admin
      await this.sendTransferRequestSMS(adminContact, transferData);

      console.log('✅ Transfer request notifications sent successfully');
    } catch (error) {
      console.error('❌ Error sending transfer request notifications:', error);
    }
  }

  /**
   * Send email notification for new transfer request
   */
  private async sendTransferRequestEmail(adminContact: any, transferData: any): Promise<void> {
    try {
      const emailMessage: EmailMessage = {
        id: `transfer_request_email_${Date.now()}`,
        channel: 'email',
        priority: transferData.priority === 'URGENT' ? 'urgent' : 'medium',
        status: 'pending',
        recipient: {
          email: adminContact.email,
          name: adminContact.name
        },
        content: {
          subject: `🚑 ${transferData.priority} Transfer Request - ${transferData.transferId}`,
          text: this.generateTransferRequestEmailText(transferData),
          html: this.generateTransferRequestEmailHTML(transferData)
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

      const result = await this.communicationService.sendEmail(emailMessage);
      if (result.success) {
        console.log(`📧 Transfer request email sent to admin: ${adminContact.email}`);
      } else {
        console.error(`❌ Failed to send transfer request email:`, result.error);
      }
    } catch (error) {
      console.error('❌ Error sending transfer request email:', error);
    }
  }

  /**
   * Send SMS notification for new transfer request
   */
  private async sendTransferRequestSMS(adminContact: any, transferData: any): Promise<void> {
    try {
      const smsMessage: SMSMessage = {
        id: `transfer_request_sms_${Date.now()}`,
        channel: 'sms',
        priority: transferData.priority === 'URGENT' ? 'urgent' : 'medium',
        status: 'pending',
        recipient: {
          phone: adminContact.phone,
          name: adminContact.name,
          countryCode: '1'
        },
        content: {
          text: this.generateTransferRequestSMSText(transferData)
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

      const result = await this.communicationService.sendSMS(smsMessage);
      if (result.success) {
        console.log(`📱 Transfer request SMS sent to admin: ${adminContact.phone}`);
      } else {
        console.error(`❌ Failed to send transfer request SMS:`, result.error);
      }
    } catch (error) {
      console.error('❌ Error sending transfer request SMS:', error);
    }
  }

  /**
   * Send notification when transfer is approved by admin
   */
  async sendTransferApprovedNotification(transfer: any, approvedBy: any): Promise<void> {
    try {
      console.log('📧 Sending transfer approved notifications...');

      await dbConnect();

      // Get the manager who requested the transfer
      const manager = await User.findById(transfer.requestedBy);
      if (!manager) {
        console.error('Manager not found for transfer approval notification');
        return;
      }

      // Get all employees
      const employees = await User.find({ userType: 'employee', status: 'approved' });

      const transferData = {
        transferId: transfer.transferId,
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        approvedBy: `${approvedBy.firstName} ${approvedBy.lastName}`,
        approvedAt: new Date().toLocaleString()
      };

      // Send notification to manager
      await this.sendTransferApprovedToManager(manager, transferData);

      // Send notification to all employees
      for (const employee of employees) {
        await this.sendTransferApprovedToEmployee(employee, transferData);
      }

      console.log(`✅ Transfer approved notifications sent to manager and ${employees.length} employees`);
    } catch (error) {
      console.error('❌ Error sending transfer approved notifications:', error);
    }
  }

  /**
   * Send transfer approved notification to manager
   */
  private async sendTransferApprovedToManager(manager: any, transferData: any): Promise<void> {
    try {
      // Send email
      const emailMessage: EmailMessage = {
        id: `transfer_approved_manager_email_${Date.now()}`,
        channel: 'email',
        priority: 'medium',
        status: 'pending',
        recipient: {
          email: manager.email,
          name: `${manager.firstName} ${manager.lastName}`
        },
        content: {
          subject: `✅ Transfer Approved - ${transferData.transferId}`,
          text: this.generateTransferApprovedEmailText(transferData, 'manager'),
          html: this.generateTransferApprovedEmailHTML(transferData, 'manager')
        },
        metadata: {
          source: 'transfer_workflow',
          category: 'transfer_approved',
          transferId: transferData.transferId,
          recipientType: 'manager'
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      // Send SMS if phone number available
      if (manager.phone) {
        const smsMessage: SMSMessage = {
          id: `transfer_approved_manager_sms_${Date.now()}`,
          channel: 'sms',
          priority: 'medium',
          status: 'pending',
          recipient: {
            phone: manager.phone,
            name: `${manager.firstName} ${manager.lastName}`,
            countryCode: '1'
          },
          content: {
            text: `✅ Transfer ${transferData.transferId} approved! Patient: ${transferData.patientName}, From: ${transferData.fromHospital} to ${transferData.toHospital}`
          },
          metadata: {
            source: 'transfer_workflow',
            category: 'transfer_approved',
            transferId: transferData.transferId,
            recipientType: 'manager'
          },
          tracking: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendSMS(smsMessage);
      }
    } catch (error) {
      console.error('❌ Error sending transfer approved notification to manager:', error);
    }
  }

  /**
   * Send transfer approved notification to employee
   */
  private async sendTransferApprovedToEmployee(employee: any, transferData: any): Promise<void> {
    try {
      // Send email
      const emailMessage: EmailMessage = {
        id: `transfer_approved_employee_email_${Date.now()}_${employee._id}`,
        channel: 'email',
        priority: 'medium',
        status: 'pending',
        recipient: {
          email: employee.email,
          name: `${employee.firstName} ${employee.lastName}`
        },
        content: {
          subject: `🚑 New Transfer Available - ${transferData.transferId}`,
          text: this.generateTransferApprovedEmailText(transferData, 'employee'),
          html: this.generateTransferApprovedEmailHTML(transferData, 'employee')
        },
        metadata: {
          source: 'transfer_workflow',
          category: 'transfer_approved',
          transferId: transferData.transferId,
          recipientType: 'employee'
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      // Send SMS if phone number available
      if (employee.phone) {
        const smsMessage: SMSMessage = {
          id: `transfer_approved_employee_sms_${Date.now()}_${employee._id}`,
          channel: 'sms',
          priority: 'medium',
          status: 'pending',
          recipient: {
            phone: employee.phone,
            name: `${employee.firstName} ${employee.lastName}`,
            countryCode: '1'
          },
          content: {
            text: `🚑 New transfer available! ${transferData.transferId} - ${transferData.patientName} from ${transferData.fromHospital} to ${transferData.toHospital}`
          },
          metadata: {
            source: 'transfer_workflow',
            category: 'transfer_approved',
            transferId: transferData.transferId,
            recipientType: 'employee'
          },
          tracking: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendSMS(smsMessage);
      }
    } catch (error) {
      console.error('❌ Error sending transfer approved notification to employee:', error);
    }
  }

  /**
   * Generate email text for transfer request
   */
  private generateTransferRequestEmailText(transferData: any): string {
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

  /**
   * Generate email HTML for transfer request
   */
  private generateTransferRequestEmailHTML(transferData: any): string {
    const priorityGradient = transferData.priority === 'URGENT' 
      ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)'
      : 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)';
    
    const priorityIcon = transferData.priority === 'URGENT' ? '🚨' : '🚑';
    const priorityText = transferData.priority === 'URGENT' ? 'URGENT TRANSFER REQUEST' : 'TRANSFER REQUEST';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${priorityText} - ${transferData.transferId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: ${priorityGradient}; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">${priorityIcon} ${priorityText}</h1>
            <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${transferData.priority === 'URGENT' ? `
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ URGENT ACTION REQUIRED</h3>
                <p style="margin: 0; color: #92400e;">This is an urgent transfer request that requires immediate attention and approval.</p>
            </div>
            ` : ''}
            
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
                        <span style="background: ${transferData.priority === 'URGENT' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
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
            
            ${transferData.notes ? `
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Additional Notes</h3>
                <p style="margin: 0; color: #1f2937; line-height: 1.6;">${transferData.notes}</p>
            </div>
            ` : ''}
            
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

  /**
   * Generate SMS text for transfer request
   */
  private generateTransferRequestSMSText(transferData: any): string {
    return `🚑 ${transferData.priority} TRANSFER REQUEST
ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge}y)
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Requested by: ${transferData.requestedBy}
Approve: ${transferData.approvalUrl}
Reject: ${transferData.rejectionUrl}`;
  }

  /**
   * Generate email text for transfer approved
   */
  private generateTransferApprovedEmailText(transferData: any, recipientType: string): string {
    const title = recipientType === 'manager' ? 'Transfer Approved' : 'New Transfer Available';
    const message = recipientType === 'manager' 
      ? 'Your transfer request has been approved by the administrator.'
      : 'A new transfer has been approved and is now available for assignment.';
    
    return `
${title} - ${transferData.transferId}

${message}

Transfer Details:
- Patient: ${transferData.patientName}
- From: ${transferData.fromHospital}
- To: ${transferData.toHospital}
- Priority: ${transferData.priority}
- Approved by: ${transferData.approvedBy}
- Approved at: ${transferData.approvedAt}

Please log into the system to view full details and take appropriate action.
    `.trim();
  }

  /**
   * Generate email HTML for transfer approved
   */
  private generateTransferApprovedEmailHTML(transferData: any, recipientType: string): string {
    const title = recipientType === 'manager' ? 'Transfer Approved' : 'New Transfer Available';
    const message = recipientType === 'manager' 
      ? 'Your transfer request has been approved by the administrator.'
      : 'A new transfer has been approved and is now available for assignment.';
    const icon = recipientType === 'manager' ? '✅' : '🚑';
    const actionText = recipientType === 'manager' 
      ? 'You can now track the transfer progress in your dashboard.'
      : 'Log into the system to view details and accept the transfer assignment.';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${transferData.transferId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">${icon} ${title}</h1>
            <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #22c55e; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #22c55e;">
                <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 18px; font-weight: 600;">🎉 Great News!</h3>
                <p style="margin: 0; color: #166534;">${message}</p>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📋 Transfer Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Patient:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                        <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Approved by:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.approvedBy}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Approved at:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.approvedAt}</p>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
                    🏠 Go to Dashboard
                </a>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Next Steps:</strong> ${actionText}</p>
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

  /**
   * Generate email HTML for transfer rejected
   */
  private generateTransferRejectedEmailHTML(transferData: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transfer Rejected - ${transferData.transferId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">❌ Transfer Rejected</h1>
            <p style="color: #1f2937; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Transfer ID: <strong>${transferData.transferId}</strong></p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: 1px solid #ef4444; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 18px; font-weight: 600;">⚠️ Transfer Request Rejected</h3>
                <p style="margin: 0; color: #991b1b;">We regret to inform you that your transfer request has been rejected by the administrator.</p>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📋 Transfer Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Patient:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Priority:</strong></p>
                        <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.priority}</span>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>From Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fromHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>To Hospital:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.toHospital}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Rejected by:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.rejectedBy}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Rejected at:</strong></p>
                        <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.rejectedAt}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📝 Rejection Reason</h3>
                <p style="margin: 0; color: #1f2937; line-height: 1.6; font-style: italic;">"${transferData.rejectionReason}"</p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/transfers" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(107, 114, 128, 0.3); transition: all 0.3s ease;">
                    📋 View All Transfers
                </a>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0 0 0; border-left: 4px solid #64748b;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;"><strong>Need Help?</strong> If you have any questions about this rejection or need to resubmit the request, please contact the system administrator for assistance.</p>
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
}

// Export singleton instance
export default new TransferNotificationService();
