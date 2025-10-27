/**
 * Socket.io Authentication Middleware
 * 
 * Handles JWT authentication for Socket.io connections.
 * Integrates with existing AuthService for token validation.
 */

import { Socket } from 'socket.io';
import { AuthService } from '@/lib/auth';
import { verifyToken } from '@/lib/auth/jwt-standalone';
import { log } from '@/lib/logging';
import { ERROR_CODES } from '../core/constants';
import { AppError } from '@/lib/utils/error-handling';

// ===== AUTHENTICATION MIDDLEWARE =====

export interface AuthenticatedSocket extends Socket {
  userId: string;           // From payload.userId
  userType: string;         // From payload.userType
  userEmail: string;        // From payload.email
  sessionId?: string;       // From payload.sessionId
  // Remove userName field - not in JWT payload
}

/**
 * Socket.io authentication middleware
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  try {
    const token = extractToken(socket);
    
    if (!token) {
      return next(new AppError('Authentication token required', 401, ERROR_CODES.AUTHENTICATION_FAILED));
    }

    // Verify token - returns TokenPayload | null
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

    log.debug('Socket authenticated successfully', {
      socketId: socket.id,
      userId: payload.userId,
      userType: payload.userType,
      userEmail: payload.email
    });

    next();

  } catch (error) {
    log.error('Socket authentication error:', error);
    return next(new AppError('Authentication failed', 401, ERROR_CODES.AUTHENTICATION_FAILED));
  }
}

/**
 * Extract authentication token from socket handshake
 */
function extractToken(socket: Socket): string | null {
  // Try different sources for the token
  
  // 1. Auth header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Handshake auth object
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // 3. Cookies
  const cookies = socket.handshake.headers.cookie;
  if (cookies) {
    const tokenMatch = cookies.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  // 4. Query parameters (less secure, for testing)
  if (socket.handshake.query?.token) {
    return socket.handshake.query.token as string;
  }

  return null;
}

/**
 * Validate user permissions for specific actions
 */
export function validateSocketPermission(
  socket: AuthenticatedSocket,
  requiredRole?: string,
  requiredUserId?: string
): boolean {
  try {
    // Check role permission
    if (requiredRole) {
      const roleHierarchy = {
        'employee': 1,
        'manager': 2,
        'admin': 3,
        'super_admin': 4
      };

      const userLevel = roleHierarchy[socket.userType as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

      if (userLevel < requiredLevel) {
        log.warn('Insufficient role permission', {
          socketId: socket.id,
          userId: socket.userId,
          userType: socket.userType,
          requiredRole
        });
        return false;
      }
    }

    // Check user-specific permission
    if (requiredUserId && socket.userId !== requiredUserId) {
      log.warn('User ID mismatch', {
        socketId: socket.id,
        userId: socket.userId,
        requiredUserId
      });
      return false;
    }

    return true;

  } catch (error) {
    log.error('Permission validation error:', error);
    return false;
  }
}

/**
 * Rate limiting middleware for socket events
 */
export class SocketRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public checkLimit(socket: AuthenticatedSocket): boolean {
    const key = `${socket.userId}:${socket.id}`;
    const now = Date.now();
    const userRequests = this.requests.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or create new window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (userRequests.count >= this.maxRequests) {
      log.warn('Socket rate limit exceeded', {
        socketId: socket.id,
        userId: socket.userId,
        count: userRequests.count,
        maxRequests: this.maxRequests
      });
      return false;
    }

    userRequests.count++;
    return true;
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// ===== EXPORTS =====
