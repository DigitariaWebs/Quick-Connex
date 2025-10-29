/**
 * Transfer Notification Service
 * 
 * Simplified backend version for transfer notifications.
 * Handles email and SMS notifications for transfer workflow.
 */

import { CommunicationService } from '../core/CommunicationService';
import { EmailMessage, SMSMessage } from '../../../types/communication';
import { log } from '../../logging';
import { createCommunicationContext } from '../utils/logger';

export class TransferNotificationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = CommunicationService.getInstance();
  }

  /**
   * Send new transfer request notification
   */
  async sendNewTransferRequestNotification(
    transfer: any,
    requestingUser: any
  ): Promise<void> {
    try {
      log.info('Sending new transfer request notification', 
        createCommunicationContext('transfer_notification_new', {
          transferId: transfer.transferId,
          requestedBy: requestingUser.id
        })
      );

      // Get admin users (this would typically query the database)
      const adminUsers = await this.getAdminUsers();
      
      for (const admin of adminUsers) {
        // Send email notification
        const emailMessage: EmailMessage = {
          id: `transfer-new-${transfer.transferId}-${admin.id}`,
          channel: 'email',
          status: 'pending',
          recipient: {
            userType: 'admin',
            email: admin.email,
            name: admin.firstName + ' ' + admin.lastName,
          },
          content: {
            subject: `New Transfer Request - ${transfer.transferId}`,
            text: this.generateTransferRequestText(transfer, requestingUser),
            html: this.generateTransferRequestHTML(transfer, requestingUser)
          },
          priority: transfer.priority === 'urgent' ? 'urgent' : 'high',
          metadata: {
            source: 'transfer_notification',
            category: 'transfer',
            transferId: transfer.transferId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendEmail(emailMessage);

        // Send SMS for urgent transfers
        if (transfer.priority === 'urgent' && admin.phone) {
          const smsMessage: SMSMessage = {
            id: `transfer-new-sms-${transfer.transferId}-${admin.id}`,
            channel: 'sms',
            status: 'pending',
            recipient: {
              userType: 'admin',
              phone: admin.phone,
              name: admin.firstName + ' ' + admin.lastName,
            },
            content: {
              text: `URGENT: New transfer request ${transfer.transferId} from ${requestingUser.firstName} ${requestingUser.lastName}`
            },
            priority: 'urgent',
            metadata: {
              source: 'transfer_notification',
              category: 'transfer',
              transferId: transfer.transferId
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await this.communicationService.sendSMS(smsMessage);
        }
      }

      log.info('Transfer request notifications sent successfully', 
        createCommunicationContext('transfer_notification_new_complete', {
          transferId: transfer.transferId,
          adminCount: adminUsers.length
        })
      );
    } catch (error) {
      log.error('Failed to send transfer request notification', 
        createCommunicationContext('transfer_notification_new_error', {
          transferId: transfer.transferId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Send transfer approval notification
   */
  async sendTransferApprovalNotification(
    transfer: any,
    approvedBy: any
  ): Promise<void> {
    try {
      log.info('Sending transfer approval notification', 
        createCommunicationContext('transfer_notification_approval', {
          transferId: transfer.transferId,
          approvedBy: approvedBy.id
        })
      );

      // Get manager and employee users
      const managerUsers = await this.getManagerUsers();
      const employeeUsers = await this.getEmployeeUsers();

      const allUsers = [...managerUsers, ...employeeUsers];

      for (const user of allUsers) {
        const emailMessage: EmailMessage = {
          id: `transfer-approval-${transfer.transferId}-${user.id}`,
          channel: 'email',
          status: 'pending',
          recipient: {
            userType: user.userType,
            email: user.email,
            name: user.firstName + ' ' + user.lastName
          },
          content: {
            subject: `Transfer Approved - ${transfer.transferId}`,
            text: this.generateTransferApprovalText(transfer, approvedBy),
            html: this.generateTransferApprovalHTML(transfer, approvedBy)
          },
          priority: 'medium',
          metadata: {
            source: 'transfer_notification',
            category: 'transfer',
            transferId: transfer.transferId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendEmail(emailMessage);
      }

      log.info('Transfer approval notifications sent successfully', 
        createCommunicationContext('transfer_notification_approval_complete', {
          transferId: transfer.transferId,
          userCount: allUsers.length
        })
      );
    } catch (error) {
      log.error('Failed to send transfer approval notification', 
        createCommunicationContext('transfer_notification_approval_error', {
          transferId: transfer.transferId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Send transfer completion notification
   */
  async sendTransferCompletionNotification(
    transfer: any,
    completedBy: any
  ): Promise<void> {
    try {
      log.info('Sending transfer completion notification', 
        createCommunicationContext('transfer_notification_completion', {
          transferId: transfer.transferId,
          completedBy: completedBy.id
        })
      );

      // Notify the requesting user
      const requestingUser = await this.getUserById(transfer.requestedBy);
      if (requestingUser) {
        const emailMessage: EmailMessage = {
          id: `transfer-completion-${transfer.transferId}-${requestingUser.id}`,
          channel: 'email',
          status: 'pending',
          recipient: {
            userType: requestingUser.userType,
            email: requestingUser.email,
            name: requestingUser.firstName + ' ' + requestingUser.lastName
          },
          content: {
            subject: `Transfer Completed - ${transfer.transferId}`,
            text: this.generateTransferCompletionText(transfer, completedBy),
            html: this.generateTransferCompletionHTML(transfer, completedBy)
          },
          priority: 'medium',
          metadata: {
            source: 'transfer_notification',
            category: 'transfer',
            transferId: transfer.transferId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.communicationService.sendEmail(emailMessage);
      }

      log.info('Transfer completion notification sent successfully', 
        createCommunicationContext('transfer_notification_completion_complete', {
          transferId: transfer.transferId
        })
      );
    } catch (error) {
      log.error('Failed to send transfer completion notification', 
        createCommunicationContext('transfer_notification_completion_error', {
          transferId: transfer.transferId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  // Mock data methods (would typically query database)
  private async getAdminUsers(): Promise<any[]> {
    // TODO: Implement database query for admin users
    return [
      {
        id: 'admin1',
        email: 'admin@hospital.com',
        firstName: 'Admin',
        lastName: 'User',
        userType: 'admin',
        phone: '+1234567890'
      }
    ];
  }

  private async getManagerUsers(): Promise<any[]> {
    // TODO: Implement database query for manager users
    return [
      {
        id: 'manager1',
        email: 'manager@hospital.com',
        firstName: 'Manager',
        lastName: 'User',
        userType: 'manager',
        phone: '+1234567891'
      }
    ];
  }

  private async getEmployeeUsers(): Promise<any[]> {
    // TODO: Implement database query for employee users
    return [
      {
        id: 'employee1',
        email: 'employee@hospital.com',
        firstName: 'Employee',
        lastName: 'User',
        userType: 'employee',
        phone: '+1234567892'
      }
    ];
  }

  private async getUserById(userId: string): Promise<any | null> {
    // TODO: Implement database query for user by ID
    return {
      id: userId,
      email: 'user@hospital.com',
      firstName: 'User',
      lastName: 'Name',
      userType: 'employee'
    };
  }

  // Template generation methods
  private generateTransferRequestText(transfer: any, requestingUser: any): string {
    return `
New Transfer Request

Transfer ID: ${transfer.transferId}
Requested by: ${requestingUser.firstName} ${requestingUser.lastName}
Priority: ${transfer.priority || 'normal'}
From: ${transfer.fromHospital?.name || 'Unknown'}
To: ${transfer.toHospital?.name || 'Unknown'}

Please review and approve this transfer request.

Best regards,
Patient Management System
    `.trim();
  }

  private generateTransferRequestHTML(transfer: any, requestingUser: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Transfer Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">New Transfer Request</h2>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Transfer Details</h3>
      <p><strong>Transfer ID:</strong> ${transfer.transferId}</p>
      <p><strong>Requested by:</strong> ${requestingUser.firstName} ${requestingUser.lastName}</p>
      <p><strong>Priority:</strong> ${transfer.priority || 'normal'}</p>
      <p><strong>From:</strong> ${transfer.fromHospital?.name || 'Unknown'}</p>
      <p><strong>To:</strong> ${transfer.toHospital?.name || 'Unknown'}</p>
    </div>
    
    <p>Please review and approve this transfer request.</p>
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generateTransferApprovalText(transfer: any, approvedBy: any): string {
    return `
Transfer Approved

Transfer ID: ${transfer.transferId}
Approved by: ${approvedBy.firstName} ${approvedBy.lastName}
From: ${transfer.fromHospital?.name || 'Unknown'}
To: ${transfer.toHospital?.name || 'Unknown'}

This transfer has been approved and is ready for execution.

Best regards,
Patient Management System
    `.trim();
  }

  private generateTransferApprovalHTML(transfer: any, approvedBy: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transfer Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #10b981;">Transfer Approved</h2>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h3 style="margin-top: 0; color: #1f2937;">Transfer Details</h3>
      <p><strong>Transfer ID:</strong> ${transfer.transferId}</p>
      <p><strong>Approved by:</strong> ${approvedBy.firstName} ${approvedBy.lastName}</p>
      <p><strong>From:</strong> ${transfer.fromHospital?.name || 'Unknown'}</p>
      <p><strong>To:</strong> ${transfer.toHospital?.name || 'Unknown'}</p>
    </div>
    
    <p>This transfer has been approved and is ready for execution.</p>
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generateTransferCompletionText(transfer: any, completedBy: any): string {
    return `
Transfer Completed

Transfer ID: ${transfer.transferId}
Completed by: ${completedBy.firstName} ${completedBy.lastName}
From: ${transfer.fromHospital?.name || 'Unknown'}
To: ${transfer.toHospital?.name || 'Unknown'}

This transfer has been successfully completed.

Best regards,
Patient Management System
    `.trim();
  }

  private generateTransferCompletionHTML(transfer: any, completedBy: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transfer Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #059669;">Transfer Completed</h2>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
      <h3 style="margin-top: 0; color: #1f2937;">Transfer Details</h3>
      <p><strong>Transfer ID:</strong> ${transfer.transferId}</p>
      <p><strong>Completed by:</strong> ${completedBy.firstName} ${completedBy.lastName}</p>
      <p><strong>From:</strong> ${transfer.fromHospital?.name || 'Unknown'}</p>
      <p><strong>To:</strong> ${transfer.toHospital?.name || 'Unknown'}</p>
    </div>
    
    <p>This transfer has been successfully completed.</p>
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>
    `.trim();
  }
}
