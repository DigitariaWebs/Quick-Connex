/**
 * Server Components
 * 
 * Exports all server-side Socket.io components including
 * the main server setup, authentication middleware, and room management.
 */

// Main server setup
export { SocketServer } from './socket-server';

// Authentication middleware
export { 
  authenticateSocket, 
  validateSocketPermission, 
  SocketRateLimiter 
} from './auth-middleware';

// Room management
export { 
  RoomManager, 
  setupRoomEventHandlers 
} from './room-manager';

// Types
export type { AuthenticatedSocket } from './auth-middleware';
