/**
 * Auth Controller
 * 
 * Authentication controller with dual-token system endpoints.
 */

import { Request, Response } from 'express';
import { TokenService } from '../../lib/auth';
import { 
  extractRefreshTokenFromRequest, 
  extractAccessTokenFromRequest,
  validateTokenFormat 
} from '../../lib/auth/utils/jwt';
import { TokenRefreshResponse, TokenContext } from '../../types/auth';
import { log } from '../../lib/logging';
import { ErrorBuilder } from '../../utils/error.util';

/**
 * Token Refresh Controller
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<Response> {
  try {
    // Extract refresh token from request
    const refreshToken = extractRefreshTokenFromRequest(req);
    
    if (!refreshToken) {
      log.warn('Token refresh attempted without refresh token', {
        operation: 'token_refresh',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      return ErrorBuilder.unauthorized(res, 'Refresh token required');
    }
    
    // Validate token format
    if (!validateTokenFormat(refreshToken)) {
      log.warn('Invalid refresh token format', {
        operation: 'token_refresh',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      return ErrorBuilder.unauthorized(res, 'Invalid refresh token format');
    }
    
    // Create token context
    const context: TokenContext = {
      userId: '', // Will be populated by TokenService
      sessionId: '', // Will be populated by TokenService
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      deviceFingerprint: req.get('X-Device-Fingerprint') || 'unknown',
      operation: 'refresh',
      timestamp: new Date(),
      metadata: {
        endpoint: '/api/auth/refresh',
        method: req.method
      }
    };
    
    // Verify and rotate refresh token
    const tokenPair = await TokenService.verifyAndRotateRefreshToken(refreshToken, context);
    
    if (!tokenPair) {
      log.warn('Token refresh failed - invalid or expired refresh token', {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceFingerprint: context.deviceFingerprint
      });
      
      return ErrorBuilder.unauthorized(res, 'Invalid or expired refresh token');
    }
    
    // Create response
    const response: TokenRefreshResponse = {
      success: true,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt
    };
    
    // Set refresh token in HTTP-only cookie
    res.cookie('refresh-token', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    log.info('Token refresh successful', {
      operation: 'token_refresh',
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress || 'unknown',
      accessTokenExpiresAt: tokenPair.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokenPair.refreshTokenExpiresAt
    });
    
    return res.status(200).json(response);
    
  } catch (error) {
    log.error('Token refresh error', {
      operation: 'token_refresh',
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return ErrorBuilder.serverError(res, 'Token refresh failed');
  }
}

/**
 * Token Validation Controller
 * GET /api/auth/validate
 */
export async function validateToken(req: Request, res: Response): Promise<Response> {
  try {
    // Extract access token from request
    const accessToken = extractAccessTokenFromRequest(req);
    
    if (!accessToken) {
      return ErrorBuilder.unauthorized(res, 'Access token required');
    }
    
    // Validate token format
    if (!validateTokenFormat(accessToken)) {
      return ErrorBuilder.unauthorized(res, 'Invalid access token format');
    }
    
    // Verify access token
    const validationResult = await TokenService.verifyAccessToken(accessToken);
    
    if (!validationResult.isValid) {
      log.warn('Token validation failed', {
        operation: 'token_validation',
        error: validationResult.error,
        errorCode: validationResult.errorCode,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      return ErrorBuilder.unauthorized(res, validationResult.error || 'Invalid access token');
    }
    
    const payload = validationResult.payload!;
    
    log.debug('Token validation successful', {
      operation: 'token_validation',
      userId: payload.userId,
      sessionId: payload.sessionId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        userType: payload.userType,
        sessionId: payload.sessionId,
        expiresAt: new Date(payload.exp * 1000)
      }
    });
    
  } catch (error) {
    log.error('Token validation error', {
      operation: 'token_validation',
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return ErrorBuilder.serverError(res, 'Token validation failed');
  }
}

/**
 * Token Revocation Controller
 * POST /api/auth/revoke
 */
export async function revokeToken(req: Request, res: Response): Promise<Response> {
  try {
    const { tokenId, reason } = req.body;
    
    if (!tokenId) {
      return ErrorBuilder.badRequest(res, 'Token ID required');
    }
    
    // Revoke refresh token
    const success = await TokenService.revokeRefreshToken(tokenId, reason);
    
    if (!success) {
      log.warn('Token revocation failed', {
        operation: 'token_revoke',
        tokenId,
        reason,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      });
      
      return ErrorBuilder.badRequest(res, 'Failed to revoke token');
    }
    
    log.info('Token revoked successfully', {
      operation: 'token_revoke',
      tokenId,
      reason,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Token revoked successfully'
    });
    
  } catch (error) {
    log.error('Token revocation error', {
      operation: 'token_revoke',
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return ErrorBuilder.serverError(res, 'Token revocation failed');
  }
}

/**
 * User Token Revocation Controller
 * POST /api/auth/revoke-all
 */
export async function revokeAllUserTokens(req: Request, res: Response): Promise<Response> {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return ErrorBuilder.badRequest(res, 'User ID required');
    }
    
    // Revoke all user refresh tokens
    const revokedCount = await TokenService.revokeAllUserRefreshTokens(userId);
    
    log.info('All user tokens revoked', {
      operation: 'user_token_revoke',
      userId,
      revokedCount,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'All user tokens revoked successfully',
      revokedCount
    });
    
  } catch (error) {
    log.error('User token revocation error', {
      operation: 'user_token_revoke',
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return ErrorBuilder.serverError(res, 'User token revocation failed');
  }
}

/**
 * Token Cleanup Controller
 * POST /api/auth/cleanup
 */
export async function cleanupTokens(req: Request, res: Response): Promise<Response> {
  try {
    // Cleanup expired tokens
    const cleanedCount = await TokenService.cleanupExpiredTokens();
    
    log.info('Token cleanup completed', {
      operation: 'token_cleanup',
      cleanedCount,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Token cleanup completed',
      cleanedCount
    });
    
  } catch (error) {
    log.error('Token cleanup error', {
      operation: 'token_cleanup',
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    });
    
    return ErrorBuilder.serverError(res, 'Token cleanup failed');
  }
}
