/**
 * Socket.io Server Setup
 * 
 * Main Socket.io server initialization and configuration.
 * Handles both custom server and Next.js integration.
 */

import { Server as SocketIOServer } from 'socket.io';
import { RealtimeService } from '../core';
import { log } from '@/lib/logging';
import { REALTIME_CONFIG } from '../core/config';
import { SOCKET_EVENTS, ERROR_CODES } from '../core/constants';
import { AuthService } from '@/lib/auth';
import { verifyToken } from '@/lib/auth/jwt-standalone';
import { AppError } from '@/lib/utils/error-handling';

// ===== SOCKET SERVER SETUP =====

export class SocketServer {
  private io: SocketIOServer | null = null;
  private realtimeService: RealtimeService;

  constructor() {
    this.realtimeService = RealtimeService.getInstance();
  }

  /**
   * Initialize Socket.io server
   */
  public async initialize(server: any): Promise<SocketIOServer> {
    try {
      if (this.io) {
        log.warn('Socket.io server already initialized');
        return this.io;
      }

      log.info('Initializing Socket.io server...');

      // Create Socket.io server
      this.io = new SocketIOServer(server, {
        path: REALTIME_CONFIG.socket.path,
        transports: REALTIME_CONFIG.socket.transports as any,
        pingInterval: REALTIME_CONFIG.socket.pingInterval,
        pingTimeout: REALTIME_CONFIG.socket.pingTimeout,
        maxHttpBufferSize: REALTIME_CONFIG.socket.maxHttpBufferSize,
        cors: REALTIME_CONFIG.socket.cors,
        allowEIO3: true // For compatibility
      });

      // Set up middleware and handlers
      await this.setupMiddleware();
      await this.setupEventHandlers();
      await this.setupRoomManagement();

      // Initialize RealtimeService with Socket.io instance
      await this.realtimeService.initializeSocketIO(server);

      log.info('Socket.io server initialized successfully', {
        path: REALTIME_CONFIG.socket.path,
        transports: REALTIME_CONFIG.socket.transports,
        cors: REALTIME_CONFIG.socket.cors
      });

      return this.io;

    } catch (error) {
      log.error('Failed to initialize Socket.io server:', error);
      throw new AppError(
        'Failed to initialize Socket.io server',
        500,
        ERROR_CODES.CONNECTION_FAILED
      );
    }
  }

  /**
   * Get Socket.io instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Close Socket.io server
   */
  public async close(): Promise<void> {
    try {
      if (this.io) {
        this.io.close();
        this.io = null;
        log.info('Socket.io server closed');
      }
    } catch (error) {
      log.error('Error closing Socket.io server:', error);
    }
  }

  // ===== PRIVATE METHODS =====

