/**
 * Realtime Service
 * 
 * Main service for realtime functionality
 * Acts as a facade/wrapper around NotificationService
 */

import { NotificationService } from './NotificationService';
import { log } from '@/lib/logging';
import { Server as SocketIOServer } from 'socket.io';
import { ROOM_PATTERNS } from './constants';

export class RealtimeService {
  private static instance: RealtimeService;
  private notificationService: NotificationService;
  private io: SocketIOServer | null = null;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Get the underlying notification service
   */
  public getNotificationService(): NotificationService {
    return this.notificationService;
  }

  /**
   * Initialize with Socket.io instance
   * This method can be extended to set up socket-specific functionality
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    log.info('RealtimeService initialized with Socket.io instance');
  }

  /**
   * Initialize Socket.io server integration
   */
  public async initializeSocketIO(server: any): Promise<void> {
    log.info('RealtimeService initializing Socket.io integration');
    // Socket.io instance will be set via initialize() method
  }

  /**
   * Get the Socket.io instance
   */
  public getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast to a specific user
   */
  public broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io instance not available for broadcasting');
      return;
    }

    try {
      this.io.to(ROOM_PATTERNS.USER(userId)).emit(event, data);
      log.debug('Broadcasted to user', { userId, event, data });
    } catch (error) {
      log.error('Failed to broadcast to user', { userId, event, error });
    }
  }

  /**
   * Broadcast to all users with a specific role
   */
  public broadcastToRole(role: string, event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io instance not available for broadcasting');
      return;
    }

    try {
      this.io.to(ROOM_PATTERNS.ROLE(role)).emit(event, data);
      log.debug('Broadcasted to role', { role, event, data });
    } catch (error) {
      log.error('Failed to broadcast to role', { role, event, error });
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcastToAll(event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io instance not available for broadcasting');
      return;
    }

    try {
      this.io.emit(event, data);
      log.debug('Broadcasted to all', { event, data });
    } catch (error) {
      log.error('Failed to broadcast to all', { event, error });
    }
  }

  /**
   * Broadcast to a specific room
   */
  public broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      log.warn('Socket.io instance not available for broadcasting');
      return;
    }

    try {
      this.io.to(room).emit(event, data);
      log.debug('Broadcasted to room', { room, event, data });
    } catch (error) {
      log.error('Failed to broadcast to room', { room, event, error });
    }
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): { totalConnections: number; rooms: string[] } {
    if (!this.io) {
      return { totalConnections: 0, rooms: [] };
    }

    const sockets = this.io.sockets.sockets;
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());

    return {
      totalConnections: sockets.size,
      rooms: rooms.filter(room => !sockets.has(room)) // Filter out socket IDs
    };
  }
}
