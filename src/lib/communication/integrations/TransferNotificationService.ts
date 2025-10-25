/**
 * Transfer Notification Service
 * 
 * This service handles comprehensive notifications for the transfer workflow:
 * 1. New transfer request → Email + SMS to Admin
 * 2. Admin approval → Email + SMS to Manager + Employees
 * 3. Transfer status changes → Notifications to relevant parties
 */

import { CommunicationService } from '../core/CommunicationService';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import Transfer from '@/models/Transfer';
import { EmailMessage, SMSMessage } from '../core/types';
import { TransferCategory } from '@/constants/transfer';
import TemplateLoader from '@/lib/templates/template-loader';

export class TransferNotificationService {
  private communicationService: CommunicationService;
  private templateLoader: TemplateLoader;

  constructor() {
    this.communicationService = CommunicationService.getInstance();
    this.templateLoader = TemplateLoader.getInstance();
  }

  /**
   * Extract transfer display information based on transfer category
   */
  private getTransferDisplayInfo(transfer: any) {
    const category = transfer.transferCategory || TransferCategory.PATIENT;
    
    switch (category) {
      case TransferCategory.PATIENT:
        const patientInfo = transfer.patientInfo || transfer.transferData?.patientInfo;
        return {
          title: patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'Patient Transfer',
          subtitle: patientInfo?.dossierNumber || 'Patient',
          icon: '👤',
          category: 'Patient',
          details: {
            name: patientInfo ? `${patientInfo.firstName} ${patientInfo.lastName}` : 'Patient',
            age: patientInfo?.age ? `${patientInfo.age} years old` : 'Age not specified',
            dossier: patientInfo?.dossierNumber || 'N/A'
          }
        };
        
      case TransferCategory.ENVELOPE:
        const envelopeInfo = transfer.transferData?.envelopeInfo;
        return {
          title: envelopeInfo ? `Envelope: ${envelopeInfo.senderName} → ${envelopeInfo.recipientName}` : 'Envelope Transfer',
          subtitle: envelopeInfo?.contents || 'Package/Envelope',
          icon: '📦',
          category: 'Envelope',
          details: {
            sender: envelopeInfo?.senderName || 'Unknown',
            recipient: envelopeInfo?.recipientName || 'Unknown',
            contents: envelopeInfo?.contents || 'Package contents',
            weight: envelopeInfo?.weight ? `${envelopeInfo.weight}kg` : 'Weight not specified'
          }
        };
        
        
      default:
        return {
          title: 'Transfer',
          subtitle: 'Unknown Type',
          icon: '❓',
          category: 'Unknown',
          details: {
            name: 'Unknown Transfer',
            type: 'Unknown'
          }
        };
    }
  }

  /**
   * Generate category-specific content for email templates
   */
  private generateCategorySpecificContent(transferData: any): string {
    const category = transferData.transferCategory || TransferCategory.PATIENT;
    
    switch (category) {
      case TransferCategory.PATIENT:
        return `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientName}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patientAge}</p>
              </div>
              <div style="grid-column: 1 / -1;">
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.dossierNumber}</p>
              </div>
            </div>
          </div>
        `;
        
      case TransferCategory.ENVELOPE:
        return `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📦 Envelope Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Sender:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.sender || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Recipient:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.recipient || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Contents:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.contents || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Weight:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.weight || 'N/A'}</p>
              </div>
            </div>
          </div>
        `;
        
        
      default:
        return `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #6b7280;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">❓ Transfer Information</h3>
            <p style="margin: 0; color: #1f2937;">Transfer details not available.</p>
          </div>
        `;
    }
  }

