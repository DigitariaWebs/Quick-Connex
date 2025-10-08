/**
 * Notification Fallback Service
 * Provides graceful degradation when SSE is not available
 */

interface FallbackNotification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

interface FallbackConfig {
  pollingInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export class NotificationFallbackService {
  private static instance: NotificationFallbackService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private config: FallbackConfig;
  private lastCheckTime: Date | null = null;
  private retryCount = 0;

  private constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      pollingInterval: config.pollingInterval || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000, // 5 seconds
    };
  }

  public static getInstance(config?: Partial<FallbackConfig>): NotificationFallbackService {
    if (!NotificationFallbackService.instance) {
      NotificationFallbackService.instance = new NotificationFallbackService(config);
    }
    return NotificationFallbackService.instance;
  }

  /**
   * Start fallback polling when SSE is not available
   */
  public startFallback(
    userId: string,
    onNotification: (notification: FallbackNotification) => void,
    onError: (error: string) => void
  ): void {
    if (this.isActive) {
      console.log('Fallback service already active');
      return;
    }

    console.log('Starting notification fallback service');
    this.isActive = true;
    this.retryCount = 0;
    this.lastCheckTime = new Date();

    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNotifications(userId, onNotification);
        this.retryCount = 0; // Reset retry count on success
      } catch (error) {
        console.error('Fallback polling error:', error);
        this.retryCount++;
        
        if (this.retryCount >= this.config.maxRetries) {
          onError('Fallback service failed after multiple attempts');
          this.stopFallback();
        }
      }
    }, this.config.pollingInterval);
  }

  /**
   * Stop fallback polling
   */
  public stopFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isActive = false;
    console.log('Stopped notification fallback service');
  }

  /**
   * Check for new notifications via API
   */
  private async checkForNotifications(
    userId: string,
    onNotification: (notification: FallbackNotification) => void
  ): Promise<void> {
    const response = await fetch('/api/notifications', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && data.data?.notifications) {
      const notifications = data.data.notifications;
      
      // Only process notifications newer than last check
      const newNotifications = notifications.filter((notification: any) => {
        if (!this.lastCheckTime) return true;
        return new Date(notification.createdAt) > this.lastCheckTime!;
      });

      // Process new notifications
      newNotifications.forEach((notification: any) => {
        const fallbackNotification: FallbackNotification = {
          id: notification.id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          transferId: notification.transferId,
          data: notification.data,
          timestamp: notification.createdAt,
          read: notification.read
        };

        onNotification(fallbackNotification);
      });

      this.lastCheckTime = new Date();
    }
  }

  /**
   * Get fallback service status
   */
  public getStatus(): {
    isActive: boolean;
    retryCount: number;
    lastCheckTime: Date | null;
    config: FallbackConfig;
  } {
    return {
      isActive: this.isActive,
      retryCount: this.retryCount,
      lastCheckTime: this.lastCheckTime,
      config: this.config
    };
  }

  /**
   * Update fallback configuration
   */
  public updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart with new config if active
    if (this.isActive) {
      this.stopFallback();
      // Note: Would need to restart with same callbacks
    }
  }
}
