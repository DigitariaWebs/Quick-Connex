/**
 * Vercel SSE Manager - Clean Implementation
 * 
 * Main orchestrator for Vercel-compatible SSE notifications.
 * Follows clean architecture principles with proper separation of concerns.
 */

import { VercelSSEService, TransferNotification, CreateNotificationRequest, GetNotificationsRequest } from './SSEService';
import { VercelSSECache } from './SSECache';

export interface VercelSSEManagerConfig {
  enableCaching: boolean;
  pollingInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export const VERCEL_SSE_MANAGER_CONFIG: VercelSSEManagerConfig = {
  enableCaching: true,
  pollingInterval: 5000, // 5 seconds
  maxRetries: 5,
  retryDelay: 1000
};

export class VercelSSEManager {
  private static instance: VercelSSEManager;
  
  // Core components
  private cache: VercelSSECache;
  
  // Client state
  private isConnected: boolean = false;
  private userId: string | null = null;
  private userType: string | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  
  // Subscribers
  private subscribers: Map<string, (notification: TransferNotification) => void> = new Map();
  
  // Configuration
  private config: VercelSSEManagerConfig;

  private constructor() {
    this.config = VERCEL_SSE_MANAGER_CONFIG;
    this.cache = VercelSSECache.getInstance();
  }

  public static getInstance(): VercelSSEManager {
    if (!VercelSSEManager.instance) {
      VercelSSEManager.instance = new VercelSSEManager();
    }
    return VercelSSEManager.instance;
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

      console.log('🔌 Vercel SSE Manager connected:', { userId, userType });
      return { success: true };

    } catch (error) {
      console.error('❌ Vercel SSE Manager connection failed:', error);
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

    console.log('🔌 Vercel SSE Manager disconnected');
  }

  /**
   * Subscribe to notifications
   */
  public subscribe(
    id: string, 
    callback: (notification: TransferNotification) => void
  ): () => void {
    this.subscribers.set(id, callback);
    console.log('📡 Vercel SSE Manager: Subscribed', { id });
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      console.log('📡 Vercel SSE Manager: Unsubscribed', { id });
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
   * Create a transfer notification
   */
  public async createTransferNotification(
    request: CreateNotificationRequest
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      // Use service layer
      const result = await VercelSSEService.createTransferNotification(request);

      if (result.success && result.notificationId) {
        // Cache notification if enabled
        if (this.config.enableCaching) {
          // Get the created notification and cache it
          const notifications = await VercelSSEService.getUserNotifications({
            userId: this.userId || '',
            userType: this.userType || '',
            limit: 1
          });
          
          if (notifications.length > 0) {
            this.cache.setNotification(result.notificationId, notifications[0]);
          }
        }
      }

      return result;

    } catch (error) {
      console.error('❌ Vercel SSE Manager: Failed to create notification:', error);
      return {
        success: false,
        error: 'Failed to create notification'
      };
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use service layer
      const result = await VercelSSEService.markNotificationAsRead(notificationId);

      if (result.success && this.config.enableCaching) {
        // Remove from cache
        this.cache.removeNotification(notificationId);
      }

      return result;

    } catch (error) {
      console.error('❌ Vercel SSE Manager: Failed to mark as read:', error);
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
      return await VercelSSEService.getNotificationStatistics();
    } catch (error) {
      console.error('❌ Vercel SSE Manager: Failed to get stats:', error);
      return null;
    }
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
      // Use service layer
      const request: GetNotificationsRequest = {
        userId: this.userId,
        userType: this.userType,
        limit: 10
      };

      const notifications = await VercelSSEService.getUserNotifications(request);

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
   * Get cache statistics
   */
  public getCacheStats(): any {
    if (!this.config.enableCaching) {
      return null;
    }
    return this.cache.getCacheStats();
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    console.log('🧹 Vercel SSE Manager: Cleaning up');
    this.disconnect();
    this.subscribers.clear();
    
    if (this.config.enableCaching) {
      this.cache.cleanup();
    }
  }
}

// Export singleton instance
export const vercelSSEManager = VercelSSEManager.getInstance();
