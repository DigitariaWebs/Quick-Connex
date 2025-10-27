"use client";

/**
 * Client-Side Push Manager
 * 
 * Handles Web Push subscription management on the client side.
 * Does not import server-side modules to avoid build conflicts.
 */

import { 
  WebPushSubscription,
  RealtimeError
} from '../core/types';
import { ERROR_CODES } from '../core/constants';

// ===== CLIENT PUSH MANAGER =====

export class ClientPushManager {
  private static instance: ClientPushManager;
  private isSupported: boolean = false;
  private vapidPublicKey: string | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.checkSupport();
  }

  public static getInstance(): ClientPushManager {
    if (!ClientPushManager.instance) {
      ClientPushManager.instance = new ClientPushManager();
    }
    return ClientPushManager.instance;
  }

  // ===== SUPPORT CHECKING =====

  private async checkSupport(): Promise<void> {
    if (typeof window === 'undefined') {
      this.isSupported = false;
      return;
    }

    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        this.isSupported = false;
        return;
      }

      // Check if push manager is supported
      if (!('PushManager' in window)) {
        this.isSupported = false;
        return;
      }

      // Check if notification permission is supported
      if (!('Notification' in window)) {
        this.isSupported = false;
        return;
      }

      this.isSupported = true;
    } catch (error) {
      console.error('Error checking push support:', error);
      this.isSupported = false;
    }
  }

  // ===== SERVICE WORKER REGISTRATION =====

  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported || typeof window === 'undefined') {
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered:', this.registration);
      return this.registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  // ===== VAPID KEY MANAGEMENT =====

  public async getVapidPublicKey(): Promise<string | null> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await fetch('/api/realtime/notifications/vapid-key');
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
        return this.vapidPublicKey;
      }
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
    }

    return null;
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  public async subscribe(userId: string): Promise<WebPushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      throw new Error('Push notifications not supported');
    }

    try {
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer
      });

      // Save subscription to server
      await this.saveSubscription(userId, subscription);

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  public async unsubscribe(userId: string): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await this.deleteSubscription(userId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  public async getSubscriptionInfo(): Promise<{
    supported: boolean;
    subscribed: boolean;
    permission: NotificationPermission;
  }> {
    const supported = this.isSupported;
    let subscribed = false;
    let permission: NotificationPermission = 'default';

    if (supported && this.registration) {
      try {
        const subscription = await this.registration.pushManager.getSubscription();
        subscribed = !!subscription;
        permission = Notification.permission;
      } catch (error) {
        console.error('Error getting subscription info:', error);
      }
    }

    return { supported, subscribed, permission };
  }

  // ===== SERVER COMMUNICATION =====

  private async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/realtime/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Failed to save subscription:', error);
      throw error;
    }
  }

  private async deleteSubscription(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/realtime/notifications/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete subscription');
      }
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

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

  // ===== PERMISSION MANAGEMENT =====

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  public async testNotification(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const response = await fetch('/api/realtime/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_push_notification'
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }
}
