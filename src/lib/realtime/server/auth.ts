/**
 * Socket.io Authentication Middleware
 * 
 * Handles JWT authentication for Socket.io connections.
 * Integrates with existing AuthService for token validation.
 */

import { Socket } from 'socket.io';
import { UserRole, TokenPayload } from '@/lib/auth/core/types';
import { verifyToken } from '@/lib/auth/utils/jwt';
import { log } from '@/lib/logging';
import { ERROR_CODES } from '../core/constants';
import { AuthenticatedSocket } from '../core/types';

// Simple error class for now
class AppError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Socket.io authentication middleware
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    log.debug('Socket authentication attempt', {
      socketId: socket.id,
      headers: socket.handshake.headers,
      query: socket.handshake.query,
      auth: socket.handshake.auth
    });

    const token = extractToken(socket);
    
    if (!token) {
      log.warn('No authentication token found', {
        socketId: socket.id,
        authHeader: socket.handshake.headers.authorization,
        queryToken: socket.handshake.query.token,
        authToken: socket.handshake.auth?.token
      });
      return next(new AppError('Authentication token required', 401, ERROR_CODES.AUTHENTICATION_FAILED));
    }

    // Verify JWT token
    const payload = await verifyToken(token);
    
    if (!payload) {
      return next(new AppError('Invalid authentication token', 401, ERROR_CODES.AUTHENTICATION_FAILED));
    }

    // Attach user info to socket (ONLY use fields from JWT payload)
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.userId = payload.userId;
    authenticatedSocket.userType = payload.userType;
    authenticatedSocket.userEmail = payload.email;
    authenticatedSocket.sessionId = payload.sessionId;
    
    // Set connection metadata
    authenticatedSocket.connectedAt = new Date();
    authenticatedSocket.lastActivityAt = new Date();
    authenticatedSocket.ipAddress = socket.handshake.address || 'unknown';
    authenticatedSocket.userAgent = socket.handshake.headers['user-agent'] || 'unknown';

    log.debug('Socket authenticated successfully', {
      socketId: socket.id,
      userId: payload.userId,
      userType: payload.userType,
      userEmail: payload.email,
      ipAddress: authenticatedSocket.ipAddress,
    });

    next();
  } catch (error) {
    log.error('Socket authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    next(new AppError('Authentication failed', 401, ERROR_CODES.AUTHENTICATION_FAILED));
  }
}

/**
 * Extract authentication token from socket handshake
 */
function extractToken(socket: Socket): string | null {
  // Try different token sources in order of preference
  
  // 1. Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. Query parameter
  const tokenFromQuery = socket.handshake.query.token;
  if (typeof tokenFromQuery === 'string') {
    return tokenFromQuery;
  }
  
  // 3. Socket auth object
  const socketAuth = socket.handshake.auth;
  if (socketAuth?.token) {
    return socketAuth.token;
  }
  
  return null;
}

/**
 * Rate limiting middleware for socket connections
 */
export function createRateLimitMiddleware(maxConnectionsPerUser: number = 5) {
  const userConnections = new Map<string, number>();
  
  return async (socket: AuthenticatedSocket, next: (err?: Error) => void): Promise<void> => {
    try {
      const userId = socket.userId;
      const currentConnections = userConnections.get(userId) || 0;
      
      if (currentConnections >= maxConnectionsPerUser) {
        log.warn('Rate limit exceeded for socket connection', {
          userId,
          currentConnections,
          maxConnections: maxConnectionsPerUser,
        });
        
        return next(new AppError('Too many connections', 429, ERROR_CODES.RATE_LIMITED));
      }
      
      // Increment connection count
      userConnections.set(userId, currentConnections + 1);
      
      // Clean up on disconnect
      socket.on('disconnect', () => {
        const count = userConnections.get(userId) || 0;
        if (count <= 1) {
          userConnections.delete(userId);
        } else {
          userConnections.set(userId, count - 1);
        }
      });
      
      next();
    } catch (error) {
      log.error('Rate limiting middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(new AppError('Rate limiting failed', 500, ERROR_CODES.INTERNAL_ERROR));
    }
  };
}

/**
 * Connection validation middleware
 */
export function validateConnection(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  try {
    // Validate required fields
    if (!socket.userId || !socket.userType || !socket.userEmail) {
      return next(new AppError('Invalid authentication data', 401, ERROR_CODES.AUTHENTICATION_FAILED));
    }
    
    // Validate user role
    const validRoles: UserRole[] = ['employee', 'manager', 'admin', 'super_admin'];
    if (!validRoles.includes(socket.userType)) {
      return next(new AppError('Invalid user role', 403, ERROR_CODES.PERMISSION_DENIED));
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(socket.userEmail)) {
      return next(new AppError('Invalid email format', 400, ERROR_CODES.INVALID_INPUT));
    }
    
    next();
  } catch (error) {
    log.error('Connection validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(new AppError('Connection validation failed', 500, ERROR_CODES.INTERNAL_ERROR));
  }
}

/**
 * Security middleware for sensitive operations
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void): void => {
    try {
      if (!allowedRoles.includes(socket.userType)) {
        log.warn('Access denied - insufficient role', {
          userId: socket.userId,
          userRole: socket.userType,
          requiredRoles: allowedRoles,
        });
        
        return next(new AppError('Insufficient permissions', 403, ERROR_CODES.PERMISSION_DENIED));
      }
      
      next();
    } catch (error) {
      log.error('Role validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(new AppError('Role validation failed', 500, ERROR_CODES.INTERNAL_ERROR));
    }
  };
}

/**
 * Activity tracking middleware
 */
export function trackActivity(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  try {
    // Update last activity on any event
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(event: string, ...args: any[]) {
      socket.lastActivityAt = new Date();
      return originalEmit(event, ...args);
    };
    
    const originalOn = socket.on.bind(socket);
    socket.on = function(event: string, listener: any) {
      const wrappedListener = (...args: any[]) => {
        socket.lastActivityAt = new Date();
        return listener(...args);
      };
      return originalOn(event, wrappedListener);
    };
    
    next();
  } catch (error) {
    log.error('Activity tracking setup error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(new AppError('Activity tracking setup failed', 500, ERROR_CODES.INTERNAL_ERROR));
  }
}
