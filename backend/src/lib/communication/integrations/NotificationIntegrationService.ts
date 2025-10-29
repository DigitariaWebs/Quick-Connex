/**
 * Notification Integration Service
 * 
 * Integrates the communication system with the existing notification system.
 * Handles email and SMS delivery for notifications.
 */

import { CommunicationService } from '../core/CommunicationService';
import { CommunicationChannel, CommunicationServiceResponse, EmailMessage, SMSMessage } from '../../../types/communication';
import { log } from '../../logging';
import { createCommunicationContext } from '../utils/logger';

export class NotificationIntegrationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = CommunicationService.getInstance();
  }

  /**
   * Send notification via communication channels
   */
  async sendNotificationViaCommunication(
    notification: any,
    channels: CommunicationChannel[] = ['email']
  ): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    try {
      log.info('Sending notification via communication channels', 
        createCommunicationContext('notification_integration_send', {
          notificationId: notification.id,
          channels: channels.join(', ')
        })
      );

      // Get target users based on notification type
      const targetUsers = await this.getTargetUsers(notification);

      for (const user of targetUsers) {
        for (const channel of channels) {
          try {
            let response: CommunicationServiceResponse;

            switch (channel) {
              case 'email':
                response = await this.sendEmailNotification(notification, user);
                break;
              case 'sms':
                response = await this.sendSMSNotification(notification, user);
                break;
              default:
                log.warn(`Unsupported communication channel: ${channel}`, 
                  createCommunicationContext('notification_integration_unsupported_channel', {
                    channel
                  })
                );
                continue;
            }

            results.push(response);
          } catch (error) {
            log.error(`Failed to send ${channel} notification to user`, 
              createCommunicationContext('notification_integration_channel_error', {
                channel,
                userId: user.id,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            );
          }
        }
      }

      log.info('Notification sent via communication channels', 
        createCommunicationContext('notification_integration_send_complete', {
          notificationId: notification.id,
          userCount: targetUsers.length,
          channelCount: channels.length,
          successCount: results.length
        })
      );

      return results;
    } catch (error) {
      log.error('Failed to send notification via communication channels', 
        createCommunicationContext('notification_integration_send_error', {
          notificationId: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: any,
    user: any
  ): Promise<CommunicationServiceResponse> {
    const emailMessage: EmailMessage = {
      id: `notification-email-${notification.id}-${user.id}`,
      channel: 'email',
      status: 'pending',
      recipient: {
        userType: user.userType || 'employee',
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        subject: notification.title || 'Notification',
        text: this.generateEmailText(notification),
        html: this.generateEmailHTML(notification)
      },
      priority: this.getPriorityFromNotification(notification),
      metadata: {
        source: 'notification_system',
        category: 'notification',
        notificationId: notification.id,
        userId: user.id,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.communicationService.sendEmail(emailMessage);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: any,
    user: any
  ): Promise<CommunicationServiceResponse> {
    if (!user.phone) {
      throw new Error('User phone number not available for SMS notification');
    }

    const smsMessage: SMSMessage = {
      id: `notification-sms-${notification.id}-${user.id}`,
      channel: 'sms',
      status: 'pending',
      recipient: {
        userType: user.userType || 'employee',
        phone: user.phone,
        name: `${user.firstName} ${user.lastName}`
      },
      content: {
        text: this.generateSMSText(notification)
      },
      priority: this.getPriorityFromNotification(notification),
      metadata: {
        source: 'notification_system',
        category: 'notification',
        notificationId: notification.id,
        userId: user.id,
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.communicationService.sendSMS(smsMessage);
  }

  /**
   * Get target users for notification
   */
  private async getTargetUsers(notification: any): Promise<any[]> {
    // This would typically query the database based on notification.targetUsers
    // For now, return mock data
    if (notification.targetUsers && Array.isArray(notification.targetUsers)) {
      return notification.targetUsers;
    }

    // Default to all users if no specific targets
    return await this.getAllUsers();
  }

  /**
   * Get all users (mock implementation)
   */
  private async getAllUsers(): Promise<any[]> {
    // TODO: Implement database query for all users
    return [
      {
        id: 'user1',
        email: 'user1@hospital.com',
        firstName: 'User',
        lastName: 'One',
        userType: 'employee',
        phone: '+1234567890'
      }
    ];
  }

  /**
   * Get priority from notification
   */
  private getPriorityFromNotification(notification: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (notification.priority) {
      return notification.priority;
    }

    // Default priority based on notification type
    switch (notification.type) {
      case 'urgent_transfer':
      case 'emergency':
        return 'urgent';
      case 'transfer_request':
      case 'approval':
        return 'high';
      case 'status_update':
      case 'reminder':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Generate email text content
   */
  private generateEmailText(notification: any): string {
    return `
${notification.title || 'Notification'}

${notification.message || 'You have a new notification.'}

${notification.actionUrl ? `Action required: ${notification.actionUrl}` : ''}

Best regards,
Patient Management System
    `.trim();
  }

  /**
   * Generate email HTML content
   */
  private generateEmailHTML(notification: any): string {
    const priorityColor = this.getPriorityColor(notification.priority);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${notification.title || 'Notification'}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: ${priorityColor};">${notification.title || 'Notification'}</h2>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColor};">
      <p style="margin: 0;">${notification.message || 'You have a new notification.'}</p>
    </div>
    
    ${notification.actionUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${notification.actionUrl}" style="background: ${priorityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Take Action
      </a>
    </div>
    ` : ''}
    
    <p>Best regards,<br>Patient Management System</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate SMS text content
   */
  private generateSMSText(notification: any): string {
    const title = notification.title || 'Notification';
    const message = notification.message || 'You have a new notification.';
    
    // Keep SMS under 160 characters
    const smsText = `${title}: ${message}`;
    return smsText.length > 160 ? smsText.substring(0, 157) + '...' : smsText;
  }

  /**
   * Get priority color for styling
   */
  private getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#2563eb';
      case 'low':
        return '#6b7280';
      default:
        return '#2563eb';
    }
  }
}
