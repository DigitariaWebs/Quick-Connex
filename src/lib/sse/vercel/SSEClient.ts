/**
 * Vercel-Compatible SSE Client
 * 
 * Client-side SSE manager that works with Vercel's stateless architecture.
 * Uses polling for notifications instead of server-side state management.
 */

"use client";

import { VercelNotificationService, TransferNotification } from './NotificationService';

export interface VercelSSEConfig {
  pollingInterval: number; // How often to poll for notifications
  maxRetries: number;
  retryDelay: number;
}

export const VERCEL_SSE_CONFIG: VercelSSEConfig = {
  pollingInterval: 5000, // Poll every 5 seconds
  maxRetries: 5,
  retryDelay: 1000
};

export class VercelSSEClient {
  private static instance: VercelSSEClient;
  
  // Client state
  private isConnected: boolean = false;
  private userId: string | null = null;
  private userType: string | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  
  // Subscribers
  private subscribers: Map<string, (notification: TransferNotification) => void> = new Map();
  
  // Configuration
  private config: VercelSSEConfig;

  private constructor() {
    this.config = VERCEL_SSE_CONFIG;
  }

  public static getInstance(): VercelSSEClient {
    if (!VercelSSEClient.instance) {
      VercelSSEClient.instance = new VercelSSEClient();
    }
    return VercelSSEClient.instance;
  }

  /**
   * Connect to SSE (start polling)
   */
  public async connect(userId: string, userType: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.userId = userId;
      this.userType = userType;
      this.isConnected = true;
      this.retryCount = 0;

      // Start polling for notifications
      this.startPolling();

      console.log('🔌 Vercel SSE Client connected:', { userId, userType });
      return { success: true };

    } catch (error) {
      console.error('❌ Vercel SSE Client connection failed:', error);
      return {
        success: false,
        error: 'Failed to connect'
      };
    }
  }

  /**
   * Disconnect from SSE (stop polling)
   */
  public disconnect(): void {
    this.isConnected = false;
    this.userId = null;
    this.userType = null;
    this.retryCount = 0;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    console.log('🔌 Vercel SSE Client disconnected');
  }

  /**
   * Subscribe to notifications
   */
  public subscribe(
    id: string, 
    callback: (notification: TransferNotification) => void
  ): () => void {
    this.subscribers.set(id, callback);
    console.log('📡 Vercel SSE Client: Subscribed', { id });
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      console.log('📡 Vercel SSE Client: Unsubscribed', { id });
    };
  }

  /**
   * Get connection state
   */
  public getConnectionState(): {
    connected: boolean;
    userId: string | null;
    userType: string | null;
    retryCount: number;
    subscribers: number;
  } {
    return {
      connected: this.isConnected,
      userId: this.userId,
      userType: this.userType,
      retryCount: this.retryCount,
      subscribers: this.subscribers.size
    };
  }

  /**
   * Start polling for notifications
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    this.pollingTimer = setInterval(async () => {
      if (!this.isConnected || !this.userId || !this.userType) {
        return;
      }

      try {
        await this.pollForNotifications();
        this.retryCount = 0; // Reset retry count on success

      } catch (error) {
        console.error('❌ Polling error:', error);
        this.handlePollingError();
      }
    }, this.config.pollingInterval);
  }

  /**
   * Poll for new notifications
   */
  private async pollForNotifications(): Promise<void> {
    if (!this.userId || !this.userType) return;

    try {
      const notifications = await VercelNotificationService.getUserNotifications(
        this.userId,
        this.userType,
        10 // Get last 10 notifications
      );

      // Send new notifications to subscribers
      notifications.forEach(notification => {
        if (!notification.read) {
          this.broadcastToSubscribers(notification);
        }
      });

    } catch (error) {
      console.error('❌ Failed to poll notifications:', error);
      throw error;
    }
  }

  /**
   * Handle polling errors
   */
  private handlePollingError(): void {
    this.retryCount++;

    if (this.retryCount >= this.config.maxRetries) {
      console.error('❌ Max retries reached, stopping polling');
      this.disconnect();
      return;
    }

    // Exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
    console.log(`🔄 Retrying in ${delay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);

    setTimeout(() => {
      if (this.isConnected) {
        this.startPolling();
      }
    }, delay);
  }

  /**
   * Broadcast notification to all subscribers
   */
  private broadcastToSubscribers(notification: TransferNotification): void {
    this.subscribers.forEach((callback, id) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('❌ Subscriber callback error:', error);
      }
    });
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await VercelNotificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return {
        success: false,
        error: 'Failed to mark as read'
      };
    }
  }

  /**
   * Get notification statistics
   */
  public async getNotificationStats(): Promise<any> {
    try {
      return await VercelNotificationService.getNotificationStats();
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return null;
    }
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    console.log('🧹 Vercel SSE Client: Cleaning up');
    this.disconnect();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const vercelSSEClient = VercelSSEClient.getInstance();

