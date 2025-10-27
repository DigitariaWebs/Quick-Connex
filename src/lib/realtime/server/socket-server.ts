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
import { SOCKET_EVENTS, ERROR_CODES, ROOM_PATTERNS } from '../core/constants';
import { AuthService } from '@/lib/auth';
import { AuthenticatedSocket } from '../core/types';
import { authenticateSocket } from './auth';
import { AppError } from '@/lib/utils/error-handling';

// ===== SOCKET SERVER SETUP =====

export class SocketServer {
  private io: SocketIOServer | null = null;
  private realtimeService: RealtimeService;
  private eventTracking: Map<string, { events: number[]; lastCleanup: number }> = new Map();
  private socketConnections: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null; // userId -> Set of socketIds

  constructor() {
    this.realtimeService = RealtimeService.getInstance();
    
    // Set up periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, 5 * 60 * 1000);
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
        transports: REALTIME_CONFIG.socket.transports,
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
      this.realtimeService.initialize(this.io);

      log.info('Socket.io server initialized successfully', {
        path: REALTIME_CONFIG.socket.path,
        transports: REALTIME_CONFIG.socket.transports,
        cors: REALTIME_CONFIG.socket.cors,
        pingInterval: REALTIME_CONFIG.socket.pingInterval,
        pingTimeout: REALTIME_CONFIG.socket.pingTimeout
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
   * Get connection metrics
   */
  public getMetrics(): {
    totalConnections: number;
    connectionsPerUser: Record<string, number>;
    activeRooms: string[];
    eventTrackingSize: number;
  } {
    const totalConnections = this.io?.sockets.sockets.size || 0;
    const connectionsPerUser: Record<string, number> = {};
    const activeRooms: string[] = [];

    // Count connections per user
    this.socketConnections.forEach((socketIds, userId) => {
      connectionsPerUser[userId] = socketIds.size;
    });

    // Get active rooms (excluding socket IDs)
    if (this.io) {
      const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
      activeRooms.push(...rooms.filter(room => !this.io?.sockets.sockets.has(room)));
    }

    return {
      totalConnections,
      connectionsPerUser,
      activeRooms,
      eventTrackingSize: this.eventTracking.size
    };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    if (!this.io) return;

    log.info('Shutting down Socket.io server...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all socket connections
    this.io.sockets.sockets.forEach(socket => {
      socket.disconnect(true);
    });

    // Close the server
    this.io.close();

    // Clear tracking data
    this.eventTracking.clear();
    this.socketConnections.clear();

    log.info('Socket.io server shutdown completed');
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
    this.io.use(authenticateSocket);

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      try {
        await this.handleRateLimit(socket as AuthenticatedSocket);
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
      this.handleConnection(socket as AuthenticatedSocket);
    });

    // Handle server errors
    this.io.on('error', (error) => {
      log.error('Socket.io server error:', error);
    });
  }

  private async setupRoomManagement(): Promise<void> {
    if (!this.io) return;

    // Track active rooms and their members
    this.io.sockets.adapter.on('create-room', (room: string) => {
      log.debug('Room created', { room });
    });

    this.io.sockets.adapter.on('delete-room', (room: string) => {
      log.debug('Room deleted', { room });
    });

    this.io.sockets.adapter.on('join-room', (room: string, id: string) => {
      log.debug('Socket joined room', { room, socketId: id });
    });

    this.io.sockets.adapter.on('leave-room', (room: string, id: string) => {
      log.debug('Socket left room', { room, socketId: id });
    });

    log.debug('Room management setup completed');
  }


  private async handleRateLimit(socket: AuthenticatedSocket): Promise<void> {
    // Track events per socket per time window
    const socketId = socket.id;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxEvents = 100; // 100 events per minute

    // Initialize tracking if not exists
    if (!this.eventTracking.has(socketId)) {
      this.eventTracking.set(socketId, {
        events: [],
        lastCleanup: now
      });
    }

    const tracking = this.eventTracking.get(socketId)!;
    
    // Clean up old events
    if (now - tracking.lastCleanup > windowMs) {
      tracking.events = tracking.events.filter(time => now - time < windowMs);
      tracking.lastCleanup = now;
    }

    // Check if rate limit exceeded
    if (tracking.events.length >= maxEvents) {
      log.warn('Rate limit exceeded for socket', {
        socketId,
        userId: socket.userId,
        eventCount: tracking.events.length,
        maxEvents
      });
      
      throw new AppError(
        'Rate limit exceeded',
        429,
        ERROR_CODES.RATE_LIMITED
      );
    }

    // Add current event
    tracking.events.push(now);
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const connectionInfo = {
      id: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      userEmail: socket.userEmail,
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      connectedAt: new Date()
    };

    log.info('User connected to Socket.io', connectionInfo);

    // Track socket connections per user
    if (socket.userId) {
      if (!this.socketConnections.has(socket.userId)) {
        this.socketConnections.set(socket.userId, new Set());
      }
      
      const userSockets = this.socketConnections.get(socket.userId)!;
      const maxConnections = 5;
      
      if (userSockets.size >= maxConnections) {
        log.warn('User has too many connections, disconnecting oldest', {
          userId: socket.userId,
          currentConnections: userSockets.size,
          maxConnections
        });
        
        // Disconnect oldest socket (first in set)
        const oldestSocketId = userSockets.values().next().value;
        if (oldestSocketId) {
          const oldestSocket = this.io?.sockets.sockets.get(oldestSocketId);
          if (oldestSocket) {
            oldestSocket.disconnect(true);
          }
          userSockets.delete(oldestSocketId);
        }
      }
      
      userSockets.add(socket.id);
    }

    // Join user-specific room
    if (socket.userId) {
      socket.join(ROOM_PATTERNS.USER(socket.userId));
      log.debug('User joined personal room', {
        socketId: socket.id,
        userId: socket.userId,
        room: ROOM_PATTERNS.USER(socket.userId)
      });
    }

    // Join role-specific room
    if (socket.userType) {
      socket.join(ROOM_PATTERNS.ROLE(socket.userType));
      log.debug('User joined role room', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType,
        room: ROOM_PATTERNS.ROLE(socket.userType)
      });
    }

    // Join admin room if user is admin
    if (socket.userType === 'admin' || socket.userType === 'super_admin') {
      socket.join(ROOM_PATTERNS.ADMIN);
      log.debug('Admin user joined admin room', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType
      });
    }

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      this.handleDisconnection(socket as AuthenticatedSocket, reason);
    });

