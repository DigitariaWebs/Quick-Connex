/**
 * Real-time Testing Utilities
 * 
 * Utilities for testing the real-time notification system.
 * Includes socket event testing, notification testing, and health checks.
 */

import { SocketProvider } from '../providers';
import { NotificationService } from '../core';
import { PushProvider } from '../providers';
import { log } from '@/lib/logging';
import { 
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_ROLES
} from '../core/constants';
import { 
  AppError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== TESTING UTILITIES =====

export class RealtimeTestingUtils {
  private static instance: RealtimeTestingUtils;
  private socketProvider: SocketProvider;
  private notificationService: NotificationService;
  private pushProvider: PushProvider;

  private constructor() {
    this.socketProvider = SocketProvider.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.pushProvider = PushProvider.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RealtimeTestingUtils {
    if (!RealtimeTestingUtils.instance) {
      RealtimeTestingUtils.instance = new RealtimeTestingUtils();
    }
    return RealtimeTestingUtils.instance;
  }

  /**
   * Test socket connection
   */
  public async testSocketConnection(): Promise<{
    success: boolean;
    stats: any;
    error?: string;
  }> {
    try {
      const stats = this.socketProvider.getConnectionStats();
      
      return {
        success: true,
        stats
      };

    } catch (error) {
      log.error('Socket connection test failed:', error);
      return {
        success: false,
        stats: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test notification creation and delivery
   */
  public async testNotification(
    targetUserId: string,
    testData?: any
  ): Promise<{
    success: boolean;
    notification?: any;
    deliveries?: any[];
    error?: string;
  }> {
    try {
      const notificationData = {
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        title: testData?.title || 'Test Notification',
        message: testData?.message || 'This is a test notification from the admin panel',
        targetUsers: [targetUserId],
        targetRoles: [],
        data: {
          test: true,
          timestamp: new Date(),
          ...testData
        }
      };

      const result = await this.notificationService.createAndSendNotification(
        notificationData,
        ['realtime'],
        'system'
      );

      return {
        success: true,
        notification: result.notification,
        deliveries: result.results
      };

    } catch (error) {
      log.error('Notification test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test Web Push notifications
   */
  public async testWebPush(
    targetUserId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.pushProvider.isAvailable()) {
        return {
          success: false,
          error: 'Web Push not available'
        };
      }

      await this.pushProvider.sendPushNotification(targetUserId, {
        title: 'Test Push Notification',
        message: 'This is a test push notification from the admin panel',
        type: NOTIFICATION_TYPES.SYSTEM,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        data: {
          test: true,
          timestamp: new Date()
        }
      });

      return {
        success: true
      };

    } catch (error) {
      log.error('Web Push test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test socket event emission
   */
  public async testSocketEvent(
    eventType: string,
    targetUserId: string,
    payload?: any
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const testPayload = {
        message: 'Test socket event from admin panel',
        timestamp: new Date(),
        ...payload
      };

      await this.socketProvider.emitToUser(targetUserId, eventType as any, testPayload);

      return {
        success: true
      };

    } catch (error) {
      log.error('Socket event test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test broadcast message
   */
  public async testBroadcast(
    message: string,
    targetRole?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const broadcastPayload = {
        message,
        timestamp: new Date(),
        source: 'admin-test'
      };

      if (targetRole) {
        await this.socketProvider.emitToRole(targetRole as any, 'test:broadcast', broadcastPayload);
      } else {
        await this.socketProvider.broadcast('test:broadcast', broadcastPayload);
      }

      return {
        success: true
      };

    } catch (error) {
      log.error('Broadcast test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<{
    socket: any;
    notifications: any;
    webPush: any;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    try {
      const socketStats = this.socketProvider.getConnectionStats();
      const notificationStats = await this.notificationService.getNotificationStats();
      const pushStats = await this.pushProvider.getSubscriptionStats();

      // Determine overall health
      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (socketStats.total === 0) {
        overall = 'degraded';
      }
      
      if (!this.pushProvider.isAvailable()) {
        overall = 'degraded';
      }

      return {
        socket: socketStats,
        notifications: notificationStats,
        webPush: pushStats,
        overall
      };

    } catch (error) {
      log.error('Health check failed:', error);
      return {
        socket: null,
        notifications: null,
        webPush: null,
        overall: 'unhealthy'
      };
    }
  }

  /**
   * Run comprehensive system test
   */
  public async runSystemTest(targetUserId: string): Promise<{
    success: boolean;
    results: {
      socket: any;
      notification: any;
      webPush: any;
      health: any;
    };
    error?: string;
  }> {
    try {
      const results = {
        socket: await this.testSocketConnection(),
        notification: await this.testNotification(targetUserId),
        webPush: await this.testWebPush(targetUserId),
        health: await this.getSystemHealth()
      };

      const allSuccessful = results.socket.success && 
                           results.notification.success && 
                           results.webPush.success && 
                           results.health.overall !== 'unhealthy';

      return {
        success: allSuccessful,
        results
      };

    } catch (error) {
      log.error('System test failed:', error);
      return {
        success: false,
        results: {
          socket: { success: false },
          notification: { success: false },
          webPush: { success: false },
          health: { overall: 'unhealthy' }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate test data
   */
  public generateTestData(type: 'notification' | 'transfer' | 'user'): any {
    const timestamp = new Date();
    
    switch (type) {
      case 'notification':
        return {
          title: `Test Notification ${timestamp.getTime()}`,
          message: 'This is a test notification generated by the admin panel',
          type: NOTIFICATION_TYPES.SYSTEM,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          data: {
            test: true,
            timestamp,
            generatedBy: 'admin-panel'
          }
        };
      
      case 'transfer':
        return {
          transferId: `TEST-${timestamp.getTime()}`,
          patient: {
            firstName: 'Test',
            lastName: 'Patient',
            patientId: `TEST-PATIENT-${timestamp.getTime()}`
          },
          fromHospital: 'Test Hospital A',
          toHospital: 'Test Hospital B',
          priority: 'medium',
          status: 'pending',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        };
      
      case 'user':
        return {
          firstName: 'Test',
          lastName: 'User',
          email: `test-${timestamp.getTime()}@example.com`,
          userType: USER_ROLES.EMPLOYEE,
          phone: '+1234567890'
        };
      
      default:
        return {};
    }
  }
}

// ===== EXPORTS =====

export default RealtimeTestingUtils;
