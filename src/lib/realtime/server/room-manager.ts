/**
 * Socket.io Room Management
 * 
 * Handles room creation, joining, leaving, and management for Socket.io connections.
 * Supports user-specific, role-based, and custom rooms.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthenticatedSocket } from './auth-middleware';
import { log } from '@/lib/logging';
import { ROOM_TYPES, SOCKET_EVENTS, ERROR_CODES } from '../core/constants';
import { AppError } from '@/lib/utils/error-handling';

// ===== ROOM MANAGER =====

export class RoomManager {
  private io: SocketIOServer;
  private rooms: Map<string, RoomInfo> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Join user to their personal room
   */
  public joinUserRoom(socket: AuthenticatedSocket): void {
    const roomName = ROOM_TYPES.USER_ROOM(socket.userId);
    socket.join(roomName);
    
    this.updateRoomInfo(roomName, 'user', socket.userId);
    
    log.debug('User joined personal room', {
      socketId: socket.id,
      userId: socket.userId,
      room: roomName
    });
  }

  /**
   * Join user to role-based room
   */
  public joinRoleRoom(socket: AuthenticatedSocket): void {
    const roomName = ROOM_TYPES.ROLE_ROOM(socket.userType);
    socket.join(roomName);
    
    this.updateRoomInfo(roomName, 'role', socket.userId);
    
    log.debug('User joined role room', {
      socketId: socket.id,
      userId: socket.userId,
      userType: socket.userType,
      room: roomName
    });
  }

  /**
   * Join user to admin room (if admin)
   */
  public joinAdminRoom(socket: AuthenticatedSocket): void {
    if (socket.userType === 'admin' || socket.userType === 'super_admin') {
      const roomName = ROOM_TYPES.ADMIN_ROOM();
      socket.join(roomName);
      
      this.updateRoomInfo(roomName, 'admin', socket.userId);
      
      log.debug('Admin user joined admin room', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType,
        room: roomName
      });
    }
  }

  /**
   * Join user to transfer-specific room
   */
  public joinTransferRoom(socket: AuthenticatedSocket, transferId: string): void {
    const roomName = ROOM_TYPES.TRANSFER_ROOM(transferId);
    socket.join(roomName);
    
    this.updateRoomInfo(roomName, 'transfer', socket.userId);
    
    log.debug('User joined transfer room', {
      socketId: socket.id,
      userId: socket.userId,
      transferId,
      room: roomName
    });
  }

  /**
   * Join user to custom room
   */
  public joinCustomRoom(socket: AuthenticatedSocket, roomName: string): void {
    // Validate room name
    if (!this.isValidRoomName(roomName)) {
      throw new AppError('Invalid room name', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    socket.join(roomName);
    this.updateRoomInfo(roomName, 'custom', socket.userId);
    
    log.debug('User joined custom room', {
      socketId: socket.id,
      userId: socket.userId,
      room: roomName
    });
  }

  /**
   * Leave room
   */
  public leaveRoom(socket: AuthenticatedSocket, roomName: string): void {
    socket.leave(roomName);
    this.removeUserFromRoom(roomName, socket.userId);
    
    log.debug('User left room', {
      socketId: socket.id,
      userId: socket.userId,
      room: roomName
    });
  }

  /**
   * Leave all rooms
   */
  public leaveAllRooms(socket: AuthenticatedSocket): void {
    // Get all rooms the socket is in and leave them manually
    const rooms = Array.from(socket.rooms);
    for (const room of rooms) {
      if (room !== socket.id) { // Don't leave the socket's own room
        socket.leave(room);
      }
    }
    
    // Clean up room info
    for (const [roomName, roomInfo] of this.rooms.entries()) {
      const index = roomInfo.members.indexOf(socket.userId);
      if (index > -1) {
        roomInfo.members.splice(index, 1);
        
        // Remove room if empty
        if (roomInfo.members.length === 0) {
          this.rooms.delete(roomName);
        }
      }
    }
    
    log.debug('User left all rooms', {
      socketId: socket.id,
      userId: socket.userId,
      roomsLeft: rooms.length - 1 // Subtract 1 for socket's own room
    });
  }

  /**
   * Get room information
   */
  public getRoomInfo(roomName: string): RoomInfo | null {
    return this.rooms.get(roomName) || null;
  }

  /**
   * Get all rooms
   */
  public getAllRooms(): Map<string, RoomInfo> {
    return new Map(this.rooms);
  }

  /**
   * Get rooms for user
   */
  public getUserRooms(userId: string): string[] {
    const userRooms: string[] = [];
    
    for (const [roomName, roomInfo] of this.rooms.entries()) {
      if (roomInfo.members.includes(userId)) {
        userRooms.push(roomName);
      }
    }
    
    return userRooms;
  }

  /**
   * Get room members
   */
  public getRoomMembers(roomName: string): string[] {
    const roomInfo = this.rooms.get(roomName);
    return roomInfo ? [...roomInfo.members] : [];
  }

  /**
   * Check if user is in room
   */
  public isUserInRoom(userId: string, roomName: string): boolean {
    const roomInfo = this.rooms.get(roomName);
    return roomInfo ? roomInfo.members.includes(userId) : false;
  }

  /**
   * Emit to room
   */
  public emitToRoom(roomName: string, event: string, data: any): void {
    this.io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date(),
      room: roomName
    });
    
    log.debug('Event emitted to room', {
      room: roomName,
      event,
      memberCount: this.getRoomMembers(roomName).length
    });
  }

  /**
   * Emit to user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    const roomName = ROOM_TYPES.USER_ROOM(userId);
    this.emitToRoom(roomName, event, data);
  }

  /**
   * Emit to role
   */
  public emitToRole(userType: string, event: string, data: any): void {
    const roomName = ROOM_TYPES.ROLE_ROOM(userType);
    this.emitToRoom(roomName, event, data);
  }

  /**
   * Broadcast to all users
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
    
    log.debug('Event broadcasted to all users', {
      event,
      totalConnections: this.io.sockets.sockets.size
    });
  }

  /**
   * Cleanup empty rooms
   */
  public cleanupEmptyRooms(): void {
    const emptyRooms: string[] = [];
    
    for (const [roomName, roomInfo] of this.rooms.entries()) {
      if (roomInfo.members.length === 0) {
        emptyRooms.push(roomName);
      }
    }
    
    for (const roomName of emptyRooms) {
      this.rooms.delete(roomName);
    }
    
    if (emptyRooms.length > 0) {
      log.debug('Cleaned up empty rooms', {
        rooms: emptyRooms
      });
    }
  }

  // ===== PRIVATE METHODS =====

  private updateRoomInfo(roomName: string, type: string, userId: string): void {
    const existingRoom = this.rooms.get(roomName);
    
    if (existingRoom) {
      if (!existingRoom.members.includes(userId)) {
        existingRoom.members.push(userId);
      }
    } else {
      this.rooms.set(roomName, {
        name: roomName,
        type: type as any,
        members: [userId],
        createdAt: new Date()
      });
    }
  }

  private removeUserFromRoom(roomName: string, userId: string): void {
    const roomInfo = this.rooms.get(roomName);
    if (roomInfo) {
      const index = roomInfo.members.indexOf(userId);
      if (index > -1) {
        roomInfo.members.splice(index, 1);
      }
    }
  }

  private isValidRoomName(roomName: string): boolean {
    // Basic validation for room names
    return roomName.length > 0 && 
           roomName.length <= 100 && 
           /^[a-zA-Z0-9:_-]+$/.test(roomName);
  }
}

