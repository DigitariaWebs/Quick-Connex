/**
 * Transfer SMS Service
 * 
 * This service handles SMS notifications for the transfer workflow:
 * 1. New transfer request → SMS to Admin
 * 2. Transfer approved → SMS to Manager + Employees
 * 3. Transfer accepted → SMS to Manager
 * 4. Transfer completed → SMS to Manager
 */

import { CommunicationService } from '../core/CommunicationService';
import { SMSMessage } from '../core/types';
import User from '@/models/User';
import { Types } from 'mongoose';
import { TransferCategory } from '@/constants/transfer';

export class TransferSMSService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = CommunicationService.getInstance();
  }

  /**
   * Get transfer display information for SMS
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
   * Send SMS for new transfer request
   */
  async sendNewTransferRequestSMS(transfer: any, requestedBy: any): Promise<void> {
    try {
      console.log('📱 Sending new transfer request SMS...');

      // Get admin contact information from environment variables
      const adminPhone = process.env.ADMIN_PHONE || '+15140000000';
      const adminName = process.env.ADMIN_NAME || 'System Administrator';
      
      if (!adminPhone) {
        console.error('❌ Admin phone not configured. Please set ADMIN_PHONE environment variable.');
        return;
      }

      // Get transfer display information
      const transferDisplayInfo = this.getTransferDisplayInfo(transfer);

      // Prepare transfer data for SMS
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
        patientDossier: transferDisplayInfo.details.dossier || 'N/A', // For SMS template compatibility
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        reason: transfer.reason,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
        scheduledTime: transfer.scheduling?.transferTime || 'Not specified',
        requestedBy: `${requestedBy.firstName || 'Unknown'} ${requestedBy.lastName || 'User'}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone || 'Not provided',
        requestedByEmail: requestedBy.email, // For SMS template compatibility
        requestedByPhone: requestedBy.phone || 'Not provided', // For SMS template compatibility
        notes: transfer.notes || 'No additional notes',
        // Category-specific details
        ...transferDisplayInfo.details,
        // New template variables for modern design
        priorityIcon: transfer.priority.toUpperCase() === 'URGENT' ? '🚨' : '🚑',
        urgentAlert: transfer.priority.toUpperCase() === 'URGENT' 
          ? `⚠️ URGENT ACTION REQUIRED - This is an urgent transfer request that requires immediate attention and approval.`
          : '',
      };

      // Send SMS notification to admin
      await this.sendTransferRequestSMS(adminPhone, adminName, transferData);

      console.log('✅ Transfer request SMS sent successfully');
    } catch (error) {
      console.error('❌ Error sending transfer request SMS:', error);
    }
  }

  /**
   * Send urgent transfer request SMS
   */
  async sendUrgentTransferRequestSMS(transfer: any, requestedBy: any): Promise<void> {
    try {
      console.log('🚨 Sending URGENT transfer request SMS...');

      // Get admin contact information from environment variables
      const adminPhone = process.env.ADMIN_PHONE || '+15140000000';
      const adminName = process.env.ADMIN_NAME || 'System Administrator';
      
      if (!adminPhone) {
        console.error('❌ Admin phone not configured. Please set ADMIN_PHONE environment variable.');
        return;
      }

      // Get transfer display information
      const transferDisplayInfo = this.getTransferDisplayInfo(transfer);

      // Prepare urgent transfer data for SMS
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
        patientDossier: transferDisplayInfo.details.dossier || 'N/A', // For SMS template compatibility
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: 'URGENT',
        reason: transfer.reason,
        scheduledDate: transfer.scheduledDate ? new Date(transfer.scheduledDate).toLocaleDateString() : 'Not scheduled',
        scheduledTime: transfer.scheduling?.transferTime || 'Not specified',
        requestedBy: `${requestedBy.firstName || 'Unknown'} ${requestedBy.lastName || 'User'}`,
        requestorEmail: requestedBy.email,
        requestorPhone: requestedBy.phone || 'Not provided',
        requestedByEmail: requestedBy.email, // For SMS template compatibility
        requestedByPhone: requestedBy.phone || 'Not provided', // For SMS template compatibility
        notes: transfer.notes || 'No additional notes',
        // Category-specific details
        ...transferDisplayInfo.details,
        // New template variables for modern design
        priorityIcon: '🚨',
        urgentAlert: `⚠️ URGENT ACTION REQUIRED - This is an urgent transfer request that requires immediate attention and approval.`,
      };

      // Send urgent SMS notification to admin
      await this.sendUrgentTransferRequestSMSInternal(adminPhone, adminName, transferData);

      console.log('✅ URGENT transfer request SMS sent successfully');
    } catch (error) {
      console.error('❌ Error sending URGENT transfer request SMS:', error);
    }
  }

  /**
   * Send SMS for transfer request
   */
  private async sendTransferRequestSMS(adminPhone: string, adminName: string, transferData: any): Promise<void> {
    try {
      const smsMessage: SMSMessage = {
        id: `transfer_request_sms_${Date.now()}`,
        channel: 'sms',
        priority: transferData.priority === 'URGENT' ? 'urgent' : 'medium',
        status: 'pending',
        recipient: {
          phone: adminPhone,
          name: adminName,
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
        console.log(`📱 Transfer request SMS sent to admin: ${adminPhone}`);
      } else {
        console.error(`❌ Failed to send transfer request SMS:`, result.error);
      }
    } catch (error) {
      console.error('❌ Error sending transfer request SMS:', error);
    }
  }

  /**
   * Send urgent SMS for transfer request
   */
  private async sendUrgentTransferRequestSMSInternal(adminPhone: string, adminName: string, transferData: any): Promise<void> {
    try {
      const smsMessage: SMSMessage = {
        id: `urgent_transfer_request_sms_${Date.now()}`,
        channel: 'sms',
        priority: 'urgent',
        status: 'pending',
        recipient: {
          phone: adminPhone,
          name: adminName,
          countryCode: '1'
        },
        content: {
          text: this.generateUrgentTransferRequestSMSText(transferData)
        },
        metadata: {
          source: 'transfer_workflow',
          category: 'urgent_transfer_request',
          transferId: transferData.transferId,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.communicationService.sendSMS(smsMessage);
      if (result.success) {
        console.log(`📱 URGENT transfer request SMS sent to admin: ${adminPhone}`);
      } else {
        console.error(`❌ Failed to send URGENT transfer request SMS:`, result.error);
      }
    } catch (error) {
      console.error('❌ Error sending URGENT transfer request SMS:', error);
    }
  }

  /**
   * Send SMS for transfer approved
   */
  async sendTransferApprovedSMS(transfer: any, approvedBy: any): Promise<void> {
    try {
      console.log('📱 Sending transfer approved SMS...');

      // Get the manager who requested the transfer
      const manager = await User.findById(transfer.requestedBy);
      if (!manager) {
        console.error('Manager not found for transfer approval SMS');
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

      // Send SMS to manager
      if (manager.phone) {
        await this.sendTransferApprovedToManagerSMS(manager, transferData);
      }

      // Send SMS to all employees
      for (const employee of employees) {
        if (employee.phone) {
          await this.sendTransferApprovedToEmployeeSMS(employee, transferData);
        }
      }

      console.log(`✅ Transfer approved SMS sent to manager and ${employees.length} employees`);
    } catch (error) {
      console.error('❌ Error sending transfer approved SMS:', error);
    }
  }

  /**
   * Send transfer approved SMS to manager
   */
  private async sendTransferApprovedToManagerSMS(manager: any, transferData: any): Promise<void> {
    try {
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
    } catch (error) {
      console.error('❌ Error sending transfer approved SMS to manager:', error);
    }
  }

  /**
   * Send transfer approved SMS to employee
   */
  private async sendTransferApprovedToEmployeeSMS(employee: any, transferData: any): Promise<void> {
    try {
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
    } catch (error) {
      console.error('❌ Error sending transfer approved SMS to employee:', error);
    }
  }

  /**
   * Send SMS for transfer accepted
   */
  async sendTransferAcceptedSMS(transfer: any, acceptedBy: any): Promise<void> {
    try {
      console.log('📱 Sending transfer accepted SMS...');

      // Get the manager who requested the transfer
      const manager = await User.findById(transfer.requestedBy);
      if (!manager) {
        console.error('Manager not found for transfer acceptance SMS');
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

      // Send SMS to manager
      if (manager.phone) {
        await this.sendTransferAcceptedToManagerSMS(manager, transferData);
      }

      console.log(`✅ Transfer accepted SMS sent to manager`);
    } catch (error) {
      console.error('❌ Error sending transfer accepted SMS:', error);
    }
  }

  /**
   * Send transfer accepted SMS to manager
   */
  private async sendTransferAcceptedToManagerSMS(manager: any, transferData: any): Promise<void> {
    try {
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
    } catch (error) {
      console.error('❌ Error sending transfer accepted SMS to manager:', error);
    }
  }

  /**
   * Send SMS for transfer completed
   */
  async sendTransferCompletedSMS(transfer: any, completedBy: any): Promise<void> {
    try {
      console.log('📱 Sending transfer completed SMS...');

      // Get the manager who requested the transfer
      const manager = await User.findById(transfer.requestedBy);
      if (!manager) {
        console.error('Manager not found for transfer completion SMS');
        return;
      }

      const transferData = {
        transferId: transfer.transferId,
        patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority.toUpperCase(),
        completedBy: `${completedBy.firstName} ${completedBy.lastName}`,
        completedAt: new Date().toLocaleString()
      };

      // Send SMS to manager
      if (manager.phone) {
        await this.sendTransferCompletedToManagerSMS(manager, transferData);
      }

      console.log(`✅ Transfer completed SMS sent to manager`);
    } catch (error) {
      console.error('❌ Error sending transfer completed SMS:', error);
    }
  }

  /**
   * Send transfer completed SMS to manager
   */
  private async sendTransferCompletedToManagerSMS(manager: any, transferData: any): Promise<void> {
    try {
      const smsMessage: SMSMessage = {
        id: `transfer_completed_manager_sms_${Date.now()}`,
        channel: 'sms',
        priority: 'medium',
        status: 'pending',
        recipient: {
          phone: manager.phone,
          name: `${manager.firstName} ${manager.lastName}`,
          countryCode: '1'
        },
        content: {
          text: `✅ Transfer ${transferData.transferId} completed by ${transferData.completedBy}! Patient: ${transferData.patientName}, From: ${transferData.fromHospital} to ${transferData.toHospital}`
        },
        metadata: {
          source: 'transfer_workflow',
          category: 'transfer_completed',
          transferId: transferData.transferId,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendSMS(smsMessage);
    } catch (error) {
      console.error('❌ Error sending transfer completed SMS to manager:', error);
    }
  }

  /**
   * Send SMS with template
   */
  private async sendSMSWithTemplate(user: any, templateId: string, data: Record<string, any>, category: string): Promise<void> {
    try {
      const smsMessage: SMSMessage = {
        id: `template_sms_${Date.now()}_${user._id}`,
        channel: 'sms',
        priority: 'medium',
        status: 'pending',
        recipient: {
          phone: user.phone,
          name: `${user.firstName} ${user.lastName}`,
          countryCode: '1'
        },
        content: {
          text: this.generateSMSTextFromTemplate(templateId, data)
        },
        metadata: {
          source: 'transfer_workflow',
          category: category,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.communicationService.sendSMS(smsMessage);
    } catch (error) {
      console.error('❌ Error sending SMS with template:', error);
    }
  }

  /**
   * Generate SMS text from template
   */
  private generateSMSTextFromTemplate(templateId: string, data: Record<string, any>): string {
    // This would typically load from a template system
    // For now, return a simple text
    return `Transfer ${data.transferId}: ${data.message}`;
  }

  /**
   * Generate SMS text for transfer request
   */
  private generateTransferRequestSMSText(transferData: any): string {
    return `🚑 ${transferData.priority} TRANSFER REQUEST
ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge})
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Requested by: ${transferData.requestedBy}`;
  }

  /**
   * Generate SMS text for urgent transfer request
   */
  private generateUrgentTransferRequestSMSText(transferData: any): string {
    return `🚨 URGENT TRANSFER REQUEST
ID: ${transferData.transferId}
Patient: ${transferData.patientName} (${transferData.patientAge})
From: ${transferData.fromHospital}
To: ${transferData.toHospital}
Requested by: ${transferData.requestedBy}
⚠️ IMMEDIATE ACTION REQUIRED`;
  }

  /**
   * Calculate duration between two dates
   */
  private calculateDuration(startDate: Date, endDate: Date): string {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }
}

// Export singleton instance
export default new TransferSMSService();
