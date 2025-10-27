/**
 * Notification Service
 * 
 * Main service for creating, targeting, and delivering notifications.
 * Integrates with SocketProvider for real-time delivery and existing
 * CommunicationService for email/SMS fallback.
 */

import { DatabaseService } from '@/lib/database';
import { AuditService } from '@/lib/audit';
import { AuditAction, TargetResourceType, ActorType } from '@/models/AuditLog';
import { CommunicationService } from '@/lib/communication';
import { log } from '@/lib/logging';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { SocketProvider } from '../providers';
import { 
  toStringId, 
  toStringIds, 
  toObjectId, 
  toObjectIds,
  getIdString,
  toStringIdRequired
} from '@/lib/utils/object-id';
import { 
  RealtimeNotification,
  NotificationType,
  NotificationPriority,
  DeliveryMethod,
  NotificationStatus,
  UserRole,
  DeliveryResult,
  NotificationData,
  NotificationSettings
} from '../core/types';
import { 
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  DELIVERY_METHODS,
  ERROR_CODES,
  TIMING,
  DEFAULTS
} from '../core/constants';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  retry,
  withTimeout,
  batchProcess 
} from '@/lib/utils/async-helpers';
import { 
  sanitizeString,
  sanitizeQueryInput 
} from '@/lib/utils/request-validation';
import { 
  pickFields,
  omitFields,
  isEmpty 
} from '@/lib/utils/data-helpers';
import { 
  getCurrentTimestamp,
  isValidDate 
} from '@/lib/utils/date-time';
import { 
  truncate,
  capitalize 
} from '@/lib/utils/string-helpers';

// ===== NOTIFICATION SERVICE =====

export class NotificationService {
  private static instance: NotificationService;
  private socketProvider: SocketProvider;