// ===== ROOM INFO INTERFACE =====

export interface RoomInfo {
  name: string;
  type: 'user' | 'role' | 'transfer' | 'broadcast' | 'admin' | 'custom';
  members: string[];
  createdAt: Date;
}

// ===== ROOM EVENT HANDLERS =====

export function setupRoomEventHandlers(io: SocketIOServer, roomManager: RoomManager): void {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    // Cast to AuthenticatedSocket since auth middleware should have run
    const authenticatedSocket = socket as AuthenticatedSocket;
    // Handle room join requests
    socket.on('join_room', (data: { room: string }) => {
      try {
        roomManager.joinCustomRoom(authenticatedSocket, data.room);
        socket.emit('room_joined', {
          success: true,
          room: data.room,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('room_error', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          room: data.room
        });
      }
    });

    // Handle room leave requests
    socket.on('leave_room', (data: { room: string }) => {
      try {
        roomManager.leaveRoom(authenticatedSocket, data.room);
        socket.emit('room_left', {
          success: true,
          room: data.room,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('room_error', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          room: data.room
        });
      }
    });

    // Handle transfer room join
    socket.on('join_transfer_room', (data: { transferId: string }) => {
      try {
        roomManager.joinTransferRoom(authenticatedSocket, data.transferId);
        socket.emit('transfer_room_joined', {
          success: true,
          transferId: data.transferId,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('room_error', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          transferId: data.transferId
        });
      }
    });
  });
}

// ===== EXPORTS =====