  /**
   * Send comprehensive notification for new transfer request
   * This includes both email and SMS to admins
   */
  async sendNewTransferRequestNotification(transfer: any, requestedBy: any): Promise<void> {
    try {
      console.log('📧 Sending new transfer request notifications...');

      // Get admin contact information from environment variables
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
      const adminName = process.env.ADMIN_NAME || process.env.EMAIL_FROM_NAME || 'System Administrator';
      const adminPhone = process.env.ADMIN_PHONE || '+15140000000';
      
      
      if (!adminEmail) {
        console.error('❌ Admin email not configured. Please set ADMIN_EMAIL environment variable.');
        return;
      }
      
      const adminContact = {
        email: adminEmail,
        phone: adminPhone,
        name: adminName
      };

      // Get transfer display information
      const transferDisplayInfo = this.getTransferDisplayInfo(transfer);

      // Prepare transfer data for templates
      const transferData = {
        transferId: transfer.transferId,
        transferCategory: transfer.transferCategory || TransferCategory.PATIENT,
        transferTitle: transferDisplayInfo.title,
        transferSubtitle: transferDisplayInfo.subtitle,
        transferIcon: transferDisplayInfo.icon,
        transferCategoryName: transferDisplayInfo.category,
        // Legacy fields for backward compatibility
        patientName: transferDisplayInfo.details.name,
        patientAge: transferDisplayInfo.details.age || 'N/A',
        dossierNumber: transferDisplayInfo.details.dossier || 'N/A',
        patientDossier: transferDisplayInfo.details.dossier || 'N/A', // For email template compatibility
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        reason: transfer.reason,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
        scheduledTime: transfer.scheduling?.transferTime || 'Not specified',
        requestedBy: `${requestedBy.firstName || 'Unknown'} ${requestedBy.lastName || 'User'}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone || 'Not provided',
        requestedByEmail: requestedBy.email, // For email template compatibility
        requestedByPhone: requestedBy.phone || 'Not provided', // For email template compatibility
        notes: transfer.notes || 'No additional notes',
        // Category-specific details
        ...transferDisplayInfo.details,
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

      // DatabaseService handles connection automatically

      // Get the manager who requested the transfer
      const manager = await DatabaseService.findById(User, transfer.requestedBy.toString());
      if (!manager) {
        console.error('Manager not found for transfer approval notification');
        return;
      }

      // Get all employees
      const employees = await DatabaseService.findMany(User, { userType: 'employee', status: 'approved' });

      const transferData = {
        transferId: transfer.transferId,
        patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
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

Please log into the admin dashboard to review and approve/reject this transfer request.
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
    const priorityBadgeGradient = transferData.priority === 'URGENT' 
      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

    const templateData = {
      ...transferData,
      priorityGradient,
      priorityIcon,
      priorityText,
      priorityBadgeGradient,
      isUrgent: transferData.priority === 'URGENT',
      categorySpecificContent: this.generateCategorySpecificContent(transferData)
    };

    return this.templateLoader.renderTemplate('email/transfer/request.html', templateData);
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
Requested by: ${transferData.requestedBy}`;
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
    const icon = recipientType === 'manager' ? '✅' : transferData.transferIcon || '🚑';
    const actionText = recipientType === 'manager' 
      ? 'You can now track the transfer progress in your dashboard.'
      : 'Log into the system to view details and accept the transfer assignment.';
    
    const templateData = {
      ...transferData,
      title,
      message,
      icon,
      actionText,
      dashboardUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/dashboard`
    };

    return this.templateLoader.renderTemplate('email/transfer/approved.html', templateData);
  }

  /**
   * Send notification when transfer is accepted by employee
   */
  async sendTransferAcceptedNotification(transfer: any, acceptedBy: any): Promise<void> {
    try {
      console.log('📧 Sending transfer accepted notifications...');

      // DatabaseService handles connection automatically

      // Get the manager who requested the transfer
      const manager = await DatabaseService.findById(User, transfer.requestedBy.toString());
      if (!manager) {
        console.error('Manager not found for transfer acceptance notification');
        return;
      }

      const transferData = {
        transferId: transfer.transferId,
        patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        acceptedBy: `${acceptedBy.firstName} ${acceptedBy.lastName}`,
        acceptedAt: new Date().toLocaleString()
      };

      // Send notification to manager
      await this.sendTransferAcceptedToManager(manager, transferData);

      console.log(`✅ Transfer accepted notifications sent to manager`);
    } catch (error) {
      console.error('❌ Error sending transfer accepted notifications:', error);
    }
  }

  /**
   * Send transfer accepted notification to manager
   */
  private async sendTransferAcceptedToManager(manager: any, transferData: any): Promise<void> {
    try {
      // Send email
      const emailMessage: EmailMessage = {
        id: `transfer_accepted_manager_email_${Date.now()}`,
        channel: 'email',
        priority: 'medium',
        status: 'pending',
        recipient: {
          email: manager.email,
          name: `${manager.firstName} ${manager.lastName}`
        },
        content: {
          subject: `✅ Transfer Accepted - ${transferData.transferId}`,
          text: this.generateTransferAcceptedEmailText(transferData, 'manager'),
          html: this.generateTransferAcceptedEmailHTML(transferData, 'manager')
        },
        metadata: {
          source: 'transfer_workflow',
          category: 'transfer_accepted',
          transferId: transferData.transferId,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendEmail(emailMessage);

      // Send SMS if phone number available
      if (manager.phone) {
        const smsMessage: SMSMessage = {
          id: `transfer_accepted_manager_sms_${Date.now()}`,
          channel: 'sms',
          priority: 'medium',
          status: 'pending',
          recipient: {
            phone: manager.phone,
            name: `${manager.firstName} ${manager.lastName}`,
            countryCode: '1'
          },
          content: {
            text: `✅ Transfer ${transferData.transferId} accepted by ${transferData.acceptedBy}! Patient: ${transferData.patientName}, From: ${transferData.fromHospital} to ${transferData.toHospital}`
          },
          metadata: {
            source: 'transfer_workflow',
            category: 'transfer_accepted',
            transferId: transferData.transferId,
          },
          tracking: {},
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendSMS(smsMessage);
      }

      console.log(`✅ Transfer accepted notification sent to manager: ${manager.email}`);
    } catch (error) {
      console.error('❌ Error sending transfer accepted notification to manager:', error);
    }
  }

  /**
   * Generate transfer accepted email text for manager
   */
  private generateTransferAcceptedEmailText(transferData: any, recipient: string): string {
    return `
Transfer Accepted - ${transferData.transferId}

Dear ${recipient === 'manager' ? 'Manager' : 'Employee'},

Great news! The transfer request has been accepted by an employee and is now in progress.

Transfer Details:
- Transfer ID: ${transferData.transferId}
- Patient: ${transferData.patientName}
- From: ${transferData.fromHospital}
- To: ${transferData.toHospital}
- Priority: ${transferData.priority}
- Accepted By: ${transferData.acceptedBy}
- Accepted At: ${transferData.acceptedAt}

The transfer is now being handled by the assigned employee. You will receive updates as the transfer progresses.

Thank you for using the Patient Management System.

Best regards,
Patient Management System
    `.trim();
  }

  /**
   * Generate transfer accepted email HTML for manager
   */
  private generateTransferAcceptedEmailHTML(transferData: any, recipient: string): string {
    const templateData = {
      ...transferData,
      priorityLower: transferData.priority.toLowerCase()
    };

    return this.templateLoader.renderTemplate('email/transfer/accepted.html', templateData);
  }
}

// Export singleton instance
export default new TransferNotificationService();
