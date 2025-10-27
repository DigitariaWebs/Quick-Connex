/**
 * Web Push Provider
 * 
 * Handles Web Push API subscriptions and notifications for native browser notifications.
 * Integrates with VAPID keys and service worker for background notifications.
 */

import webpush from 'web-push';
import { DatabaseService } from '@/lib/database';
import { log } from '@/lib/logging';
import User from '@/models/User';
import { 
  toStringId, 
  toStringIds, 
  toObjectId, 
  toObjectIds,
  getIdString 
} from '@/lib/utils/object-id';
import { 
  DeliveryResult,
  WebPushSubscription,
  NotificationType,
  NotificationPriority
} from '../core/types';
import { 
  DELIVERY_METHODS,
  ERROR_CODES,
  WEB_PUSH
} from '../core/constants';
import { REALTIME_CONFIG } from '../core/config';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';

// ===== WEB PUSH PROVIDER =====

export class PushProvider {
  private static instance: PushProvider;
  private isInitialized: boolean = false;

  private constructor() {
    this.initializeVAPID();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PushProvider {
    if (!PushProvider.instance) {
      PushProvider.instance = new PushProvider();
    }
    return PushProvider.instance;
  }

  /**
   * Initialize VAPID keys
   */
  private initializeVAPID(): void {
    try {
      const vapidKeys = {
        publicKey: REALTIME_CONFIG.webPush.vapidPublicKey,
        privateKey: REALTIME_CONFIG.webPush.vapidPrivateKey,
        email: REALTIME_CONFIG.webPush.vapidEmail
      };

      if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
        log.warn('VAPID keys not configured, Web Push will be disabled');
        return;
      }

      webpush.setVapidDetails(
        vapidKeys.email,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      this.isInitialized = true;
      log.info('Web Push VAPID keys initialized successfully');

    } catch (error) {
      log.error('Failed to initialize VAPID keys:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Subscribe user to push notifications
   */
  public async subscribeUser(
    userId: string,
    subscription: WebPushSubscription
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new AppError('Web Push not initialized', 500, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Validate subscription
      this.validateSubscription(subscription);

      // Find user
      const user = await DatabaseService.findById(User, userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update user with push subscription
      await DatabaseService.updateOne(
        User,
        { _id: userId },
        {
          $set: {
            pushSubscription: subscription,
            pushSubscriptionUpdatedAt: new Date()
          }
        }
      );

      log.info('User subscribed to push notifications', {
        userId,
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });

    } catch (error) {
      log.error('Failed to subscribe user to push notifications:', error);
      
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        ERROR_CODES.PUSH_SUBSCRIPTION_FAILED
      );
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  public async unsubscribeUser(userId: string): Promise<void> {
    try {
      // Find user
      const user = await DatabaseService.findById(User, userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Remove push subscription
      await DatabaseService.updateOne(
        User,
        { _id: userId },
        {
          $unset: {
            pushSubscription: 1,
            pushSubscriptionUpdatedAt: 1
          }
        }
      );

      log.info('User unsubscribed from push notifications', {
        userId
      });

    } catch (error) {
      log.error('Failed to unsubscribe user from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  public async sendPushNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type: NotificationType;
      priority: NotificationPriority;
      data?: any;
    }
  ): Promise<DeliveryResult> {
    try {
      if (!this.isInitialized) {
        throw new AppError('Web Push not initialized', 500, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Find user with push subscription
      const user = await DatabaseService.findOne(User, {
        _id: userId,
        pushSubscription: { $exists: true }
      });

      if (!user || !user.pushSubscription) {
        throw new NotFoundError('User not subscribed to push notifications');
      }

      // Create push payload
      const payload = JSON.stringify({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        data: notification.data,
        timestamp: new Date().toISOString(),
        icon: '/images/notification-icon.png',
        badge: '/images/badge-icon.png',
        tag: notification.type,
        requireInteraction: notification.priority === 'urgent',
        silent: notification.priority === 'low'
      });

      // Send push notification
      await webpush.sendNotification(
        user.pushSubscription,
        payload,
        {
          TTL: WEB_PUSH.TTL,
          urgency: WEB_PUSH.URGENCY,
          topic: `${WEB_PUSH.TOPIC_PREFIX}-${notification.type}`
        }
      );

      log.debug('Push notification sent successfully', {
        userId,
        type: notification.type,
        priority: notification.priority
      });

      return {
        success: true,
        method: DELIVERY_METHODS.PUSH,
        userId,
        notificationId: notification.data?.notificationId || 'unknown',
        timestamp: new Date()
      };

    } catch (error) {
      log.error('Failed to send push notification:', error);

      // Handle specific web-push errors
      if ((error as any).statusCode === 410) {
        // Subscription expired, remove it
        await this.unsubscribeUser(userId);
        log.info('Removed expired push subscription', { userId });
      }

      return {
        success: false,
        method: DELIVERY_METHODS.PUSH,
        userId,
        notificationId: notification.data?.notificationId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send push notification to multiple users
   */
  public async sendPushNotificationToUsers(
    userIds: string[],
    notification: {
      title: string;
      message: string;
      type: NotificationType;
      priority: NotificationPriority;
      data?: any;
    }
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const userId of userIds) {
      const result = await this.sendPushNotification(userId, notification);
      results.push(result);
    }

    return results;
  }

  /**
   * Get VAPID public key for client
   */
  public getVAPIDPublicKey(): string | null {
    if (!this.isInitialized) {
      return null;
    }
    return REALTIME_CONFIG.webPush.vapidPublicKey;
  }

  /**
   * Check if Web Push is available
   */
  public isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get subscription statistics
   */
  public async getSubscriptionStats(): Promise<any> {
    try {
      const stats = await DatabaseService.aggregate(User, [
        {
          $match: {
            pushSubscription: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            byUserType: {
              $push: '$userType'
            }
          }
        }
      ]);

      return stats[0] || { totalSubscriptions: 0, byUserType: [] };

    } catch (error) {
      log.error('Failed to get subscription stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired subscriptions
   */
  public async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const expiredThreshold = new Date();
      expiredThreshold.setDate(expiredThreshold.getDate() - 30); // 30 days ago

      const result = await DatabaseService.updateMany(
        User,
        {
          pushSubscription: { $exists: true },
          pushSubscriptionUpdatedAt: { $lt: expiredThreshold }
        },
        {
          $unset: {
            pushSubscription: 1,
            pushSubscriptionUpdatedAt: 1
          }
        }
      );

      log.info('Cleaned up expired push subscriptions', {
        count: result.modifiedCount
      });

      return result.modifiedCount;

    } catch (error) {
      log.error('Failed to cleanup expired subscriptions:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private validateSubscription(subscription: WebPushSubscription): void {
    if (!subscription.endpoint) {
      throw new ValidationError('Subscription endpoint is required');
    }

    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      throw new ValidationError('Subscription keys are required');
    }

    // Validate endpoint URL
    try {
      new URL(subscription.endpoint);
    } catch {
      throw new ValidationError('Invalid subscription endpoint URL');
    }

    // Validate key formats (basic check)
    if (subscription.keys.p256dh.length < 40 || subscription.keys.auth.length < 20) {
      throw new ValidationError('Invalid subscription key format');
    }
  }
}

// ===== EXPORTS =====

export default PushProvider;
