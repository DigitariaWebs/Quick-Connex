/**
 * Socket Provider
 * 
 * Provider class for emitting Socket.io events to users, roles, and rooms.
 * Follows the communication module pattern for consistency.
 */

import { Server as SocketIOServer } from 'socket.io';
import { RealtimeService } from '../core';
import { log } from '@/lib/logging';
import { AuditService } from '@/lib/audit';
import { AuditAction, TargetResourceType, ActorType } from '@/models/AuditLog';
import { 
  SocketEventType,
  DeliveryResult,
  UserRole,
  RealtimeError
} from '../core/types';
import { 
  SOCKET_EVENTS,
  ERROR_CODES,
  ROOM_TYPES,
  DELIVERY_METHODS,
  TIMING
} from '../core/constants';
import { 
  AppError,
  ValidationError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  retry,
  withTimeout 
} from '@/lib/utils/async-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';

// ===== SOCKET PROVIDER =====

export class SocketProvider {
  private static instance: SocketProvider;
  private io: SocketIOServer | null = null;
  private realtimeService: RealtimeService;

  private constructor() {
    this.realtimeService = RealtimeService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SocketProvider {
    if (!SocketProvider.instance) {
      SocketProvider.instance = new SocketProvider();
    }
    return SocketProvider.instance;
  }

  /**
   * Initialize with Socket.io instance
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;
    log.info('SocketProvider initialized with Socket.io instance');
  }

  /**
   * Emit event to specific user
   */
  public async emitToUser(
    userId: string,
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<DeliveryResult> {
    try {
      if (!this.io) {
        throw new AppError('Socket.io not initialized', 500, ERROR_CODES.CONNECTION_FAILED);
      }

      // Validate inputs
      this.validateEmitInputs(userId, event, payload);

      // Sanitize payload
      const sanitizedPayload = this.sanitizePayload(payload);

      // Get user room
      const room = ROOM_TYPES.USER_ROOM(userId);

      // Emit with timeout
      const result = await withTimeout(
        () => this.emitToRoom(room, event, sanitizedPayload),
        options.timeout || TIMING.CONNECTION_TIMEOUT
      );

      // Log audit event
      await this.logEmitEvent('user', userId, event, sanitizedPayload);

      log.debug('Event emitted to user', {
        userId,
        event,
        room,
        payloadSize: JSON.stringify(sanitizedPayload).length
      });

      return {
        success: true,
        method: DELIVERY_METHODS.REALTIME,
        userId,
        notificationId: payload.notificationId || 'unknown',
        timestamp: new Date()
      };

    } catch (error) {
      log.error('Failed to emit to user:', error);
      
      return {
        success: false,
        method: DELIVERY_METHODS.REALTIME,
        userId,
        notificationId: payload.notificationId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Emit event to users by role
   */
  public async emitToRole(
    userRole: UserRole,
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<DeliveryResult[]> {
    try {
      if (!this.io) {
        throw new AppError('Socket.io not initialized', 500, ERROR_CODES.CONNECTION_FAILED);
      }

      // Validate inputs
      this.validateEmitInputs(userRole, event, payload);

      // Sanitize payload
      const sanitizedPayload = this.sanitizePayload(payload);

      // Get role room
      const room = ROOM_TYPES.ROLE_ROOM(userRole);

      // Emit with timeout
      const result = await withTimeout(
        () => this.emitToRoom(room, event, sanitizedPayload),
        options.timeout || TIMING.CONNECTION_TIMEOUT
      );

      // Log audit event
      await this.logEmitEvent('role', userRole, event, sanitizedPayload);

      log.debug('Event emitted to role', {
        userRole,
        event,
        room,
        payloadSize: JSON.stringify(sanitizedPayload).length
      });

      // Return success result (actual user count would need room inspection)
      return [{
        success: true,
        method: DELIVERY_METHODS.REALTIME,
        userId: `role:${userRole}`,
        notificationId: payload.notificationId || 'unknown',
        timestamp: new Date()
      }];

    } catch (error) {
      log.error('Failed to emit to role:', error);
      
      return [{
        success: false,
        method: DELIVERY_METHODS.REALTIME,
        userId: `role:${userRole}`,
        notificationId: payload.notificationId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }];
    }
  }

  /**
   * Emit event to specific room
   */
  public async emitToRoom(
    room: string,
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<void> {
    try {
      if (!this.io) {
        throw new AppError('Socket.io not initialized', 500, ERROR_CODES.CONNECTION_FAILED);
      }

      // Validate inputs
      this.validateEmitInputs(room, event, payload);

      // Sanitize payload
      const sanitizedPayload = this.sanitizePayload(payload);

      // Emit to room
      this.io.to(room).emit(event, {
        ...sanitizedPayload,
        timestamp: new Date(),
        room
      });

      log.debug('Event emitted to room', {
        room,
        event,
        payloadSize: JSON.stringify(sanitizedPayload).length
      });

    } catch (error) {
      log.error('Failed to emit to room:', error);
      throw error;
    }
  }

  /**
   * Broadcast event to all connected users
   */
  public async broadcast(
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<void> {
    try {
      if (!this.io) {
        throw new AppError('Socket.io not initialized', 500, ERROR_CODES.CONNECTION_FAILED);
      }

      // Validate inputs
      this.validateEmitInputs('broadcast', event, payload);

      // Sanitize payload
      const sanitizedPayload = this.sanitizePayload(payload);

      // Broadcast to all
      this.io.emit(event, {
        ...sanitizedPayload,
        timestamp: new Date()
      });

      log.debug('Event broadcasted to all users', {
        event,
        payloadSize: JSON.stringify(sanitizedPayload).length,
        connections: this.io.sockets.sockets.size
      });

    } catch (error) {
      log.error('Failed to broadcast event:', error);
      throw error;
    }
  }

  /**
   * Emit to multiple users
   */
  public async emitToUsers(
    userIds: string[],
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const userId of userIds) {
      const result = await this.emitToUser(userId, event, payload, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Emit to multiple roles
   */
  public async emitToRoles(
    userRoles: UserRole[],
    event: SocketEventType,
    payload: any,
    options: EmitOptions = {}
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const userRole of userRoles) {
      const roleResults = await this.emitToRole(userRole, event, payload, options);
      results.push(...roleResults);
    }

    return results;
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): any {
    if (!this.io) {
      return {
        total: 0,
        active: 0,
        rooms: 0
      };
    }

    return {
      total: this.io.sockets.sockets.size,
      active: this.io.sockets.sockets.size, // All connected sockets are active
      rooms: this.io.sockets.adapter.rooms.size
    };
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    if (!this.io) return false;

    const room = ROOM_TYPES.USER_ROOM(userId);
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    
    return roomSockets ? roomSockets.size > 0 : false;
  }

  /**
   * Get connected users count for role
   */
  public getRoleConnectionCount(userRole: UserRole): number {
    if (!this.io) return 0;

    const room = ROOM_TYPES.ROLE_ROOM(userRole);
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    
    return roomSockets ? roomSockets.size : 0;
  }

  // ===== PRIVATE METHODS =====

  private validateEmitInputs(target: string, event: SocketEventType, payload: any): void {
    if (!target || typeof target !== 'string') {
      throw new ValidationError('Target must be a non-empty string');
    }

    if (!event || typeof event !== 'string') {
      throw new ValidationError('Event must be a non-empty string');
    }

    if (!payload || typeof payload !== 'object') {
      throw new ValidationError('Payload must be an object');
    }

    // Validate payload size
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 10000) { // 10KB limit
      throw new ValidationError('Payload size exceeds limit');
    }
  }

  private sanitizePayload(payload: any): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizePayload(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private async logEmitEvent(
    targetType: 'user' | 'role' | 'room' | 'broadcast',
    target: string,
    event: SocketEventType,
    payload: any
  ): Promise<void> {
    try {
      await AuditService.logCommunication({
        action: AuditAction.NOTIFICATION_SENT,
        actorId: 'system',
        actorType: ActorType.SYSTEM,
        description: `Socket event emitted: ${event}`,
        targetResourceType: TargetResourceType.NOTIFICATION,
        targetResourceId: `${targetType}:${target}`,
        details: {
          event,
          targetType,
          target,
          payloadSize: JSON.stringify(payload).length
        }
      });
    } catch (error) {
      log.error('Failed to log emit event:', error);
    }
  }
}

// ===== EMIT OPTIONS INTERFACE =====

export interface EmitOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  persistent?: boolean;
}

// ===== EXPORTS =====

export default SocketProvider;
