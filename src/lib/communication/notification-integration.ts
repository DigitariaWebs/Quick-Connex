/**
 * Notification Integration Service
 * 
 * This service integrates the communication system with the existing notification system,
 * handling email and SMS delivery for notifications.
 */

import CommunicationService from './communication-service';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';
import {
  CommunicationChannel,
  CommunicationServiceResponse,
} from '@/types/communication-types';

/**
 * Notification Integration Service
 */
export class NotificationIntegrationService {
  private communicationService: CommunicationService;

  constructor() {
    this.communicationService = new CommunicationService();
  }

  /**
   * Send notification via communication channels
   */
  async sendNotificationViaCommunication(
    notification: any,
    channels: CommunicationChannel[] = ['email', 'sms']
  ): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    // Get target users for this notification
    const targetUsers = await this.getTargetUsers(notification);

    for (const user of targetUsers) {
      try {
        const userResults = await this.communicationService.sendNotificationToUser(
          notification,
          user._id.toString(),
          channels
        );
        results.push(...userResults);
      } catch (error) {
        console.error(`Error sending communication to user ${user._id}:`, error);
        results.push({
          success: false,
          messageId: `${notification.id}_${user._id}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Send urgent notifications via all available channels
   */
  async sendUrgentNotification(
    notification: any
  ): Promise<CommunicationServiceResponse[]> {
    return await this.sendNotificationViaCommunication(notification, ['email', 'sms']);
  }

  /**
   * Send transfer notifications
   */
  async sendTransferNotification(
    notification: any,
    transferData: any
  ): Promise<CommunicationServiceResponse[]> {
    // Enhance notification with transfer-specific data
    const enhancedNotification = {
      ...notification,
      data: {
        ...notification.data,
        transfer: transferData,
      },
    };

    // Determine channels based on notification type and priority
    let channels: CommunicationChannel[] = ['email'];
    
    if (notification.priority === 'urgent' || notification.type === 'urgent_transfer') {
      channels.push('sms');
    }

    return await this.sendNotificationViaCommunication(enhancedNotification, channels);
  }

  /**
   * Send system notifications
   */
  async sendSystemNotification(
    notification: any
  ): Promise<CommunicationServiceResponse[]> {
    // System notifications typically go via email only
    return await this.sendNotificationViaCommunication(notification, ['email']);
  }

  /**
   * Send scheduled notifications
   */
  async sendScheduledNotification(
    notification: any,
    scheduledFor: Date
  ): Promise<CommunicationServiceResponse[]> {
    // For now, send immediately. In a production system, you'd use a job queue
    return await this.sendNotificationViaCommunication(notification);
  }

  /**
   * Get target users for a notification
   */
  private async getTargetUsers(notification: any): Promise<any[]> {
    const targetUsers: any[] = [];

    // Get users by specific IDs
    if (notification.targetUsers && notification.targetUsers.length > 0) {
      const users = await this.getUsersByIds(notification.targetUsers);
      targetUsers.push(...users);
    }

    // Get users by roles
    if (notification.targetRoles && notification.targetRoles.length > 0) {
      const users = await this.getUsersByRoles(notification.targetRoles);
      targetUsers.push(...users);
    }

    // Remove excluded users
    if (notification.excludeUsers && notification.excludeUsers.length > 0) {
      const excludeIds = notification.excludeUsers.map((id: any) => id.toString());
      return targetUsers.filter(user => !excludeIds.includes(user._id.toString()));
    }

    return targetUsers;
  }

  /**
   * Get users by IDs
   */
  private async getUsersByIds(userIds: Types.ObjectId[]): Promise<any[]> {
    // This would typically query the User model
    // For now, return mock data
    return userIds.map(id => ({
      _id: id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      userType: 'employee',
    }));
  }

  /**
   * Get users by roles
   */
  private async getUsersByRoles(roles: string[]): Promise<any[]> {
    // This would typically query the User model
    // For now, return mock data
    return roles.map(role => ({
      _id: new Types.ObjectId(),
      firstName: 'User',
      lastName: role.charAt(0).toUpperCase() + role.slice(1),
      email: `${role}@example.com`,
      phone: '+1234567890',
      userType: role,
    }));
  }

  /**
   * Update notification delivery status
   */
  async updateNotificationDelivery(
    notificationId: string,
    userId: string,
    channel: CommunicationChannel,
    success: boolean,
    providerId?: string
  ): Promise<void> {
    try {
      const notification = await Notification.findOne({ id: notificationId });
      if (!notification) {
        console.error(`Notification ${notificationId} not found`);
        return;
      }

      const deliveryMethod = channel === 'email' ? 'email' : 'sms'; 
      // Note: addDelivery method not available on Notification model

      // Update notification status if all deliveries are complete
      const totalTargetUsers = notification.targetUsers.length + 
        (notification.targetRoles.length * 2); // Estimate for role-based targeting
      
      if (notification.deliveries.length >= totalTargetUsers) {
        notification.status = 'delivered';
        await notification.save();
      }

    } catch (error) {
      console.error('Error updating notification delivery:', error);
    }
  }

  /**
   * Get communication preferences for a user
   */
  async getUserCommunicationPreferences(userId: string): Promise<any> {
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
  }

  /**
   * Update user communication preferences
   */
  async updateUserCommunicationPreferences(
    userId: string,
    preferences: any
  ): Promise<void> {
    // This would typically update a user preferences table
    console.log(`Updating communication preferences for user ${userId}:`, preferences);
  }

  /**
   * Get communication analytics for notifications
   */
  async getNotificationCommunicationAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    // This would typically query analytics data
    return {
      totalNotifications: 0,
      totalEmailsSent: 0,
      totalSMSSent: 0,
      emailDeliveryRate: 0,
      smsDeliveryRate: 0,
      averageDeliveryTime: 0,
      costByChannel: {
        email: 0,
        sms: 0,
      },
    };
  }
}

// Export the service
export default NotificationIntegrationService;
