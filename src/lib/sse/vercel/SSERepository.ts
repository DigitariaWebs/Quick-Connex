/**
 * Vercel SSE Repository
 * 
 * Data access layer for Vercel-compatible SSE notifications.
 * Follows clean architecture principles - only handles data access.
 */

import dbConnect from '@/lib/database/mongoose';
import Notification from '@/models/Notification';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  transferId?: string;
  priority: string;
  targetUserTypes: string[];
  createdAt: Date;
  status: string;
}

export interface NotificationQuery {
  userId?: string;
  userType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export class VercelSSERepository {
  /**
   * Create a notification
   */
  static async createNotification(data: Omit<NotificationData, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await dbConnect();

      const notification = new Notification(data);
      await notification.save();

      return {
        success: true,
        id: notification._id.toString()
      };

    } catch (error) {
      console.error('❌ Repository: Failed to create notification:', error);
      return {
        success: false,
        error: 'Failed to create notification'
      };
    }
  }

  /**
   * Get notifications by query
   */
  static async getNotifications(query: NotificationQuery): Promise<NotificationData[]> {
    try {
      await dbConnect();

      const filter: any = {};
      
      if (query.userType) {
        filter.targetUserTypes = { $in: [query.userType] };
      }
      
      if (query.status) {
        filter.status = query.status;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(query.limit || 50)
        .skip(query.offset || 0);

      return notifications.map(notif => ({
        id: notif._id.toString(),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        transferId: notif.transferId,
        priority: notif.priority,
        targetUserTypes: notif.targetUserTypes,
        createdAt: notif.createdAt,
        status: notif.status
      }));

    } catch (error) {
      console.error('❌ Repository: Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Update notification status
   */
  static async updateNotificationStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      await dbConnect();

      await Notification.findByIdAndUpdate(id, {
        status,
        readAt: status === 'read' ? new Date() : undefined
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Repository: Failed to update notification:', error);
      return {
        success: false,
        error: 'Failed to update notification'
      };
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<NotificationStats> {
    try {
      await dbConnect();

      const total = await Notification.countDocuments();
      const unread = await Notification.countDocuments({ status: 'unread' });
      
      const byType = await Notification.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      
      const byPriority = await Notification.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      return {
        total,
        unread,
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
      };

    } catch (error) {
      console.error('❌ Repository: Failed to get notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {}
      };
    }
  }

  /**
   * Cleanup old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<{ cleaned: number; error?: string }> {
    try {
      await dbConnect();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: 'read'
      });

      return { cleaned: result.deletedCount || 0 };

    } catch (error) {
      console.error('❌ Repository: Failed to cleanup notifications:', error);
      return {
        cleaned: 0,
        error: 'Failed to cleanup notifications'
      };
    }
  }
}
