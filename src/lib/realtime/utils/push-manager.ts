/**
 * Push Manager Utility
 * 
 * Handles Web Push subscription management, VAPID key generation,
 * and client-side push notification setup.
 */

import { PushProvider } from '../providers';
import { log } from '@/lib/logging';
import { 
  WebPushSubscription,
  RealtimeError
} from '../core/types';
import { ERROR_CODES } from '../core/constants';
import { 
  AppError,
  ValidationError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== PUSH MANAGER =====

export class PushManager {
  private static instance: PushManager;
  private pushProvider: PushProvider;
  private isSupported: boolean = false;
  private vapidPublicKey: string | null = null;

  private constructor() {
    this.pushProvider = PushProvider.getInstance();
    this.checkSupport();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PushManager {
    if (!PushManager.instance) {
      PushManager.instance = new PushManager();
    }
    return PushManager.instance;
  }

  /**
   * Check if Web Push is supported
   */
  private checkSupport(): void {
    if (typeof window === 'undefined') {
      this.isSupported = false;
      return;
    }

    this.isSupported = !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );

    log.debug('Web Push support check', {
      supported: this.isSupported,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window
    });
  }

  /**
   * Get VAPID public key
   */
  public async getVAPIDPublicKey(): Promise<string | null> {
    try {
      if (!this.isSupported) {
        return null;
      }

      if (this.vapidPublicKey) {
        return this.vapidPublicKey;
      }

      // Fetch from server
      const response = await fetch('/api/realtime/notifications/vapid-key');
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
        return this.vapidPublicKey;
      }

      return null;

    } catch (error) {
      log.error('Failed to get VAPID public key:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!this.isSupported) {
        throw new AppError('Web Push not supported', 400, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      const permission = await Notification.requestPermission();
      
      log.debug('Notification permission requested', {
        permission,
        supported: this.isSupported
      });

      return permission;

    } catch (error) {
      log.error('Failed to request notification permission:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribe(userId: string): Promise<WebPushSubscription | null> {
    try {
      if (!this.isSupported) {
        throw new AppError('Web Push not supported', 400, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Check permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new AppError('Notification permission denied', 403, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVAPIDPublicKey();
      if (!vapidPublicKey) {
        throw new AppError('VAPID public key not available', 500, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Register service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        throw new AppError('Service worker registration failed', 500, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer
      });

      // Convert to our format
      const pushSubscription: WebPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      // Send subscription to server
      await this.sendSubscriptionToServer(userId, pushSubscription);

      log.info('User subscribed to push notifications', {
        userId,
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });

      return pushSubscription;

    } catch (error) {
      log.error('Failed to subscribe to push notifications:', error);
      
      if (error instanceof AppError) {
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
   * Unsubscribe from push notifications
   */
  public async unsubscribe(userId: string): Promise<void> {
    try {
      if (!this.isSupported) {
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return;
      }

      // Get current subscription
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        return;
      }

      // Unsubscribe
      await subscription.unsubscribe();

      // Notify server
      await this.removeSubscriptionFromServer(userId);

      log.info('User unsubscribed from push notifications', {
        userId
      });

    } catch (error) {
      log.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Check if user is subscribed
   */
  public async isSubscribed(): Promise<boolean> {
    try {
      if (!this.isSupported) {
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;

    } catch (error) {
      log.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * Get subscription info
   */
  public async getSubscriptionInfo(): Promise<{
    subscribed: boolean;
    permission: NotificationPermission;
    supported: boolean;
  }> {
    try {
      const subscribed = await this.isSubscribed();
      const permission = Notification.permission;
      
      return {
        subscribed,
        permission,
        supported: this.isSupported
      };

    } catch (error) {
      log.error('Failed to get subscription info:', error);
      return {
        subscribed: false,
        permission: 'denied',
        supported: false
      };
    }
  }

  /**
   * Test push notification
   */
  public async testNotification(): Promise<void> {
    try {
      if (!this.isSupported) {
        throw new AppError('Web Push not supported', 400, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      const permission = Notification.permission;
      if (permission !== 'granted') {
        throw new AppError('Notification permission not granted', 403, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

      // Show test notification
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from the Patient Management System',
        icon: '/images/notification-icon.png',
        badge: '/images/badge-icon.png',
        tag: 'test-notification'
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      log.debug('Test notification shown');

    } catch (error) {
      log.error('Failed to show test notification:', error);
      throw error;
    }
  }

  // ===== PRIVATE METHODS =====

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      log.debug('Service worker registered', {
        scope: registration.scope
      });

      return registration;

    } catch (error) {
      log.error('Failed to register service worker:', error);
      return null;
    }
  }

  private async sendSubscriptionToServer(
    userId: string,
    subscription: WebPushSubscription
  ): Promise<void> {
    try {
      const response = await fetch('/api/realtime/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          subscription
        })
      });

      if (!response.ok) {
        throw new AppError('Failed to save subscription to server', 500, ERROR_CODES.PUSH_SUBSCRIPTION_FAILED);
      }

    } catch (error) {
      log.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromServer(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/realtime/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        log.warn('Failed to remove subscription from server');
      }

    } catch (error) {
      log.error('Failed to remove subscription from server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// ===== EXPORTS =====

export default PushManager;
