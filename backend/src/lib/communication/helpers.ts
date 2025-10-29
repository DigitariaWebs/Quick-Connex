/**
 * Communication Helpers
 * 
 * Simple helper functions for common communication use cases.
 */

import { CommunicationService } from './core/CommunicationService';
import { EmailMessage, SMSMessage } from '../types/communication';
import { renderEmailTemplate, getEmailTemplates } from './templates/email-templates';
import { renderSMSTemplate, getSMSTemplates } from './templates/sms-templates';
import { log } from '../logging';

/**
 * Send transfer notification to admin
 */
export async function sendTransferNotificationToAdmin(
  transfer: any,
  requestingUser: any,
  adminUsers: any[]
): Promise<void> {
  const commService = CommunicationService.getInstance();
  
  try {
    log.info('Sending transfer notification to admins', {
      category: 'communication',
      operation: 'transfer_notification_admin',
      transferId: transfer.transferId,
      adminCount: adminUsers.length
    });

    const emailContent = renderEmailTemplate('transfer_request_email', {
      transferId: transfer.transferId,
      patientName: transfer.patientName,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      priority: transfer.priority,
      requestedBy: `${requestingUser.firstName} ${requestingUser.lastName}`
    });

    for (const admin of adminUsers) {
      const emailMessage: EmailMessage = {
        id: `transfer-${transfer.transferId}-${admin.id}`,
        channel: 'email',
        priority: transfer.priority === 'urgent' ? 'high' : 'medium',
        status: 'pending',
        recipient: {
          email: admin.email,
          name: `${admin.firstName} ${admin.lastName}`,
          userType: 'admin'
        },
        content: emailContent,
        metadata: {
          source: 'transfer_system',
          category: 'transfer_request',
          transferId: transfer.transferId,
          requestedBy: requestingUser.id
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await commService.sendEmail(emailMessage);
    }
  } catch (error) {
    log.error('Failed to send transfer notification to admin', error, {
      category: 'communication',
      operation: 'transfer_notification_admin_error',
      transferId: transfer.transferId
    });
    throw error;
  }
}

/**
 * Send signup notification to admin
 */
export async function sendSignupNotificationToAdmin(
  user: any,
  adminUsers: any[]
): Promise<void> {
  const commService = CommunicationService.getInstance();
  
  try {
    log.info('Sending signup notification to admins', {
      category: 'communication',
      operation: 'signup_notification_admin',
      userId: user.id,
      adminCount: adminUsers.length
    });

    const emailContent = renderEmailTemplate('signup_request_email', {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      requestedAt: new Date().toLocaleString()
    });

    for (const admin of adminUsers) {
      const emailMessage: EmailMessage = {
        id: `signup-${user.id}-${admin.id}`,
        channel: 'email',
        priority: 'medium',
        status: 'pending',
        recipient: {
          email: admin.email,
          name: `${admin.firstName} ${admin.lastName}`,
          userType: 'admin'
        },
        content: emailContent,
        metadata: {
          source: 'user_system',
          category: 'signup_request',
          userId: user.id,
          userType: user.userType
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await commService.sendEmail(emailMessage);
    }
  } catch (error) {
    log.error('Failed to send signup notification to admin', error, {
      category: 'communication',
      operation: 'signup_notification_admin_error',
      userId: user.id
    });
    throw error;
  }
}

/**
 * Send account approval email to user
 */
export async function sendAccountApprovalEmail(
  user: any,
  approvedBy: any,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  const commService = CommunicationService.getInstance();
  
  try {
    log.info('Sending account approval email to user', {
      category: 'communication',
      operation: 'account_approval_email',
      userId: user.id,
      status,
      approvedBy: approvedBy.id
    });

    const emailContent = renderEmailTemplate('user_approval_email', {
      status,
      approvedBy: `${approvedBy.firstName} ${approvedBy.lastName}`,
      reason: reason || (status === 'approved' ? 'Your account has been approved and you can now access the system.' : 'Your account request has been rejected.'),
      firstName: user.firstName,
      lastName: user.lastName
    });

    const emailMessage: EmailMessage = {
      id: `approval-${user.id}-${status}`,
      channel: 'email',
      priority: 'medium',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType
      },
      content: emailContent,
      metadata: {
        source: 'user_system',
        category: 'account_approval',
        userId: user.id,
        status,
        approvedBy: approvedBy.id
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await commService.sendEmail(emailMessage);
  } catch (error) {
    log.error('Failed to send account approval email', error, {
      category: 'communication',
      operation: 'account_approval_email_error',
      userId: user.id,
      status
    });
    throw error;
  }
}

/**
 * Send urgent SMS notification
 */
export async function sendUrgentSMS(
  phone: string,
  message: string,
  userType: string = 'unknown'
): Promise<void> {
  const commService = CommunicationService.getInstance();
  
  try {
    log.info('Sending urgent SMS', {
      category: 'communication',
      operation: 'urgent_sms',
      phone: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
      userType
    });

    const smsContent = renderSMSTemplate('urgent_notification_sms', {
      message
    });

    const smsMessage: SMSMessage = {
      id: `urgent-${Date.now()}`,
      channel: 'sms',
      priority: 'high',
      status: 'pending',
      recipient: {
        phone,
        userType
      },
      content: smsContent,
      metadata: {
        source: 'system',
        category: 'urgent_notification',
        isUrgent: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await commService.sendSMS(smsMessage);
  } catch (error) {
    log.error('Failed to send urgent SMS', error, {
      category: 'communication',
      operation: 'urgent_sms_error',
      phone: phone.replace(/\d(?=\d{4})/g, '*')
    });
    throw error;
  }
}

/**
 * Send transfer approval notification
 */
export async function sendTransferApprovalNotification(
  transfer: any,
  approvedBy: any,
  user: any
): Promise<void> {
  const commService = CommunicationService.getInstance();
  
  try {
    log.info('Sending transfer approval notification', {
      category: 'communication',
      operation: 'transfer_approval_notification',
      transferId: transfer.transferId,
      userId: user.id
    });

    // Send email
    const emailContent = renderEmailTemplate('transfer_approved_email', {
      transferId: transfer.transferId,
      patientName: transfer.patientName,
      fromHospital: transfer.fromHospital,
      toHospital: transfer.toHospital,
      approvedBy: `${approvedBy.firstName} ${approvedBy.lastName}`
    });

    const emailMessage: EmailMessage = {
      id: `transfer-approved-${transfer.transferId}-${user.id}`,
      channel: 'email',
      priority: 'medium',
      status: 'pending',
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType
      },
      content: emailContent,
      metadata: {
        source: 'transfer_system',
        category: 'transfer_approval',
        transferId: transfer.transferId,
        approvedBy: approvedBy.id
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await commService.sendEmail(emailMessage);

    // Send SMS if urgent
    if (transfer.priority === 'urgent' && user.phone) {
      const smsContent = renderSMSTemplate('transfer_approved_sms', {
        transferId: transfer.transferId,
        patientName: transfer.patientName,
        fromHospital: transfer.fromHospital,
        toHospital: transfer.toHospital
      });

      const smsMessage: SMSMessage = {
        id: `transfer-approved-sms-${transfer.transferId}-${user.id}`,
        channel: 'sms',
        priority: 'high',
        status: 'pending',
        recipient: {
          phone: user.phone,
          userType: user.userType
        },
        content: smsContent,
        metadata: {
          source: 'transfer_system',
          category: 'transfer_approval',
          transferId: transfer.transferId,
          isUrgent: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await commService.sendSMS(smsMessage);
    }
  } catch (error) {
    log.error('Failed to send transfer approval notification', error, {
      category: 'communication',
      operation: 'transfer_approval_notification_error',
      transferId: transfer.transferId,
      userId: user.id
    });
    throw error;
  }
}
