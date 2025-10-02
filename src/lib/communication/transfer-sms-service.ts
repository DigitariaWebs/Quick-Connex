/**
 * Transfer SMS Service
 * 
 * This service handles SMS notifications for the transfer workflow:
 * 1. New transfer request → SMS to Admin
 * 2. Transfer approved → SMS to Manager + Employees
 * 3. Transfer accepted → SMS to Manager
 * 4. Transfer completed → SMS to Manager
 */

import SMSService from './sms-service';
import { SMSMessage, SMSRecipient, SMSContent } from '@/types/communication-types';
import User from '@/models/User';
import { Types } from 'mongoose';
import { TransferCategory } from '@/constants/transfer-constants';

export class TransferSMSService {
  private smsService: SMSService;

  constructor() {
    this.smsService = new SMSService();
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
          category: 'Patient'
        };
        
      case TransferCategory.ENVELOPE:
        const envelopeInfo = transfer.transferData?.envelopeInfo;
        return {
          title: envelopeInfo ? `Envelope: ${envelopeInfo.senderName} → ${envelopeInfo.recipientName}` : 'Envelope Transfer',
          subtitle: envelopeInfo?.contents || 'Package/Envelope',
          category: 'Envelope'
        };
        
      case TransferCategory.PATIENT_FILE:
        const fileInfo = transfer.transferData?.fileInfo;
        return {
          title: fileInfo ? `Files: ${fileInfo.patientName}` : 'File Transfer',
          subtitle: fileInfo ? `${fileInfo.fileCount} ${fileInfo.fileType} files` : 'Patient Files',
          category: 'Files'
        };
        
      case TransferCategory.MEDICAL_EQUIPMENT:
        const equipmentInfo = transfer.transferData?.equipmentInfo;
        return {
          title: equipmentInfo ? equipmentInfo.equipmentName : 'Equipment Transfer',
          subtitle: equipmentInfo ? `${equipmentInfo.model} (${equipmentInfo.condition})` : 'Medical Equipment',
          category: 'Equipment'
        };
        
