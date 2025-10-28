/**
 * Authentication Controller
 * 
 * Handles login, logout, and current user operations.
 */

import { Request, Response } from 'express';
import { AuthService } from '../../lib/auth/core/AuthService';
import { TokenService } from '../../lib/auth/core/TokenService';
import { ResponseBuilder } from '../../utils/response.util';
import { log } from '../../lib/logging';

/**
 * Login endpoint
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ResponseBuilder.success(res, { error: 'Email and password are required' }, { errorCode: 'VALIDATION_ERROR' }, 400);
    }

    log.info('Login attempt', { email: email.toLowerCase(), ipAddress: req.ip || 'unknown' });

    const loginResult = await AuthService.login({ email, password }, req);

    // Set auth token cookie
    res.cookie('auth-token', loginResult.tokens?.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return ResponseBuilder.success(res, {
      user: loginResult.user,
      session: loginResult.session
    });

  } catch (error) {
    log.error('Login failed', error, { ipAddress: req.ip || 'unknown' });
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return ResponseBuilder.success(res, { error: error.message }, { errorCode: 'RATE_LIMITED' }, 429);
      }
      if (error.message.includes('locked')) {
        return ResponseBuilder.success(res, { error: error.message }, { errorCode: 'ACCOUNT_LOCKED' }, 423);
      }
      if (error.message.includes('Invalid credentials')) {
        return ResponseBuilder.success(res, { error: 'Invalid credentials' }, { errorCode: 'INVALID_CREDENTIALS' }, 401);
      }
    }

    return ResponseBuilder.success(res, { error: 'Login failed' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<Response> {
  try {
    const authHeader = req.headers.authorization;
    const sessionId = req.body.sessionId;

    if (!authHeader && !sessionId) {
      return ResponseBuilder.success(res, { error: 'Session information required' }, { errorCode: 'VALIDATION_ERROR' }, 400);
    }

    let sessionIdToLogout = sessionId;

    // Extract session ID from token if not provided in body
    if (!sessionIdToLogout && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const validationResult = await TokenService.verifyAccessToken(token);
      
      if (validationResult.isValid && validationResult.payload) {
        sessionIdToLogout = validationResult.payload.sessionId;
      }
    }

    if (!sessionIdToLogout) {
      return ResponseBuilder.success(res, { error: 'Invalid session' }, { errorCode: 'INVALID_SESSION' }, 400);
    }

    await AuthService.logout(sessionIdToLogout, req);

    // Clear auth token cookie
    res.clearCookie('auth-token');

    return ResponseBuilder.success(res, {
      message: 'Logout successful'
    });

  } catch (error) {
    log.error('Logout failed', error, { ipAddress: req.ip || 'unknown' });
    return ResponseBuilder.success(res, { error: 'Logout failed' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<Response> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseBuilder.success(res, { error: 'Access token required' }, { errorCode: 'UNAUTHORIZED' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const validationResult = await TokenService.verifyAccessToken(token);

    if (!validationResult.isValid || !validationResult.payload) {
      return ResponseBuilder.success(res, { error: 'Invalid or expired token' }, { errorCode: 'INVALID_TOKEN' }, 401);
    }

    const payload = validationResult.payload;

    // Get user information from token payload
    const user = {
      _id: payload.userId,
      email: payload.email,
      userType: payload.userType,
      firstName: payload['firstName'],
      lastName: payload['lastName']
    };

    return ResponseBuilder.success(res, {
      user,
      sessionId: payload.sessionId
    });

  } catch (error) {
    log.error('Get current user failed', error, { ipAddress: req.ip || 'unknown' });
    return ResponseBuilder.success(res, { error: 'Failed to get user information' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}
