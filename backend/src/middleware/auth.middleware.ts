/**
 * Authentication Middleware
 * 
 * Middleware for handling authentication and authorization in Express routes.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/lib/auth/core/AuthService';
import { ResponseBuilder } from '@/utils/response.util';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        userType: string;
        sessionId: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and sets req.user
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authContext = await AuthService.requireAuth(req, {
      requireActiveStatus: true
    });

    // Set user information on request object
    req.user = {
      _id: authContext.user._id,
      firstName: authContext.user.firstName,
      lastName: authContext.user.lastName,
      email: authContext.user.email,
      userType: authContext.user.userType,
      sessionId: authContext.session.sessionId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    
    if (errorMessage.includes('Access token required') || errorMessage.includes('Invalid access token')) {
      ResponseBuilder.unauthorized(res, errorMessage);
    } else if (errorMessage.includes('Insufficient permissions')) {
      ResponseBuilder.forbidden(res, errorMessage);
    } else {
      ResponseBuilder.serverError(res, 'Authentication failed');
    }
  }
}

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required roles
 */
export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        ResponseBuilder.unauthorized(res, 'User not authenticated');
        return;
      }

      if (!roles.includes(req.user.userType)) {
        ResponseBuilder.forbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      ResponseBuilder.serverError(res, 'Authorization failed');
    }
  };
}