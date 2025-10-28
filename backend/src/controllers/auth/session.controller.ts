/**
 * Session Controller
 * 
 * Handles session management operations.
 */

import { Request, Response } from 'express';
import { TokenService } from '../../lib/auth/core/TokenService';
import { ResponseBuilder } from '../../utils/response.util';
import { log } from '../../lib/logging';
import Session from '../../models/Session';

/**
 * List user sessions endpoint
 * GET /api/auth/sessions
 */
export async function listSessions(req: Request, res: Response): Promise<Response> {
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

    const userId = validationResult.payload.userId;

    // Get all active sessions for the user
    const sessions = await Session.find({ 
      userId, 
      isActive: true, 
      revoked: false 
    }).sort({ createdAt: -1 });

    const sessionList = sessions.map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessedAt,
      ipAddress: session.ipAddress,
      userAgent: (session as any).userAgent || 'Unknown',
      isCurrent: session.sessionId === validationResult.payload?.sessionId
    }));

    return ResponseBuilder.success(res, {
      sessions: sessionList,
      total: sessionList.length
    });

  } catch (error) {
    log.error('List sessions failed', error, { ipAddress: req.ip || 'unknown' });
    return ResponseBuilder.success(res, { error: 'Failed to list sessions' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}

/**
 * Refresh session endpoint
 * POST /api/auth/sessions/refresh
 */
export async function refreshSession(req: Request, res: Response): Promise<Response> {
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

    const sessionId = validationResult.payload.sessionId;

    // Find the session
    const session = await Session.findOne({ 
      sessionId, 
      isActive: true, 
      revoked: false 
    });

    if (!session) {
      return ResponseBuilder.success(res, { error: 'Session not found or invalid' }, { errorCode: 'INVALID_SESSION' }, 401);
    }

    // Check if session is still valid
    if (!(session as any).isValid()) {
      return ResponseBuilder.success(res, { error: 'Session expired' }, { errorCode: 'SESSION_EXPIRED' }, 401);
    }

    // Generate new tokens
    const newTokens = await TokenService.generateTokenPair(
      validationResult.payload.userId,
      validationResult.payload.email,
      validationResult.payload.userType,
      sessionId,
      {
        userId: validationResult.payload.userId,
        sessionId: sessionId,
        operation: 'refresh',
        timestamp: new Date(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'Unknown',
        deviceFingerprint: 'unknown'
      }
    );

    // Update session last accessed
    await (session as any).updateLastAccessed();

    // Set new auth token cookie
    res.cookie('auth-token', newTokens.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return ResponseBuilder.success(res, {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    });

  } catch (error) {
    log.error('Refresh session failed', error, { ipAddress: req.ip || 'unknown' });
    return ResponseBuilder.success(res, { error: 'Failed to refresh session' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}

/**
 * Revoke session endpoint
 * DELETE /api/auth/sessions/:sessionId
 */
export async function revokeSession(req: Request, res: Response): Promise<Response> {
  try {
    const authHeader = req.headers.authorization;
    const { sessionId } = req.params;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseBuilder.success(res, { error: 'Access token required' }, { errorCode: 'UNAUTHORIZED' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const validationResult = await TokenService.verifyAccessToken(token);

    if (!validationResult.isValid || !validationResult.payload) {
      return ResponseBuilder.success(res, { error: 'Invalid or expired token' }, { errorCode: 'INVALID_TOKEN' }, 401);
    }

    const userId = validationResult.payload.userId;

    // Find the session to revoke
    const session = await Session.findOne({ 
      sessionId, 
      userId, 
      isActive: true, 
      revoked: false 
    });

    if (!session) {
      return ResponseBuilder.success(res, { error: 'Session not found' }, { errorCode: 'SESSION_NOT_FOUND' }, 404);
    }

    // Revoke the session
    session.revoked = true;
    session.revokedAt = new Date();
    session.isActive = false;
    await session.save();

    log.info('Session revoked', { 
      sessionId: sessionId || 'unknown', 
      userId, 
      ipAddress: req.ip || 'unknown' 
    });

    return ResponseBuilder.success(res, {
      sessionId
    });

  } catch (error) {
    log.error('Revoke session failed', error, { ipAddress: req.ip || 'unknown' });
    return ResponseBuilder.success(res, { error: 'Failed to revoke session' }, { errorCode: 'INTERNAL_ERROR' }, 500);
  }
}