  private constructor() {
    this.socketProvider = SocketProvider.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a new notification
   */
  public async createNotification(
    notificationData: CreateNotificationData,
    createdBy?: string
  ): Promise<RealtimeNotification> {
    try {
      // Validate notification data
      const validated = this.validateNotificationData(notificationData);
      
      // Generate notification ID
      const notificationId = this.generateNotificationId();
      
      // Create notification document
      const notification = await DatabaseService.create(Notification, {
        id: notificationId,
        type: validated.type || DEFAULTS.NOTIFICATION_PRIORITY,
        priority: validated.priority || DEFAULTS.NOTIFICATION_PRIORITY,
        title: validated.title,
        message: validated.message,
        targetUsers: validated.targetUsers || [],
        targetRoles: validated.targetRoles || [],
        excludeUsers: validated.excludeUsers || [],
        transferId: validated.transferId,
        data: validated.data || {},
        deliveries: [],
        settings: {
          persistent: validated.settings?.persistent ?? true,
          expiresAt: validated.settings?.expiresAt,
          maxDeliveries: validated.settings?.maxDeliveries || TIMING.NOTIFICATION_MAX_RETRIES,
          retryInterval: validated.settings?.retryInterval || TIMING.NOTIFICATION_RETRY_DELAY
        },
        status: DEFAULTS.NOTIFICATION_STATUS,
        deliveryAttempts: 0,
        createdBy: createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Convert to RealtimeNotification format for logging
      const realtimeNotification: RealtimeNotification = {
        id: getIdString(notification),
        type: notification.type as NotificationType,
        priority: notification.priority as NotificationPriority,
        title: notification.title,
        message: notification.message,
        targetUsers: notification.targetUsers,
        targetRoles: notification.targetRoles as UserRole[],
        excludeUsers: notification.excludeUsers,
        transferId: notification.transferId,
        data: notification.data,
        deliveries: notification.deliveries.map(delivery => ({
          userId: delivery.userId,
          deliveredAt: delivery.deliveredAt,
          readAt: delivery.readAt,
          dismissedAt: delivery.dismissedAt,
          deliveryMethod: delivery.deliveryMethod
        })),
        settings: notification.settings,
        status: notification.status as NotificationStatus,
        deliveryAttempts: notification.deliveryAttempts,
        lastDeliveryAttempt: notification.lastDeliveryAttempt,
        createdBy: notification.createdBy,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      };

      // Log audit event
      await this.logNotificationCreated(realtimeNotification, createdBy);

      log.info('Notification created successfully', {
        notificationId,
        type: notification.type,
        priority: notification.priority,
        targetUsers: notification.targetUsers.length,
        targetRoles: notification.targetRoles.length
      });

      return realtimeNotification;

    } catch (error) {
      log.error('Failed to create notification:', error);
      
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        ERROR_CODES.NOTIFICATION_SEND_FAILED
      );
    }
  }

  /**
   * Send notification to users
   */
  public async sendNotification(
    notification: RealtimeNotification,
    channels: DeliveryMethod[] = [DELIVERY_METHODS.REALTIME]
  ): Promise<DeliveryResult[]> {
    try {
      const results: DeliveryResult[] = [];
      
      // Get target users
      const targetUsers = await this.getTargetUsers(notification);
      
      if (targetUsers.length === 0) {
        log.warn('No target users found for notification', {
          notificationId: notification.id
        });
        return results;
      }

      // Send via each channel
      for (const channel of channels) {
        const channelResults = await this.sendViaChannel(
          notification,
          targetUsers,
          channel
        );
        results.push(...channelResults);
      }

      // Update notification status
      await this.updateNotificationStatus(toStringIdRequired(notification.id), results);

      // Log audit event
      await this.logNotificationSent(notification, results);

      log.info('Notification sent successfully', {
        notificationId: notification.id,
        targetUsers: targetUsers.length,
        channels: channels.length,
        successfulDeliveries: results.filter(r => r.success).length
      });

      return results;

    } catch (error) {
      log.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Create and send notification in one operation
   */
  public async createAndSendNotification(
    notificationData: CreateNotificationData,
    channels: DeliveryMethod[] = [DELIVERY_METHODS.REALTIME],
    createdBy?: string
  ): Promise<{ notification: RealtimeNotification; results: DeliveryResult[] }> {
    try {
      // Create notification
      const notification = await this.createNotification(notificationData, createdBy);
      
      // Send notification
      const results = await this.sendNotification(notification, channels);
      
      return { notification, results };

    } catch (error) {
      log.error('Failed to create and send notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for user
   */
  public async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<{ notifications: RealtimeNotification[]; total: number; unread: number }> {
    try {
      const user = await DatabaseService.findById(User, userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const query: any = {
        $and: [
          {
            $or: [
              { targetUsers: userId },
              { targetRoles: { $in: [user.userType] } }
            ]
          },
          {
            excludeUsers: { $ne: userId }
          },
          {
            status: { $in: ['pending', 'delivered'] }
          }
        ]
      };

      // Add filters
      if (options.unreadOnly) {
        query.$and.push({
          'deliveries': {
            $not: {
              $elemMatch: {
                userId: userId,
                readAt: { $exists: true }
              }
            }
          }
        });
      }

      if (options.type) {
        query.type = options.type;
      }

      if (options.priority) {
        query.priority = options.priority;
      }

      // Execute query
      const notifications = await DatabaseService.findMany(Notification, query, {
        sort: { createdAt: -1 },
        limit: options.limit || 50,
        skip: options.skip || 0
      });

      // Get total count
      const total = await DatabaseService.count(Notification, query);

      // Get unread count
      const unreadQuery = {
        ...query,
        'deliveries': {
          $not: {
            $elemMatch: {
              userId: userId,
              readAt: { $exists: true }
            }
          }
        }
      };
      const unread = await DatabaseService.count(Notification, unreadQuery);

      // Convert notifications to RealtimeNotification format
      const realtimeNotifications: RealtimeNotification[] = notifications.map(notification => ({
        id: getIdString(notification),
        type: notification.type as NotificationType,
        priority: notification.priority as NotificationPriority,
        title: notification.title,
        message: notification.message,
        targetUsers: notification.targetUsers,
        targetRoles: notification.targetRoles as UserRole[],
        excludeUsers: notification.excludeUsers,
        transferId: notification.transferId,
        data: notification.data,
        deliveries: notification.deliveries.map(delivery => ({
          userId: delivery.userId,
          deliveredAt: delivery.deliveredAt,
          readAt: delivery.readAt,
          dismissedAt: delivery.dismissedAt,
          deliveryMethod: delivery.deliveryMethod
        })),
        settings: notification.settings,
        status: notification.status as NotificationStatus,
        deliveryAttempts: notification.deliveryAttempts,
        lastDeliveryAttempt: notification.lastDeliveryAttempt,
        createdBy: notification.createdBy,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }));

      return { notifications: realtimeNotifications, total, unread };

    } catch (error) {
      log.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await DatabaseService.updateMany(
        Notification,
        { 
          id: notificationId,
          'deliveries.userId': userId 
        },
        { 
          $set: { 'deliveries.$.readAt': new Date() }
        }
      );

      if (!result || result.modifiedCount === 0) {
        throw new NotFoundError('Notification not found or already read');
      }

      // Log audit event
      await AuditService.logCommunication({
        action: AuditAction.NOTIFICATION_SENT,
        actorId: userId,
        actorType: ActorType.USER,
        description: `Notification marked as read by user ${userId}`,
        targetResourceType: TargetResourceType.NOTIFICATION,
        targetResourceId: notificationId,
        details: { userId }
      });

      log.debug('Notification marked as read', {
        notificationId,
        userId
      });

    } catch (error) {
      log.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   */
  public async markAsDismissed(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await DatabaseService.updateMany(
        Notification,
        { 
          id: notificationId,
          'deliveries.userId': userId 
        },
        { 
          $set: { 'deliveries.$.dismissedAt': new Date() }
        }
      );

      if (!result || result.modifiedCount === 0) {
        throw new NotFoundError('Notification not found');
      }

      // Log audit event
      await AuditService.logCommunication({
        action: AuditAction.NOTIFICATION_SENT,
        actorId: userId,
        actorType: ActorType.USER,
        description: `Notification dismissed by user ${userId}`,
        targetResourceType: TargetResourceType.NOTIFICATION,
        targetResourceId: notificationId,
        details: { userId }
      });

      log.debug('Notification dismissed', {
        notificationId,
        userId
      });

    } catch (error) {
      log.error('Failed to dismiss notification:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  public async deleteNotification(notificationId: string, deletedBy?: string): Promise<void> {
    try {
      const result = await DatabaseService.deleteOne(Notification, { id: notificationId });

      if (!result) {
        throw new NotFoundError('Notification not found');
      }

      // Log audit event
      await AuditService.logCommunication({
        action: AuditAction.NOTIFICATION_SENT,
        actorId: deletedBy || 'system',
        actorType: ActorType.USER,
        description: `Notification deleted by ${deletedBy || 'system'}`,
        targetResourceType: TargetResourceType.NOTIFICATION,
        targetResourceId: notificationId,
        details: { deletedBy }
      });

      log.info('Notification deleted', {
        notificationId,
        deletedBy
      });

    } catch (error) {
      log.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  public async getNotificationStats(): Promise<any> {
    try {
      const stats = await DatabaseService.aggregate(Notification, [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byType: {
              $push: {
                type: '$type',
                priority: '$priority',
                status: '$status'
              }
            }
          }
        }
      ]);

      return stats[0] || { total: 0, byType: [] };

    } catch (error) {
      log.error('Failed to get notification stats:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private validateNotificationData(data: CreateNotificationData): CreateNotificationData {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (data.title && data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (data.message && data.message.length > 500) {
      errors.push('Message must be 500 characters or less');
    }

    if (data.targetUsers && data.targetUsers.length > 1000) {
      errors.push('Too many target users (max 1000)');
    }

    if (data.targetRoles && data.targetRoles.length > 10) {
      errors.push('Too many target roles (max 10)');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }

    return {
      ...data,
      title: data.title?.trim(),
      message: data.message?.trim()
    };
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getTargetUsers(notification: RealtimeNotification): Promise<any[]> {
    const query: any = {
      $and: []
    };

    // Add user targeting
    if (notification.targetUsers.length > 0) {
      query.$and.push({
        _id: { $in: notification.targetUsers }
      });
    }

    // Add role targeting
    if (notification.targetRoles.length > 0) {
      query.$and.push({
        userType: { $in: notification.targetRoles }
      });
    }

    // Exclude users
    if (notification.excludeUsers.length > 0) {
      query.$and.push({
        _id: { $nin: notification.excludeUsers }
      });
    }

    // If no targeting specified, return empty array
    if (query.$and.length === 0) {
      return [];
    }

    return await DatabaseService.findMany(User, query);
  }

  private async sendViaChannel(
    notification: RealtimeNotification,
    targetUsers: any[],
    channel: DeliveryMethod
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    switch (channel) {
      case DELIVERY_METHODS.REALTIME:
        results.push(...await this.sendRealtime(notification, targetUsers));
        break;
      case DELIVERY_METHODS.EMAIL:
        results.push(...await this.sendEmail(notification, targetUsers));
        break;
      case DELIVERY_METHODS.SMS:
        results.push(...await this.sendSMS(notification, targetUsers));
        break;
      case DELIVERY_METHODS.PUSH:
        results.push(...await this.sendPush(notification, targetUsers));
        break;
    }

    return results;
  }

  private async sendRealtime(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const user of targetUsers) {
      try {
        await this.socketProvider.emitToUser(
          user._id.toString(),
          'notification:new',
          {
            notification: {
              id: notification.id,
              type: notification.type,
              priority: notification.priority,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              createdAt: notification.createdAt
            }
          }
        );

        results.push({
          success: true,
          method: DELIVERY_METHODS.REALTIME,
          userId: user._id.toString(),
          notificationId: notification.id,
          timestamp: new Date()
        });

      } catch (error) {
        results.push({
          success: false,
          method: DELIVERY_METHODS.REALTIME,
          userId: user._id.toString(),
          notificationId: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  private async sendEmail(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    try {
      const communicationService = CommunicationService.getInstance();
      
      for (const user of targetUsers) {
        try {
          // Create email message
          const emailMessage = {
            id: `notification-${notification.id}-${user._id}`,
            channel: 'email' as const,
            status: 'pending' as const,
            recipient: {
              email: user.email,
              name: `${user.firstName} ${user.lastName}`
            },
            content: {
              subject: notification.title,
              html: this.generateEmailHTML(notification, user),
              text: notification.message
            },
            metadata: {
              source: 'notification-service',
              category: TargetResourceType.NOTIFICATION,
              notificationId: toStringIdRequired(notification.id),
              userId: user._id.toString()
            },
            priority: notification.priority,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await communicationService.sendEmail(emailMessage);

          results.push({
            success: true,
            method: DELIVERY_METHODS.EMAIL,
            userId: user._id.toString(),
            notificationId: notification.id,
            timestamp: new Date()
          });

        } catch (error) {
          results.push({
            success: false,
            method: DELIVERY_METHODS.EMAIL,
            userId: user._id.toString(),
            notificationId: notification.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      log.error('Failed to send email notifications:', error);
    }

    return results;
  }

  private async sendSMS(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    try {
      const communicationService = CommunicationService.getInstance();
      
      for (const user of targetUsers) {
        if (!user.phone) continue;

        try {
          // Create SMS message
          const smsMessage = {
            id: `notification-${notification.id}-${user._id}`,
            channel: 'sms' as const,
            status: 'pending' as const,
            recipient: {
              phone: user.phone,
              name: `${user.firstName} ${user.lastName}`
            },
            content: {
              text: `${notification.title}: ${notification.message}`
            },
            metadata: {
              source: 'notification-service',
              category: TargetResourceType.NOTIFICATION,
              notificationId: toStringIdRequired(notification.id),
              userId: user._id.toString()
            },
            priority: notification.priority,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await communicationService.sendSMS(smsMessage);

          results.push({
            success: true,
            method: DELIVERY_METHODS.SMS,
            userId: user._id.toString(),
            notificationId: notification.id,
            timestamp: new Date()
          });

        } catch (error) {
          results.push({
            success: false,
            method: DELIVERY_METHODS.SMS,
            userId: user._id.toString(),
            notificationId: notification.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      log.error('Failed to send SMS notifications:', error);
    }

    return results;
  }

  private async sendPush(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    // Web Push implementation will be added in Phase 2
    return [];
  }

  private generateEmailHTML(notification: RealtimeNotification, user: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">${notification.title}</h2>
            <p>Hello ${user.firstName},</p>
            <p>${notification.message}</p>
            ${notification.data?.transfer ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Transfer Details</h3>
                <p><strong>Patient:</strong> ${notification.data.transfer.patient?.firstName} ${notification.data.transfer.patient?.lastName}</p>
                <p><strong>From:</strong> ${notification.data.transfer.fromHospital}</p>
                <p><strong>To:</strong> ${notification.data.transfer.toHospital}</p>
                <p><strong>Status:</strong> ${notification.data.transfer.status}</p>
              </div>
            ` : ''}
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from the Patient Management System.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private async updateNotificationStatus(
    notificationId: string,
    results: DeliveryResult[]
  ): Promise<void> {
    const successfulDeliveries = results.filter(r => r.success);
    const failedDeliveries = results.filter(r => !r.success);

    await DatabaseService.updateOne(
      Notification,
      { id: notificationId },
      {
        $push: {
          deliveries: {
            $each: successfulDeliveries.map(r => ({
              userId: r.userId,
              deliveredAt: r.timestamp,
              deliveryMethod: r.method
            }))
          }
        },
        $inc: { deliveryAttempts: results.length },
        $set: {
          lastDeliveryAttempt: new Date(),
          status: failedDeliveries.length === 0 ? 'delivered' : 'failed'
        }
      }
    );
  }

  private async logNotificationCreated(notification: RealtimeNotification, createdBy?: string): Promise<void> {
    await AuditService.logCommunication({
      action: AuditAction.NOTIFICATION_SENT,
      actorId: createdBy || 'system',
      actorType: ActorType.USER,
      description: `Notification created: ${notification.title}`,
      targetResourceType: TargetResourceType.NOTIFICATION,
      targetResourceId: toStringIdRequired(notification.id),
      details: {
        type: notification.type,
        priority: notification.priority,
        targetUsers: notification.targetUsers.length,
        targetRoles: notification.targetRoles.length
      }
    });
  }

  private async logNotificationSent(notification: RealtimeNotification, results: DeliveryResult[]): Promise<void> {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    await AuditService.logCommunication({
      action: AuditAction.NOTIFICATION_SENT,
      actorId: 'system',
      actorType: ActorType.USER,
      description: `Notification sent: ${successful} successful, ${failed} failed`,
      targetResourceType: TargetResourceType.NOTIFICATION,
      targetResourceId: toStringIdRequired(notification.id),
      details: {
        totalDeliveries: results.length,
        successfulDeliveries: successful,
        failedDeliveries: failed
      }
    });
  }
}

// ===== INTERFACES =====

export interface CreateNotificationData {
  type?: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  targetUsers?: string[];
  targetRoles?: UserRole[];
  excludeUsers?: string[];
  transferId?: string;
  data?: NotificationData;
  settings?: Partial<NotificationSettings>;
}

export interface GetNotificationsOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  skip?: number;
}

// ===== EXPORTS =====

export default NotificationService;
