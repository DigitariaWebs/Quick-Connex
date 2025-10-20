/**
 * Vercel SSE Service
 * 
 * Business logic layer for Vercel-compatible SSE notifications.
 * Follows clean architecture principles - only handles business logic.
 */

import { VercelSSERepository, NotificationData, NotificationQuery, NotificationStats } from './SSERepository';

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

export interface CreateNotificationRequest {
  transferId: string;
  type: 'new_transfer' | 'transfer_status_change' | 'urgent_transfer' | 'transfer_reminder';
  title: string;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  targetUserTypes?: string[];
}

export interface GetNotificationsRequest {
  userId: string;
  userType: string;
  limit?: number;
  offset?: number;
}

export class VercelSSEService {
  /**
   * Create a transfer notification
   */
  static async createTransferNotification(
    request: CreateNotificationRequest
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      // Validate request
      if (!request.transferId || !request.type || !request.title || !request.message) {
        return {
          success: false,
          error: 'Missing required fields: transferId, type, title, message'
        };
      }

      // Validate notification type
      const validTypes = ['new_transfer', 'transfer_status_change', 'urgent_transfer', 'transfer_reminder'];
      if (!validTypes.includes(request.type)) {
        return {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        };
      }

      // Create notification data
      const notificationData: Omit<NotificationData, 'id'> = {
        type: request.type,
        title: request.title,
        message: request.message,
        transferId: request.transferId,
        priority: request.priority || 'medium',
        targetUserTypes: request.targetUserTypes || ['employee', 'manager', 'admin'],
        createdAt: new Date(),
        status: 'unread'
      };

      // Create notification via repository
      const result = await VercelSSERepository.createNotification(notificationData);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create notification'
        };
      }

      console.log('✅ Transfer notification created:', {
        id: result.id,
        type: request.type,
        transferId: request.transferId,
        priority: request.priority
      });

      return {
        success: true,
        notificationId: result.id
      };

    } catch (error) {
      console.error('❌ Service: Failed to create transfer notification:', error);
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
    request: GetNotificationsRequest
  ): Promise<TransferNotification[]> {
    try {
      // Validate request
      if (!request.userId || !request.userType) {
        return [];
      }

      // Query notifications via repository
      const query: NotificationQuery = {
        userType: request.userType,
        status: 'unread',
        limit: request.limit || 50,
        offset: request.offset || 0
      };

      const notifications = await VercelSSERepository.getNotifications(query);

      // Transform to business objects
      return notifications.map(notif => ({
        id: notif.id,
        type: notif.type as any,
        title: notif.title,
        message: notif.message,
        transferId: notif.transferId,
        priority: notif.priority as any,
        userId: request.userId,
        userType: request.userType,
        timestamp: notif.createdAt.toISOString(),
        read: notif.status === 'read'
      }));

    } catch (error) {
      console.error('❌ Service: Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate request
      if (!notificationId) {
        return {
          success: false,
          error: 'Notification ID is required'
        };
      }

      // Update notification via repository
      const result = await VercelSSERepository.updateNotificationStatus(notificationId, 'read');

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to mark notification as read'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Service: Failed to mark notification as read:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStatistics(): Promise<NotificationStats | null> {
    try {
      return await VercelSSERepository.getNotificationStats();
    } catch (error) {
      console.error('❌ Service: Failed to get notification statistics:', error);
      return null;
    }
  }

  /**
   * Cleanup old notifications
   */
  static async cleanupOldNotifications(daysOld: number = 30): Promise<{ cleaned: number; error?: string }> {
    try {
      // Validate request
      if (daysOld < 1) {
        return {
          cleaned: 0,
          error: 'Days old must be at least 1'
        };
      }

      // Cleanup via repository
      const result = await VercelSSERepository.cleanupOldNotifications(daysOld);

      if (result.error) {
        return {
          cleaned: 0,
          error: result.error
        };
      }

      console.log(`🧹 Cleaned up ${result.cleaned} old notifications`);

      return { cleaned: result.cleaned };

    } catch (error) {
      console.error('❌ Service: Failed to cleanup notifications:', error);
      return {
        cleaned: 0,
        error: 'Failed to cleanup notifications'
      };
    }
  }
}
