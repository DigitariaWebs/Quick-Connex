/**
 * Notification Integration Service
 * 
 * This service integrates the communication system with the existing notification system,
 * handling email and SMS delivery for notifications.
 */

import { CommunicationService } from '../core/CommunicationService';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';
import {
  CommunicationChannel,
  CommunicationServiceResponse,
} from '../core/types';
import { TemplateLoader } from '../templates/core/TemplateLoader';

/**
 * Notification Integration Service
 */
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
    channels: CommunicationChannel[] = ['email', 'sms']
  ): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    try {
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
                continue;
            }

            results.push(response);

            // Update notification delivery tracking
            await this.updateNotificationDelivery(
              notification._id.toString(),
              user._id.toString(),
              channel,
              response.success,
              response.providerId
            );

          } catch (error) {
            console.error(`Error sending ${channel} notification:`, error);
            results.push({
              success: false,
              messageId: `${notification._id}_${channel}_${user._id}`,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending notification via communication:', error);
      throw error;
    }
  }

  /**
   * Send urgent notification with high priority
   */
  async sendUrgentNotification(notification: any): Promise<CommunicationServiceResponse[]> {
    // Override channels to include both email and SMS for urgent notifications
    const channels: CommunicationChannel[] = ['email', 'sms'];
    
    // Set high priority
    notification.priority = 'urgent';
    
    return this.sendNotificationViaCommunication(notification, channels);
  }

  /**
   * Send transfer-specific notification
   */
  async sendTransferNotification(notification: any, transferData: any): Promise<CommunicationServiceResponse[]> {
    // Add transfer-specific metadata
    notification.metadata = {
      ...notification.metadata,
      transferId: transferData.transferId,
      transferCategory: transferData.transferCategory,
      patientName: transferData.patientName,
      fromHospital: transferData.fromHospital,
      toHospital: transferData.toHospital,
    };

    return this.sendNotificationViaCommunication(notification);
  }

  /**
   * Send system notification to all users
   */
  async sendSystemNotification(notification: any): Promise<CommunicationServiceResponse[]> {
    // System notifications go to all active users
    notification.targetUsers = 'all';
    notification.priority = 'high';
    
    return this.sendNotificationViaCommunication(notification);
  }

  /**
   * Get target users for notification
   */
  private async getTargetUsers(notification: any): Promise<any[]> {
    // This would typically query the database based on notification type
    // For now, return a mock array
    return [];
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: any, user: any): Promise<CommunicationServiceResponse> {
    const emailMessage = {
      id: `notification_email_${notification._id}_${user._id}`,
      channel: 'email' as const,
      priority: notification.priority || 'medium',
      status: 'pending' as const,
      recipient: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
      },
      content: {
        subject: notification.title,
        text: notification.message,
        html: this.generateEmailHTML(notification, user),
      },
      metadata: {
        source: 'notification_system',
        category: notification.type,
        notificationId: notification._id.toString(),
        userId: user._id.toString(),
      },
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.communicationService.sendEmail(emailMessage);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: any, user: any): Promise<CommunicationServiceResponse> {
    const smsMessage = {
      id: `notification_sms_${notification._id}_${user._id}`,
      channel: 'sms' as const,
      priority: notification.priority || 'medium',
      status: 'pending' as const,
      recipient: {
        phone: user.phone,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
        countryCode: '1',
      },
      content: {
        text: this.generateSMSText(notification, user),
      },
      metadata: {
        source: 'notification_system',
        category: notification.type,
        notificationId: notification._id.toString(),
        userId: user._id.toString(),
      },
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.communicationService.sendSMS(smsMessage);
  }

  /**
   * Generate HTML content for email notifications
   */
  private generateEmailHTML(notification: any, user: any): string {
    const isUrgent = notification.priority === 'urgent';
    const borderColor = isUrgent ? '#ff0000' : '#007bff';
    const headerColor = isUrgent ? '#ff0000' : '#333333';
    
    const transfer = notification.data?.transfer;
    const hasTransferData = !!transfer;
    
    const templateData = {
      title: notification.title,
      message: notification.message,
      borderColor,
      headerColor,
      hasTransferData,
      transferPatientName: hasTransferData 
        ? `${transfer.patient?.firstName || ''} ${transfer.patient?.lastName || ''}`.trim() || 'N/A'
        : '',
      transferFromHospital: hasTransferData 
        ? (transfer.fromHospitalName || transfer.fromHospital || 'N/A')
        : '',
      transferToHospital: hasTransferData 
        ? (transfer.toHospitalName || transfer.toHospital || 'N/A')
        : '',
      transferStatus: hasTransferData ? (transfer.status || 'N/A') : '',
      transferPriority: hasTransferData ? (transfer.priority || 'N/A') : ''
    };
    
    const templateLoader = TemplateLoader.getInstance();
    return templateLoader.renderTemplate('email/notification/generic.html', templateData);
  }

  /**
   * Generate SMS text for notifications
   */
  private generateSMSText(notification: any, user: any): string {
    let text = `${notification.title}: ${notification.message}`;
    
    if (notification.data?.transfer) {
      const transfer = notification.data.transfer;
      text += ` Patient: ${transfer.patient?.firstName} ${transfer.patient?.lastName}`;
      text += ` From: ${transfer.fromHospitalName || transfer.fromHospital} To: ${transfer.toHospitalName || transfer.toHospital}`;
    }

    // Truncate if too long
    if (text.length > 160) {
      text = text.substring(0, 157) + '...';
    }

    return text;
  }

  /**
   * Update notification delivery tracking
   */
  async updateNotificationDelivery(
    notificationId: string,
    userId: string,
    channel: CommunicationChannel,
    success: boolean,
    providerId?: string
  ): Promise<void> {
    try {
      // Update the notification's delivery tracking
      const deliveryMethod = channel === 'email' ? 'email' : 'sms';
      
      // Note: This would need to be implemented in the Notification model
      // For now, just log the update
      console.log(`Notification delivery updated:`, {
        notificationId,
        userId,
        channel,
        success,
        providerId,
      });
    } catch (error) {
      console.error('Error updating notification delivery:', error);
    }
  }

  /**
   * Get user communication preferences
   */
  async getUserCommunicationPreferences(userId: string): Promise<any> {
    try {
      // This would typically query a user preferences table
      // For now, return default preferences
      return {
        email: {
          enabled: true,
          frequency: 'immediate',
          types: ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'system'],
        },
        sms: {
          enabled: true,
          frequency: 'immediate',
          types: ['urgent_transfer', 'system'],
        },
        push: {
          enabled: true,
          frequency: 'immediate',
          types: ['transfer_status_change', 'new_transfer', 'urgent_transfer'],
        },
      };
    } catch (error) {
      console.error('Error getting user communication preferences:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new NotificationIntegrationService();
