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
import { TransferCategory } from '@/constants/transfer-constants';

export class TransferNotificationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = new CommunicationService();
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
        
      case TransferCategory.PATIENT_FILE:
        const fileInfo = transfer.transferData?.fileInfo;
        return {
          title: fileInfo ? `Files: ${fileInfo.patientName}` : 'File Transfer',
          subtitle: fileInfo ? `${fileInfo.fileCount} ${fileInfo.fileType} files` : 'Patient Files',
          icon: '📁',
          category: 'Files',
          details: {
            patient: fileInfo?.patientName || 'Unknown',
            dossier: fileInfo?.dossierNumber || 'N/A',
            fileType: fileInfo?.fileType || 'Unknown',
            fileCount: fileInfo?.fileCount || 0,
            urgency: fileInfo?.urgency || 'medium'
          }
        };
        
      case TransferCategory.MEDICAL_EQUIPMENT:
        const equipmentInfo = transfer.transferData?.equipmentInfo;
        return {
          title: equipmentInfo ? equipmentInfo.equipmentName : 'Equipment Transfer',
          subtitle: equipmentInfo ? `${equipmentInfo.model} (${equipmentInfo.condition})` : 'Medical Equipment',
          icon: '🏥',
          category: 'Equipment',
          details: {
            name: equipmentInfo?.equipmentName || 'Unknown',
            model: equipmentInfo?.model || 'Unknown',
            condition: equipmentInfo?.condition || 'Unknown',
            serialNumber: equipmentInfo?.serialNumber || 'N/A',
            maintenanceRequired: equipmentInfo?.maintenanceRequired || false
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
        
      case TransferCategory.PATIENT_FILE:
        return `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">📁 File Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Patient:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.patient || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.dossier || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>File Type:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fileType || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>File Count:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.fileCount || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Urgency:</strong></p>
                <span style="background: ${transferData.urgency === 'urgent' ? '#ef4444' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.urgency || 'medium'}</span>
              </div>
            </div>
          </div>
        `;
        
      case TransferCategory.MEDICAL_EQUIPMENT:
        return `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">🏥 Equipment Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Equipment:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.name || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Model:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.model || 'N/A'}</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Condition:</strong></p>
                <span style="background: ${transferData.condition === 'excellent' ? '#10b981' : transferData.condition === 'good' ? '#3b82f6' : transferData.condition === 'fair' ? '#f59e0b' : '#ef4444'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${transferData.condition || 'unknown'}</span>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Serial Number:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${transferData.serialNumber || 'N/A'}</p>
              </div>
              ${transferData.maintenanceRequired ? `
              <div style="grid-column: 1 / -1;">
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-top: 8px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ Maintenance Required</p>
                </div>
              </div>
              ` : ''}
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

      // Get admin contact information
      const adminContact = await AdminService.getAdminContactInfo();
      if (!adminContact) {
        console.error('No admin contact information found');
        return;
      }

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
        requestedBy: `${requestedBy.firstName} ${requestedBy.lastName}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone,
        requestedByEmail: requestedBy.email, // For email template compatibility
        requestedByPhone: requestedBy.phone, // For email template compatibility
        notes: transfer.notes || 'No additional notes',
        // Category-specific details
        ...transferDisplayInfo.details,
        approvalUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/approve?admin=${adminContact.email}`,
        rejectionUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/transfers/${transfer._id}/reject?admin=${adminContact.email}`,
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
            
            ${this.generateCategorySpecificContent(transferData)}
            
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
    const icon = recipientType === 'manager' ? '✅' : transferData.transferIcon || '🚑';
    const actionText = recipientType === 'manager' 
      ? 'You can now track the transfer progress in your dashboard.'
      : 'Log into the system to view details and accept the transfer assignment.';
    
    // Generate category-specific content section
    const categoryContent = this.generateCategorySpecificContent(transferData);
    
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

  /**
   * Send notification when transfer is accepted by employee
   */
  async sendTransferAcceptedNotification(transfer: any, acceptedBy: any): Promise<void> {
    try {
      console.log('📧 Sending transfer accepted notifications...');

      await dbConnect();

      // Get the manager who requested the transfer
      const manager = await User.findById(transfer.requestedBy);
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
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transfer Accepted - ${transferData.transferId}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
            .transfer-details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .detail-label { font-weight: 600; color: #4b5563; }
            .detail-value { color: #1f2937; font-weight: 500; }
            .priority-urgent { color: #dc2626; font-weight: 600; }
            .priority-high { color: #ea580c; font-weight: 600; }
            .priority-medium { color: #d97706; font-weight: 600; }
            .priority-low { color: #059669; font-weight: 600; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
            .button:hover { background: #059669; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Transfer Accepted</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Transfer request has been accepted and is now in progress</p>
            </div>
            
            <div class="content">
                <div class="status-badge">ACCEPTED</div>
                
                <p>Great news! The transfer request has been accepted by an employee and is now in progress.</p>
                
                <div class="transfer-details">
                    <div class="detail-row">
                        <span class="detail-label">Transfer ID:</span>
                        <span class="detail-value">${transferData.transferId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Patient:</span>
                        <span class="detail-value">${transferData.patientName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">From Hospital:</span>
                        <span class="detail-value">${transferData.fromHospital}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">To Hospital:</span>
                        <span class="detail-value">${transferData.toHospital}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Priority:</span>
                        <span class="detail-value priority-${transferData.priority.toLowerCase()}">${transferData.priority}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Accepted By:</span>
                        <span class="detail-value">${transferData.acceptedBy}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Accepted At:</span>
                        <span class="detail-value">${transferData.acceptedAt}</span>
                    </div>
                </div>
                
                <p>The transfer is now being handled by the assigned employee. You will receive updates as the transfer progresses.</p>
                
                <p style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                    <strong>Next Steps:</strong> The assigned employee will now handle the transfer process. You can track the progress through the system dashboard.
                </p>
            </div>
            
            <div class="footer">
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    This is an automated notification from the <strong>Patient Management System</strong>.<br>
                    If you have any questions, please contact the system administrator.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

// Export singleton instance
export default new TransferNotificationService();
