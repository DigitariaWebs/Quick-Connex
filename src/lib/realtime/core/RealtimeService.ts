/**
 * Real-time Notifications System Core Service
 * 
 * Main service class for managing real-time notifications, Socket.io connections,
 * and Web Push subscriptions. Follows singleton pattern like AuthService.
 */

import { Server as SocketIOServer } from 'socket.io';
import { DatabaseService } from '@/lib/database';
import { AuditService } from '@/lib/audit';
import { AuditAction, TargetResourceType, ActorType } from '@/models/AuditLog';
import { log } from '@/lib/logging';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { 
  toStringId, 
  toStringIds, 
  toObjectId, 
  toObjectIds,
  getIdString,
  toStringIdRequired
} from '@/lib/utils/object-id';
import { 
  RealtimeNotification,
  SocketEvent,
  SocketEventType,
  NotificationType,
  NotificationPriority,
  DeliveryResult,
  UserRole,
  RealtimeAnalytics,
  RealtimeError,
  RealtimeErrorCode,
  DeliveryMethod
} from './types';
import { 
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  DELIVERY_METHODS,
  TIMING,
  ERROR_CODES,
  DEFAULTS
} from './constants';
import { REALTIME_CONFIG } from './config';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  retry,
  withTimeout,
  batchProcess 
} from '@/lib/utils/async-helpers';
import { 
  sanitizeString,
  sanitizeQueryInput 
} from '@/lib/utils/request-validation';
import { 
  pickFields,
  omitFields,
  isEmpty 
} from '@/lib/utils/data-helpers';
import { 
  getCurrentTimestamp,
  isValidDate 
} from '@/lib/utils/date-time';
import { 
  truncate,
  capitalize 
} from '@/lib/utils/string-helpers';

// ===== MAIN REALTIME SERVICE =====

