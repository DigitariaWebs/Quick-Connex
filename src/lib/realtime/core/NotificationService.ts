/**
 * Notification Service
 * 
 * Core notification business logic
 * Works entirely with Types.ObjectId internally
 */

import { Types } from 'mongoose';
import { UserRole } from '@/lib/auth/core/types';
import { 
  ActorType, 
  AuditAction, 
  AuditCategory, 
  TargetResourceType, 
  RiskLevel 
} from '@/models/AuditLog';
import { AuditService } from '@/lib/audit';
import { CommunicationService } from '@/lib/communication';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { 
  NotificationDocument, 
  CreateNotificationInput,
  GetNotificationsOptions,
  NOTIFICATION_STATUS 
} from './types';
import { toObjectId, toObjectIds } from '../utils/converters';
import { log } from '@/lib/logging';

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create new notification
   * 
   * Accepts flexible input but normalizes to ObjectIds internally
   * Returns MongoDB document with ObjectIds
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationDocument> {
    try {
      // Normalize all IDs to ObjectIds
      const targetUsers = input.targetUsers ? toObjectIds(input.targetUsers) : [];
      const excludeUsers = input.excludeUsers ? toObjectIds(input.excludeUsers) : [];
      const transferId = input.transferId ? toObjectId(input.transferId) : undefined;
      const relatedResourceId = input.relatedResourceId ? toObjectId(input.relatedResourceId) : undefined;
      const createdBy = toObjectId(input.createdBy);

      // Create notification document
      const notification = await Notification.create({
        type: input.type,
        priority: input.priority || 'medium',
        title: input.title,
        message: input.message,
        data: input.data,
        targetUsers,
        targetRoles: input.targetRoles || [],
        excludeUsers,
        transferId,
        relatedResourceId,
        relatedResourceType: input.relatedResourceType,
        deliveries: [],
        status: NOTIFICATION_STATUS.PENDING,
        deliveryAttempts: 0,
        settings: {
          persistent: true,
          requireAcknowledgment: false,
          channels: ['realtime', 'push'],
          ...input.settings,
        },
        createdBy,
        createdByType: input.createdByType,
      });

      // Audit log
      await AuditService.logCommunication({
        actorId: createdBy.toString(),
        actorType: input.createdByType,
        action: AuditAction.NOTIFICATION_SENT,
        description: `Created notification: ${input.title}`,
        targetResourceId: (notification as any)._id.toString(),
      });

      log.info('Notification created successfully', {
        notificationId: (notification as any)._id.toString(),
        type: input.type,
        targetUsers: targetUsers.length,
        targetRoles: input.targetRoles?.length || 0,
      });

      return notification as unknown as NotificationDocument;
    } catch (error) {
      log.error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        input: {
          type: input.type,
          title: input.title,
          targetUsers: input.targetUsers?.length || 0,
        },
      });
      throw error;
    }
  }

  /**
   * Get notifications for user
   * 
   * Accepts flexible userId input
   * Returns array of documents with ObjectIds
   */
  async getUserNotifications(
    options: GetNotificationsOptions
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    unread: number;
  }> {
    try {
      const userId = options.userId ? toObjectId(options.userId) : undefined;

      const query: any = {};

      // User targeting
      if (userId) {
        query.$or = [
          { targetUsers: userId },
          { targetRoles: { $in: options.userRoles || [] } },
        ];
        
        // Exclude explicitly excluded users
        query.$nor = [{ excludeUsers: userId }];
      } else if (options.userRoles?.length) {
        query.targetRoles = { $in: options.userRoles };
      }

      // Filters
      if (options.type) query.type = options.type;
      if (options.priority) query.priority = options.priority;
      if (options.status) query.status = options.status;

      // Unread filter
      if (options.unreadOnly && userId) {
        query['deliveries'] = {
          $not: {
            $elemMatch: {
              userId,
              readAt: { $exists: true },
            },
          },
        };
      }

      const notifications = await Notification.find(query)
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .lean();

      const total = await Notification.countDocuments(query);
      const unread = userId ? await this.getUnreadCount(userId) : 0;

      log.debug('Retrieved user notifications', {
        userId: userId?.toString(),
        count: notifications.length,
        total,
        unread,
        filters: {
          type: options.type,
          priority: options.priority,
          status: options.status,
          unreadOnly: options.unreadOnly,
        },
      });

      return {
        notifications: notifications as unknown as NotificationDocument[],
        total,
        unread,
      };
    } catch (error) {
      log.error('Failed to get user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options: {
          userId: options.userId?.toString(),
          userRoles: options.userRoles,
          type: options.type,
        },
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    try {
      const notifId = toObjectId(notificationId);
      const uid = toObjectId(userId);

      const result = await Notification.updateOne(
        {
          _id: notifId,
          'deliveries.userId': uid,
        },
        {
          $set: {
            'deliveries.$.readAt': new Date(),
          },
        }
      );

      const success = result.modifiedCount > 0;
      
      if (success) {
        log.info('Notification marked as read', {
          notificationId: notifId.toString(),
          userId: uid.toString(),
        });
      } else {
        log.warn('Failed to mark notification as read - not found or already read', {
          notificationId: notifId.toString(),
          userId: uid.toString(),
        });
      }

      return success;
    } catch (error) {
      log.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notificationId.toString(),
        userId: userId.toString(),
      });
      throw error;
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(
    notificationId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    try {
      const notifId = toObjectId(notificationId);
      const uid = toObjectId(userId);

      const result = await Notification.updateOne(
        {
          _id: notifId,
          'deliveries.userId': uid,
        },
        {
          $set: {
            'deliveries.$.dismissedAt': new Date(),
          },
        }
      );

      const success = result.modifiedCount > 0;
      
      if (success) {
        log.info('Notification dismissed', {
          notificationId: notifId.toString(),
          userId: uid.toString(),
        });
      }

      return success;
    } catch (error) {
      log.error('Failed to dismiss notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notificationId.toString(),
        userId: userId.toString(),
      });
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  private async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    try {
      return await Notification.countDocuments({
        $or: [
          { targetUsers: userId },
        ],
        'deliveries': {
          $not: {
            $elemMatch: {
              userId,
              readAt: { $exists: true },
            },
          },
        },
      });
    } catch (error) {
      log.error('Failed to get unread count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: userId.toString(),
      });
      return 0;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await Notification.deleteMany({
        'settings.expiresAt': {
          $lt: new Date(),
        },
      });

      if (result.deletedCount > 0) {
        log.info('Cleaned up expired notifications', {
          deletedCount: result.deletedCount,
        });
      }

      return result.deletedCount;
    } catch (error) {
      log.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const matchQuery: any = {};
      
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = startDate;
        if (endDate) matchQuery.createdAt.$lte = endDate;
      }

      const stats = await Notification.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            byType: {
              $push: {
                type: '$type',
                count: 1,
              },
            },
            byPriority: {
              $push: {
                priority: '$priority',
                count: 1,
              },
            },
            byStatus: {
              $push: {
                status: '$status',
                count: 1,
              },
            },
          },
        },
      ]);

      const result = stats[0] || { total: 0, byType: [], byPriority: [], byStatus: [] };

      return {
        total: result.total,
        byType: this.groupByField(result.byType, 'type'),
        byPriority: this.groupByField(result.byPriority, 'priority'),
        byStatus: this.groupByField(result.byStatus, 'status'),
      };
    } catch (error) {
      log.error('Failed to get notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        total: 0,
        byType: {},
        byPriority: {},
        byStatus: {},
      };
    }
  }

  /**
   * Helper method to group aggregation results
   */
  private groupByField(items: any[], field: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    items.forEach(item => {
      const key = item[field];
      grouped[key] = (grouped[key] || 0) + item.count;
    });
    
    return grouped;
  }
}