    // Handle custom events
    this.setupCustomEventHandlers(socket as AuthenticatedSocket);

    // Send connection confirmation
    socket.emit(SOCKET_EVENTS.CONNECTION, {
      success: true,
      message: 'Connected successfully',
      userId: socket.userId,
      userType: socket.userType,
      timestamp: new Date()
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const disconnectionInfo = {
      id: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      reason,
      disconnectedAt: new Date()
    };

    log.info('User disconnected from Socket.io', disconnectionInfo);

    // Clean up socket tracking
    if (socket.userId) {
      const userSockets = this.socketConnections.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.socketConnections.delete(socket.userId);
        }
      }
    }

    // Clean up event tracking
    this.eventTracking.delete(socket.id);

    // Leave all rooms (iterate through rooms)
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) { // Don't leave the socket's own room
        socket.leave(room);
      }
    });

    // Clean up any user-specific data
    // This will be handled by RealtimeService
  }

  private setupCustomEventHandlers(socket: AuthenticatedSocket): void {
    // Handle notification events
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (data: any) => {
      try {
        await this.handleNotificationRead(socket, data);
      } catch (error) {
        log.error('Error handling notification read:', error);
        socket.emit('error', {
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
        socket.emit('error', {
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

  private async handleNotificationRead(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { notificationId } = data;
    
    if (!notificationId) {
      throw new AppError('Notification ID is required', 400, ERROR_CODES.INVALID_INPUT);
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

  private async handleNotificationDismissed(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { notificationId } = data;
    
    if (!notificationId) {
      throw new AppError('Notification ID is required', 400, ERROR_CODES.INVALID_INPUT);
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

  private handleUserPresence(socket: AuthenticatedSocket, data: any): void {
    const { status } = data;
    
    if (!status || !['online', 'offline'].includes(status)) {
      socket.emit('error', {
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

  /**
   * Perform periodic cleanup of stale tracking data
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const staleThreshold = 15 * 60 * 1000; // 15 minutes
    
    // Clean up event tracking for disconnected sockets
    for (const [socketId, tracking] of this.eventTracking.entries()) {
      if (now - tracking.lastCleanup > staleThreshold) {
        // Check if socket still exists
        if (!this.io?.sockets.sockets.has(socketId)) {
          this.eventTracking.delete(socketId);
          log.debug('Cleaned up stale event tracking', { socketId });
        }
      }
    }
    
    // Clean up socket connections with no active sockets
    for (const [userId, socketIds] of this.socketConnections.entries()) {
      // Remove socketIds that don't exist anymore
      const validSocketIds = Array.from(socketIds).filter(id => 
        this.io?.sockets.sockets.has(id)
      );
      
      if (validSocketIds.length === 0) {
        this.socketConnections.delete(userId);
        log.debug('Cleaned up user with no active sockets', { userId });
      } else if (validSocketIds.length !== socketIds.size) {
        // Update with only valid socket IDs
        this.socketConnections.set(userId, new Set(validSocketIds));
        log.debug('Cleaned up orphaned socket IDs', { 
          userId, 
          removed: socketIds.size - validSocketIds.length 
        });
      }
    }
    
    log.info('Periodic cleanup completed', {
      eventTrackingSize: this.eventTracking.size,
      connectedUsers: this.socketConnections.size,
      totalSockets: this.io?.sockets.sockets.size || 0
    });
  }
}

// ===== EXPORTS =====

export default SocketServer;