export class RealtimeService {
  private static instance: RealtimeService;
  private io: SocketIOServer | null = null;
  private connections: Map<string, any> = new Map();
  private analytics: RealtimeAnalytics = {
    connections: {
      total: 0,
      active: 0,
      byRole: {
        employee: 0,
        manager: 0,
        admin: 0,
        super_admin: 0
      }
    },
    notifications: {
      sent: 0,
      delivered: 0,
      failed: 0,
      byType: {
        transfer_status_change: 0,
        new_transfer: 0,
        urgent_transfer: 0,
        transfer_reminder: 0,
        system: 0,
        scheduling: 0,
        user_approval: 0,
        dashboard_update: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    },
    performance: {
      averageDeliveryTime: 0,
      socketLatency: 0,
      errorRate: 0
    }
  };

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Initialize Socket.io server
   */
  public async initializeSocketIO(server: any): Promise<void> {
    try {
      if (this.io) {
        log.warn('Socket.io server already initialized');
        return;
      }

      log.info('Initializing Socket.io server...');

      this.io = new SocketIOServer(server, {
        path: REALTIME_CONFIG.socket.path,
        transports: REALTIME_CONFIG.socket.transports as any,
        pingInterval: REALTIME_CONFIG.socket.pingInterval,
        pingTimeout: REALTIME_CONFIG.socket.pingTimeout,
        maxHttpBufferSize: REALTIME_CONFIG.socket.maxHttpBufferSize,
        cors: REALTIME_CONFIG.socket.cors
      });

      // Set up authentication middleware
      this.setupAuthenticationMiddleware();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Set up room management
      this.setupRoomManagement();

      log.info('Socket.io server initialized successfully');
      
    } catch (error) {
      log.error('Failed to initialize Socket.io server:', error);
      throw new AppError(
        'Failed to initialize real-time server',
        500,
        ERROR_CODES.CONNECTION_FAILED
      );
    }
  }

  /**
   * Create a new notification
   */
  public async createNotification(
    notificationData: Partial<RealtimeNotification>,
    createdBy?: string
  ): Promise<RealtimeNotification> {
    try {
      // Validate notification data
      const validated = this.validateNotificationData(notificationData);
      
      // Create notification ID
      const notificationId = this.generateNotificationId();
      
      // Create notification document
      const notification = await DatabaseService.create(Notification, {
        id: notificationId,
        type: validated.type || DEFAULTS.NOTIFICATION_PRIORITY,
        priority: validated.priority || DEFAULTS.NOTIFICATION_PRIORITY,
        title: validated.title,
        message: validated.message,
        targetUsers: validated.targetUsers || [],
        targetRoles: validated.targetRoles || [],
        excludeUsers: validated.excludeUsers || [],
        transferId: validated.transferId,
        data: validated.data || {},
        deliveries: [],
        settings: {
          persistent: validated.settings?.persistent ?? true,
          expiresAt: validated.settings?.expiresAt,
          maxDeliveries: validated.settings?.maxDeliveries || REALTIME_CONFIG.notifications.maxRetries,
          retryInterval: validated.settings?.retryInterval || REALTIME_CONFIG.notifications.retryDelay
        },
        status: DEFAULTS.NOTIFICATION_STATUS,
        deliveryAttempts: 0,
        createdBy: createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update analytics
      this.updateAnalytics('notification_created', notification);

      // Log audit event
      await AuditService.logCommunication({
        action: AuditAction.NOTIFICATION_SENT,
        actorId: createdBy || 'system',
        actorType: ActorType.USER,
        description: `Notification created: ${notification.title}`,
        targetResourceType: TargetResourceType.NOTIFICATION,
        targetResourceId: notificationId,
        details: {
          type: notification.type,
          priority: notification.priority,
          targetUsers: notification.targetUsers.length,
          targetRoles: notification.targetRoles.length
        }
      });

      log.info('Notification created successfully', {
        notificationId,
        type: notification.type,
        priority: notification.priority
      });

      // Convert to RealtimeNotification format
      const realtimeNotification: RealtimeNotification = {
        id: getIdString(notification),
        type: notification.type as NotificationType,
        priority: notification.priority as NotificationPriority,
        title: notification.title,
        message: notification.message,
        targetUsers: notification.targetUsers,
        targetRoles: notification.targetRoles as UserRole[],
        excludeUsers: notification.excludeUsers,
        transferId: notification.transferId,
        data: notification.data,
        deliveries: notification.deliveries.map(delivery => ({
          userId: delivery.userId,
          deliveredAt: delivery.deliveredAt,
          readAt: delivery.readAt,
          dismissedAt: delivery.dismissedAt,
          deliveryMethod: delivery.deliveryMethod
        })),
        settings: notification.settings,
        status: notification.status as any,
        deliveryAttempts: notification.deliveryAttempts,
        lastDeliveryAttempt: notification.lastDeliveryAttempt,
        createdBy: notification.createdBy,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      };

      return realtimeNotification;

    } catch (error) {
      log.error('Failed to create notification:', error);
      
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      const errorInfo = formatErrorForClient(error);
      throw new AppError(
        errorInfo.message,
        500,
        ERROR_CODES.NOTIFICATION_SEND_FAILED
      );
    }
  }

  /**
   * Send notification to users
   */
  public async sendNotification(
    notification: RealtimeNotification,
    channels: DeliveryMethod[] = [DELIVERY_METHODS.REALTIME]
  ): Promise<DeliveryResult[]> {
    try {
      const results: DeliveryResult[] = [];
      
      // Get target users
      const targetUsers = await this.getTargetUsers(notification);
      
      if (targetUsers.length === 0) {
        log.warn('No target users found for notification', {
          notificationId: notification.id
        });
        return results;
      }

      // Send via each channel
      for (const channel of channels) {
        const channelResults = await this.sendViaChannel(
          notification,
          targetUsers,
          channel
        );
        results.push(...channelResults);
      }

      // Update notification status
      await this.updateNotificationStatus(toStringIdRequired(notification.id), results);

      // Update analytics
      this.updateAnalytics('notification_sent', notification, results);

      log.info('Notification sent successfully', {
        notificationId: notification.id,
        targetUsers: targetUsers.length,
        channels: channels.length,
        results: results.length
      });

      return results;

    } catch (error) {
      log.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Emit event to specific user
   */
  public emitToUser(userId: string, event: SocketEventType, payload: any): void {
    if (!this.io) {
      log.warn('Socket.io server not initialized');
      return;
    }

    const room = `user:${userId}`;
    this.io.to(room).emit(event, {
      ...payload,
      timestamp: new Date(),
      userId
    });

    log.debug('Event emitted to user', {
      userId,
      event,
      room
    });
  }

  /**
   * Emit event to users by role
   */
  public emitToRole(userRole: UserRole, event: SocketEventType, payload: any): void {
    if (!this.io) {
      log.warn('Socket.io server not initialized');
      return;
    }

    const room = `role:${userRole}`;
    this.io.to(room).emit(event, {
      ...payload,
      timestamp: new Date(),
      userRole
    });

    log.debug('Event emitted to role', {
      userRole,
      event,
      room
    });
  }

  /**
   * Emit event to specific room
   */
  public emitToRoom(room: string, event: SocketEventType, payload: any): void {
    if (!this.io) {
      log.warn('Socket.io server not initialized');
      return;
    }

    this.io.to(room).emit(event, {
      ...payload,
      timestamp: new Date(),
      room
    });

    log.debug('Event emitted to room', {
      room,
      event
    });
  }

  /**
   * Broadcast event to all connected users
   */
  public broadcast(event: SocketEventType, payload: any): void {
    if (!this.io) {
      log.warn('Socket.io server not initialized');
      return;
    }

    this.io.emit(event, {
      ...payload,
      timestamp: new Date()
    });

    log.debug('Event broadcasted', {
      event,
      connections: this.connections.size
    });
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): any {
    return {
      total: this.connections.size,
      active: Array.from(this.connections.values()).filter((conn: any) => 
        conn.socket && conn.socket.connected
      ).length,
      byRole: this.analytics.connections.byRole
    };
  }

  /**
   * Get analytics data
   */
  public getAnalytics(): RealtimeAnalytics {
    return { ...this.analytics };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      
      this.connections.clear();
      
      log.info('RealtimeService cleanup completed');
      
    } catch (error) {
      log.error('Error during RealtimeService cleanup:', error);
    }
  }

  // ===== PRIVATE METHODS =====

  private setupAuthenticationMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token (integrate with AuthService)
        // const user = await AuthService.verifyToken(token);
        // socket.userId = user.id;
        // socket.userType = user.userType;
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      this.handleConnection(socket);
    });
  }

  private setupRoomManagement(): void {
    // Room management logic will be implemented here
  }

  private handleConnection(socket: any): void {
    const connectionId = socket.id;
    const userId = socket.userId;
    const userType = socket.userType;

    // Store connection
    this.connections.set(connectionId, {
      socket,
      userId,
      userType,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Update analytics
    this.analytics.connections.total++;
    this.analytics.connections.active++;
    if (userType) {
      this.analytics.connections.byRole[userType as UserRole]++;
    }

    // Join user-specific room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join role-specific room
    if (userType) {
      socket.join(`role:${userType}`);
    }

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.handleDisconnection(connectionId, userId, userType);
    });

    log.info('User connected', {
      connectionId,
      userId,
      userType,
      totalConnections: this.connections.size
    });
  }

  private handleDisconnection(connectionId: string, userId?: string, userType?: UserRole): void {
    this.connections.delete(connectionId);
    
    // Update analytics
    this.analytics.connections.active--;
    if (userType) {
      this.analytics.connections.byRole[userType]--;
    }

    log.info('User disconnected', {
      connectionId,
      userId,
      userType,
      remainingConnections: this.connections.size
    });
  }

  private validateNotificationData(data: Partial<RealtimeNotification>): Partial<RealtimeNotification> {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      errors.push('Message is required');
    }

    if (data.title && data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (data.message && data.message.length > 500) {
      errors.push('Message must be 500 characters or less');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }

    return {
      ...data,
      title: data.title?.trim(),
      message: data.message?.trim()
    };
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getTargetUsers(notification: RealtimeNotification): Promise<any[]> {
    const query: any = {
      $and: []
    };

    // Add user targeting
    if (notification.targetUsers.length > 0) {
      query.$and.push({
        _id: { $in: notification.targetUsers }
      });
    }

    // Add role targeting
    if (notification.targetRoles.length > 0) {
      query.$and.push({
        userType: { $in: notification.targetRoles }
      });
    }

    // Exclude users
    if (notification.excludeUsers.length > 0) {
      query.$and.push({
        _id: { $nin: notification.excludeUsers }
      });
    }

    // If no targeting specified, return empty array
    if (query.$and.length === 0) {
      return [];
    }

    return await DatabaseService.findMany(User, query);
  }

  private async sendViaChannel(
    notification: RealtimeNotification,
    targetUsers: any[],
    channel: DeliveryMethod
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    switch (channel) {
      case DELIVERY_METHODS.REALTIME:
        results.push(...await this.sendRealtime(notification, targetUsers));
        break;
      case DELIVERY_METHODS.EMAIL:
        // Integrate with CommunicationService
        break;
      case DELIVERY_METHODS.SMS:
        // Integrate with CommunicationService
        break;
      case DELIVERY_METHODS.PUSH:
        results.push(...await this.sendPush(notification, targetUsers));
        break;
    }

    return results;
  }

  private async sendRealtime(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const user of targetUsers) {
      try {
        this.emitToUser(user._id.toString(), SOCKET_EVENTS.NOTIFICATION_NEW, {
          notification: {
            id: notification.id,
            type: notification.type,
            priority: notification.priority,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            createdAt: notification.createdAt
          }
        });

        results.push({
          success: true,
          method: DELIVERY_METHODS.REALTIME,
          userId: user._id.toString(),
          notificationId: notification.id,
          timestamp: new Date()
        });

      } catch (error) {
        results.push({
          success: false,
          method: DELIVERY_METHODS.REALTIME,
          userId: user._id.toString(),
          notificationId: notification.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  private async sendPush(
    notification: RealtimeNotification,
    targetUsers: any[]
  ): Promise<DeliveryResult[]> {
    // Web Push implementation will be added in Phase 2
    return [];
  }

  private async updateNotificationStatus(
    notificationId: string,
    results: DeliveryResult[]
  ): Promise<void> {
    const successfulDeliveries = results.filter(r => r.success);
    const failedDeliveries = results.filter(r => !r.success);

    await DatabaseService.updateOne(
      Notification,
      { id: notificationId },
      {
        $push: {
          deliveries: {
            $each: successfulDeliveries.map(r => ({
              userId: r.userId,
              deliveredAt: r.timestamp,
              deliveryMethod: r.method
            }))
          }
        },
        $inc: { deliveryAttempts: results.length },
        $set: {
          lastDeliveryAttempt: new Date(),
          status: failedDeliveries.length === 0 ? 'delivered' : 'failed'
        }
      }
    );
  }

  private updateAnalytics(
    event: string,
    notification: any,
    results?: DeliveryResult[]
  ): void {
    switch (event) {
      case 'notification_created':
        this.analytics.notifications.sent++;
        this.analytics.notifications.byType[notification.type as NotificationType]++;
        this.analytics.notifications.byPriority[notification.priority as NotificationPriority]++;
        break;
      
      case 'notification_sent':
        if (results) {
          const successful = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);
          
          this.analytics.notifications.delivered += successful.length;
          this.analytics.notifications.failed += failed.length;
        }
        break;
    }
  }
}

// ===== EXPORTS =====

export default RealtimeService;
