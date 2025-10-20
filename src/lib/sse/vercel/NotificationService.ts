/**
 * Vercel-Compatible Notification Service
 * 
 * Handles transfer notifications using database polling instead of server-side state.
 * Compatible with Vercel's stateless function architecture.
 */

import dbConnect from '@/lib/database/mongoose';
import Notification from '@/models/Notification';

export interface TransferNotification {
  id: string;
  type: 'new_transfer' | 'transfer_status_change' | 'urgent_transfer' | 'transfer_reminder';
  title: string;
  message: string;
  transferId?: string;
  priority: 'high' | 'medium' | 'low';
  userId: string;
  userType: string;
  timestamp: string;
  read?: boolean;
}

export class VercelNotificationService {
  /**
   * Create a transfer notification
   */
  static async createTransferNotification(
    transferId: string,
    transferType: 'new_transfer' | 'transfer_status_change' | 'urgent_transfer',
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    targetUserTypes?: string[]
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      await dbConnect();

      // Create notification record
      const notification = new Notification({
        type: transferType,
        title,
        message,
        transferId,
        priority,
        targetUserTypes: targetUserTypes || ['employee', 'manager', 'admin'],
        createdAt: new Date(),
        status: 'unread'
      });

      await notification.save();

      console.log('✅ Transfer notification created:', {
        id: notification._id,
        type: transferType,
        transferId,
        priority
      });

      return {
        success: true,
        notificationId: (notification._id as any).toString()
      };

    } catch (error) {
      console.error('❌ Failed to create transfer notification:', error);
      return {
        success: false,
        error: 'Failed to create notification'
      };
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    userType: string,
    limit: number = 50
  ): Promise<TransferNotification[]> {
    try {
      await dbConnect();

      const notifications = await Notification.find({
        $or: [
          { targetUserTypes: { $in: [userType] } },
          { targetUsers: { $in: [userId] } }
        ],
        status: 'unread'
      })
      .sort({ createdAt: -1 })
      .limit(limit);

      return notifications.map(notif => ({
        id: (notif._id as any).toString(),
        type: notif.type as any,
        title: notif.title,
        message: notif.message,
        transferId: notif.transferId,
        priority: notif.priority as any,
        userId,
        userType,
        timestamp: notif.createdAt.toISOString(),
        read: (notif.status as any) === 'read'
      }));

    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await dbConnect();

      await Notification.findByIdAndUpdate(notificationId, {
        status: 'read',
        readAt: new Date()
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
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
      console.error('❌ Failed to get notification stats:', error);
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

      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);

      return { cleaned: result.deletedCount || 0 };

    } catch (error) {
      console.error('❌ Failed to cleanup notifications:', error);
      return {
        cleaned: 0,
        error: 'Failed to cleanup notifications'
      };
    }
  }
}