      default:
        return {
          title: 'Transfer',
          subtitle: 'Unknown Type',
          category: 'Unknown'
        };
    }
  }

  /**
   * Send SMS notification for new transfer request
   * This goes to admins for approval
   */
  async sendNewTransferRequestSMS(transfer: any, requestedBy: any): Promise<void> {
    try {
      // Get all admin users
      const admins = await User.find({ userType: 'admin', status: 'approved' });
      
      if (admins.length === 0) {
        console.log('No admin users found for SMS notification');
        return;
      }

      // Prepare SMS data
      const smsData = {
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        patientAge: transfer.patientInfo.age,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority,
        requestedBy: `${requestedBy.firstName} ${requestedBy.lastName}`,
        transferId: transfer.transferId
      };

      // Send SMS to each admin
      for (const admin of admins) {
        if (admin.phone) {
          await this.sendSMSWithTemplate(
            admin,
            'new_transfer_request_sms',
            smsData,
            'New Transfer Request'
          );
        }
      }

      console.log(`SMS notifications sent to ${admins.length} admins for new transfer request`);
    } catch (error) {
      console.error('Error sending new transfer request SMS:', error);
    }
  }

  /**
   * Send SMS notification for urgent transfer request
   */
  async sendUrgentTransferRequestSMS(transfer: any, requestedBy: any): Promise<void> {
    try {
      // Get all admin users
      const admins = await User.find({ userType: 'admin', status: 'approved' });
      
      if (admins.length === 0) {
        console.log('No admin users found for urgent SMS notification');
        return;
      }

      // Prepare SMS data
      const smsData = {
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        patientAge: transfer.patientInfo.age,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        priority: transfer.priority,
        requestedBy: `${requestedBy.firstName} ${requestedBy.lastName}`,
        transferId: transfer.transferId
      };

      // Send urgent SMS to each admin
      for (const admin of admins) {
        if (admin.phone) {
          await this.sendSMSWithTemplate(
            admin,
            'urgent_transfer_alert_sms',
            smsData,
            'Urgent Transfer Alert'
          );
        }
      }

      console.log(`Urgent SMS notifications sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending urgent transfer request SMS:', error);
    }
  }

  /**
   * Send SMS notification when transfer is approved
   * This goes to the manager who requested it and all employees
   */
  async sendTransferApprovedSMS(transfer: any, approvedBy: any): Promise<void> {
    try {
      // Get transfer display information
      const transferDisplayInfo = this.getTransferDisplayInfo(transfer);
      
      // Prepare SMS data
      const smsData = {
        transferTitle: transferDisplayInfo.title,
        transferCategory: transferDisplayInfo.category,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        transferId: transfer.transferId,
        // Legacy fields for backward compatibility
        patientName: transferDisplayInfo.title
      };

      // Send SMS to the manager who requested the transfer
      if (transfer.requestedBy) {
        const manager = await User.findById(transfer.requestedBy);
        if (manager && manager.phone) {
          await this.sendSMSWithTemplate(
            manager,
            'transfer_approved_sms',
            smsData,
            'Transfer Approved'
          );
        }
      }

      // Send SMS to all employees
      const employees = await User.find({ userType: 'employee', status: 'approved' });
      for (const employee of employees) {
        if (employee.phone) {
          await this.sendSMSWithTemplate(
            employee,
            'transfer_approved_sms',
            smsData,
            'Transfer Approved'
          );
        }
      }

      console.log(`Transfer approved SMS sent to manager and ${employees.length} employees`);
    } catch (error) {
      console.error('Error sending transfer approved SMS:', error);
    }
  }

  /**
   * Send SMS notification when transfer is accepted by an employee
   */
  async sendTransferAcceptedSMS(transfer: any, acceptedBy: any): Promise<void> {
    try {
      // Prepare SMS data
      const smsData = {
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        acceptedBy: `${acceptedBy.firstName} ${acceptedBy.lastName}`,
        transferId: transfer.transferId
      };

      // Send SMS to the manager who requested the transfer
      if (transfer.requestedBy) {
        const manager = await User.findById(transfer.requestedBy);
        if (manager && manager.phone) {
          await this.sendSMSWithTemplate(
            manager,
            'transfer_accepted_sms',
            smsData,
            'Transfer Accepted'
          );
        }
      }

      console.log('Transfer accepted SMS sent to manager');
    } catch (error) {
      console.error('Error sending transfer accepted SMS:', error);
    }
  }

  /**
   * Send SMS notification when transfer is completed
   */
  async sendTransferCompletedSMS(transfer: any, completedBy: any): Promise<void> {
    try {
      // Calculate duration
      const duration = this.calculateDuration(transfer.requestedDate, new Date());

      // Prepare SMS data
      const smsData = {
        patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
        fromHospital: transfer.fromHospitalName,
        toHospital: transfer.toHospitalName,
        completedBy: `${completedBy.firstName} ${completedBy.lastName}`,
        duration: duration,
        transferId: transfer.transferId
      };

      // Send SMS to the manager who requested the transfer
      if (transfer.requestedBy) {
        const manager = await User.findById(transfer.requestedBy);
        if (manager && manager.phone) {
          await this.sendSMSWithTemplate(
            manager,
            'transfer_completed_sms',
            smsData,
            'Transfer Completed'
          );
        }
      }

      console.log('Transfer completed SMS sent to manager');
    } catch (error) {
      console.error('Error sending transfer completed SMS:', error);
    }
  }

  /**
   * Helper method to send SMS with template
   */
  private async sendSMSWithTemplate(
    user: any,
    templateId: string,
    data: Record<string, any>,
    category: string
  ): Promise<void> {
    try {
      // Render the template
      const renderedContent = await this.smsService.renderTemplate(templateId, data);

      // Create SMS message
      const smsMessage: SMSMessage = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        channel: 'sms',
        priority: category === 'Urgent Transfer Alert' ? 'urgent' : 'medium',
        status: 'pending',
        recipient: {
          phone: user.phone,
          name: `${user.firstName} ${user.lastName}`,
          countryCode: '1' // Default to US, should be configurable
        },
        content: {
          text: renderedContent.text
        },
        metadata: {
          source: 'transfer_workflow',
          category: category.toLowerCase().replace(/\s+/g, '_'),
          userId: user._id.toString(),
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Send SMS
      const result = await this.smsService.sendSMS(smsMessage);
      
      if (result.success) {
        console.log(`SMS sent successfully to ${user.firstName} ${user.lastName} (${user.phone})`);
      } else {
        console.error(`Failed to send SMS to ${user.firstName} ${user.lastName}:`, result.error);
      }
    } catch (error) {
      console.error(`Error sending SMS to ${user.firstName} ${user.lastName}:`, error);
    }
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