  private async setupMiddleware(): Promise<void> {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        await this.handleAuthentication(socket);
        next();
      } catch (error) {
        log.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      try {
        await this.handleRateLimit(socket);
        next();
      } catch (error) {
        log.error('Socket rate limit exceeded:', error);
        next(new Error('Rate limit exceeded'));
      }
    });

    // Logging middleware
    this.io.use(async (socket, next) => {
      log.debug('Socket connection attempt', {
        id: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      });
      next();
    });
  }

  private async setupEventHandlers(): Promise<void> {
    if (!this.io) return;

    this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      this.handleConnection(socket);
    });

    // Handle server errors
    this.io.on('error', (error) => {
      log.error('Socket.io server error:', error);
    });
  }

  private async setupRoomManagement(): Promise<void> {
    if (!this.io) return;

    // Room management will be handled by RealtimeService
    log.debug('Room management setup completed');
  }

  private async handleAuthentication(socket: any): Promise<void> {
    try {
      // Get token from auth header or handshake
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                   socket.handshake.headers.cookie?.match(/token=([^;]+)/)?.[1];

      if (!token) {
        throw new AppError('Authentication token required', 401, ERROR_CODES.AUTHENTICATION_FAILED);
      }

      // Verify token using JWT standalone
      const payload = await verifyToken(token);
      
      if (!payload) {
        throw new AppError('Invalid authentication token', 401, ERROR_CODES.AUTHENTICATION_FAILED);
      }

      // Attach user info to socket
      socket.userId = payload.userId;
      socket.userType = payload.userType;
      socket.userEmail = payload.email;
      // userName not available in JWT payload

      log.debug('Socket authenticated successfully', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType
      });

    } catch (error) {
      log.error('Socket authentication error:', error);
      throw error;
    }
  }

  private async handleRateLimit(socket: any): Promise<void> {
    // Rate limiting will be implemented here
    // For now, just pass through
    return Promise.resolve();
  }

  private handleConnection(socket: any): void {
    const connectionInfo = {
      id: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      userEmail: socket.userEmail,
      userName: socket.userName,
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: new Date()
    };

    log.info('User connected to Socket.io', connectionInfo);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      log.debug('User joined personal room', {
        socketId: socket.id,
        userId: socket.userId,
        room: `user:${socket.userId}`
      });
    }

    // Join role-specific room
    if (socket.userType) {
      socket.join(`role:${socket.userType}`);
      log.debug('User joined role room', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType,
        room: `role:${socket.userType}`
      });
    }

    // Join admin room if user is admin
    if (socket.userType === 'admin' || socket.userType === 'super_admin') {
      socket.join('admin:all');
      log.debug('Admin user joined admin room', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType
      });
    }

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle custom events
    this.setupCustomEventHandlers(socket);

    // Send connection confirmation
    socket.emit(SOCKET_EVENTS.CONNECTION, {
      success: true,
      message: 'Connected successfully',
      userId: socket.userId,
      userType: socket.userType,
      timestamp: new Date()
    });
  }

  private handleDisconnection(socket: any, reason: string): void {
    const disconnectionInfo = {
      id: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      reason,
      disconnectedAt: new Date()
    };

    log.info('User disconnected from Socket.io', disconnectionInfo);

    // Leave all rooms
    socket.leaveAll();

    // Clean up any user-specific data
    // This will be handled by RealtimeService
  }

  private setupCustomEventHandlers(socket: any): void {
    // Handle notification events
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (data: any) => {
      try {
        await this.handleNotificationRead(socket, data);
      } catch (error) {
        log.error('Error handling notification read:', error);
        socket.emit(SOCKET_EVENTS.ERROR, {
          type: 'notification_read_error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_DISMISSED, async (data: any) => {
      try {
        await this.handleNotificationDismissed(socket, data);
      } catch (error) {
        log.error('Error handling notification dismissed:', error);
        socket.emit(SOCKET_EVENTS.ERROR, {
          type: 'notification_dismissed_error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle presence events
    socket.on(SOCKET_EVENTS.USER_PRESENCE, (data: any) => {
      this.handleUserPresence(socket, data);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });
  }

  private async handleNotificationRead(socket: any, data: any): Promise<void> {
    const { notificationId } = data;
    
    if (!notificationId) {
      throw new AppError('Notification ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Update notification as read
    // This will be implemented in the NotificationService
    log.debug('Notification marked as read', {
      socketId: socket.id,
      userId: socket.userId,
      notificationId
    });

    // Emit confirmation
    socket.emit(SOCKET_EVENTS.NOTIFICATION_READ, {
      success: true,
      notificationId,
      timestamp: new Date()
    });
  }

  private async handleNotificationDismissed(socket: any, data: any): Promise<void> {
    const { notificationId } = data;
    
    if (!notificationId) {
      throw new AppError('Notification ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Update notification as dismissed
    // This will be implemented in the NotificationService
    log.debug('Notification dismissed', {
      socketId: socket.id,
      userId: socket.userId,
      notificationId
    });

    // Emit confirmation
    socket.emit(SOCKET_EVENTS.NOTIFICATION_DISMISSED, {
      success: true,
      notificationId,
      timestamp: new Date()
    });
  }

  private handleUserPresence(socket: any, data: any): void {
    const { status } = data;
    
    if (!status || !['online', 'offline'].includes(status)) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        type: 'invalid_presence_status',
        message: 'Status must be "online" or "offline"'
      });
      return;
    }

    log.debug('User presence updated', {
      socketId: socket.id,
      userId: socket.userId,
      status
    });

    // Broadcast presence to relevant rooms
    socket.to(`role:${socket.userType}`).emit(SOCKET_EVENTS.USER_PRESENCE, {
      userId: socket.userId,
      status,
      timestamp: new Date()
    });
  }
}

// ===== EXPORTS =====

export default SocketServer;
