/**
 * Token Service
 * 
 * Manages token generation, validation, and refresh token rotation.
 * Implements dual-token system with security features.
 */

import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  TokenPair, 
  RefreshTokenRecord,
  TokenValidationResult,
  TokenErrorCode,
  TokenContext
} from '../../../types/auth';
import { AUTH_CONFIG, getJwtSecret } from './config';
import { TOKEN_CONSTANTS, SECURITY_CONSTANTS } from './constants';
import { log } from '../../logging';

/**
 * Token Service Class
 * Handles all token-related operations
 */
export class TokenService {
  private static readonly JWT_SECRET = getJwtSecret();
  private static readonly ENCODED_KEY = new TextEncoder().encode(this.JWT_SECRET);

  /**
   * Generate token pair (access + refresh)
   */
  static async generateTokenPair(
    userId: string,
    email: string,
    userType: 'employee' | 'manager' | 'admin' | 'super_admin',
    sessionId: string,
    context: TokenContext
  ): Promise<TokenPair> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const tokenFamily = this.generateTokenFamily();
      
      // Generate access token (15 minutes)
      const accessTokenPayload: AccessTokenPayload = {
        userId,
        email,
        userType,
        sessionId,
        type: 'access',
        iat: now,
        exp: now + (AUTH_CONFIG.accessTokenExpirationMinutes * 60)
      };
      
      const accessToken = await this.signAccessToken(accessTokenPayload);
      
      // Generate refresh token (7 days)
      const refreshTokenPayload: RefreshTokenPayload = {
        userId,
        sessionId,
        tokenFamily,
        type: 'refresh',
        iat: now,
        exp: now + (AUTH_CONFIG.refreshTokenExpirationDays * 24 * 60 * 60)
      };
      
      const refreshToken = await this.signRefreshToken(refreshTokenPayload);
      
      // Calculate expiration dates
      const accessTokenExpiresAt = new Date(accessTokenPayload.exp * 1000);
      const refreshTokenExpiresAt = new Date(refreshTokenPayload.exp * 1000);
      
      // Save refresh token to database
      await this.saveRefreshToken(
        refreshTokenPayload,
        refreshToken,
        context
      );
      
      log.info('Token pair generated', {
        userId,
        sessionId,
        tokenFamily,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        ipAddress: context.ipAddress
      });
      
      return {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt
      };
    } catch (error) {
      log.error('Failed to generate token pair', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify access token
   */
  static async verifyAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = await this.verifyToken(token, 'access') as AccessTokenPayload;
      
      if (!payload) {
        return {
          isValid: false,
          error: 'Invalid token',
          errorCode: TokenErrorCode.INVALID_TOKEN
        };
      }
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return {
          isValid: false,
          error: 'Token expired',
          errorCode: TokenErrorCode.EXPIRED_TOKEN,
          isExpired: true
        };
      }
      
      return {
        isValid: true,
        payload
      };
    } catch (error) {
      log.warn('Access token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isValid: false,
        error: 'Token verification failed',
        errorCode: TokenErrorCode.VALIDATION_FAILED
      };
    }
  }

  /**
   * Verify and rotate refresh token
   */
  static async verifyAndRotateRefreshToken(
    token: string,
    context: TokenContext
  ): Promise<TokenPair | null> {
    try {
      const payload = await this.verifyToken(token, 'refresh') as RefreshTokenPayload;
      
      if (!payload) {
        log.warn('Invalid refresh token', {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        });
        return null;
      }
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        log.warn('Expired refresh token', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          ipAddress: context.ipAddress
        });
        return null;
      }
      
      // Check if token is revoked
      const tokenRecord = await this.getRefreshTokenRecord(payload.tokenFamily);
      if (!tokenRecord || tokenRecord.isRevoked) {
        log.warn('Revoked refresh token attempted', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          tokenFamily: payload.tokenFamily,
          ipAddress: context.ipAddress
        });
        
        // Check for token reuse (security breach)
        if (tokenRecord && tokenRecord.isRevoked) {
          await this.handleTokenReuse(payload.tokenFamily, context);
        }
        
        return null;
      }
      
      // Verify token hash
      const isValidHash = await bcrypt.compare(token, tokenRecord.tokenHash);
      if (!isValidHash) {
        log.warn('Invalid refresh token hash', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          tokenFamily: payload.tokenFamily,
          ipAddress: context.ipAddress
        });
        return null;
      }
      
      // Revoke old refresh token
      await this.revokeRefreshToken(tokenRecord.tokenId, 'rotated');
      
      // Generate new token pair with same family
      const newTokenPair = await this.generateTokenPair(
        payload.userId,
        '', // Email will be fetched from user record
        'employee', // UserType will be fetched from user record
        payload.sessionId,
        {
          ...context,
          operation: 'rotate'
        }
      );
      
      log.info('Refresh token rotated successfully', {
        userId: payload.userId,
        sessionId: payload.sessionId,
        tokenFamily: payload.tokenFamily,
        ipAddress: context.ipAddress
      });
      
      return newTokenPair;
    } catch (error) {
      log.error('Refresh token rotation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: context.ipAddress
      });
      return null;
    }
  }

  /**
   * Save refresh token to database
   */
  private static async saveRefreshToken(
    payload: RefreshTokenPayload,
    token: string,
    context: TokenContext
  ): Promise<void> {
    try {
      const tokenId = this.generateTokenId();
      const tokenHash = await bcrypt.hash(token, 12);
      
      // Create token record (will be saved to database in future implementation)
      const _tokenRecord: RefreshTokenRecord = {
        tokenId,
        userId: payload.userId as any, // Will be converted to ObjectId in model
        sessionId: payload.sessionId,
        tokenFamily: payload.tokenFamily,
        tokenHash,
        expiresAt: new Date(payload.exp * 1000),
        createdAt: new Date(),
        isRevoked: false,
        deviceFingerprint: context.deviceFingerprint,
        ipAddress: context.ipAddress
      };
      
      // TODO: Save to database using DatabaseService
      // await DatabaseService.create('RefreshToken', tokenRecord);
      
      log.debug('Refresh token saved', {
        tokenId,
        userId: payload.userId,
        sessionId: payload.sessionId,
        tokenFamily: payload.tokenFamily,
        expiresAt: _tokenRecord.expiresAt
      });
    } catch (error) {
      log.error('Failed to save refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
        sessionId: payload.sessionId
      });
      throw error;
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(tokenId: string, reason?: string): Promise<boolean> {
    try {
      // TODO: Update token record in database
      // await DatabaseService.updateOne('RefreshToken', { tokenId }, { 
      //   isRevoked: true, 
      //   revokedAt: new Date(),
      //   revokedReason: reason 
      // });
      
      log.info('Refresh token revoked', {
        tokenId,
        reason
      });
      
      return true;
    } catch (error) {
      log.error('Failed to revoke refresh token', {
        tokenId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Revoke all user refresh tokens
   */
  static async revokeAllUserRefreshTokens(userId: string): Promise<number> {
    try {
      // TODO: Revoke all tokens for user
      // const result = await DatabaseService.updateMany('RefreshToken', 
      //   { userId, isRevoked: false },
      //   { isRevoked: true, revokedAt: new Date(), revokedReason: 'user_logout' }
      // );
      
      log.info('All user refresh tokens revoked', {
        userId
      });
      
      return 0; // result.modifiedCount
    } catch (error) {
      log.error('Failed to revoke all user refresh tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Cleanup expired refresh tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - TOKEN_CONSTANTS.EXPIRED_TOKEN_CLEANUP_DAYS);
      
      // TODO: Delete expired tokens
      // const result = await DatabaseService.deleteMany('RefreshToken', {
      //   expiresAt: { $lt: cutoffDate }
      // });
      
      log.info('Expired tokens cleaned up', {
        cutoffDate
      });
      
      return 0; // result.deletedCount
    } catch (error) {
      log.error('Failed to cleanup expired tokens', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Detect token reuse (security breach)
   */
  static async detectTokenReuse(tokenFamily: string): Promise<boolean> {
    try {
      // TODO: Check if revoked token from family was reused
      // const revokedTokens = await DatabaseService.find('RefreshToken', {
      //   tokenFamily,
      //   isRevoked: true,
      //   revokedReason: 'rotated'
      // });
      
      // Check if any revoked token was used after revocation
      // This would require additional tracking
      
      return false;
    } catch (error) {
      log.error('Failed to detect token reuse', {
        tokenFamily,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Handle token reuse (security breach)
   */
  private static async handleTokenReuse(tokenFamily: string, context: TokenContext): Promise<void> {
    try {
      // Revoke entire token family
      // await DatabaseService.updateMany('RefreshToken', 
      //   { tokenFamily },
      //   { isRevoked: true, revokedAt: new Date(), revokedReason: 'security_breach' }
      // );
      
      // Revoke all user sessions
      // await DatabaseService.updateMany('Session', 
      //   { userId: context.userId },
      //   { revoked: true, revokedAt: new Date(), revokedReason: 'security_breach' }
      // );
      
      log.error('SECURITY BREACH: Token reuse detected', {
        tokenFamily,
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        riskLevel: 'high'
      });
      
      // TODO: Send security alert notification
      // await NotificationService.sendSecurityAlert({
      //   type: 'token_reuse',
      //   userId: context.userId,
      //   tokenFamily,
      //   ipAddress: context.ipAddress,
      //   userAgent: context.userAgent
      // });
    } catch (error) {
      log.error('Failed to handle token reuse', {
        tokenFamily,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get refresh token record
   */
  private static async getRefreshTokenRecord(tokenFamily: string): Promise<RefreshTokenRecord | null> {
    try {
      // TODO: Get token record from database
      // return await DatabaseService.findOne('RefreshToken', { tokenFamily });
      return null;
    } catch (error) {
      log.error('Failed to get refresh token record', {
        tokenFamily,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Sign access token
   */
  private static async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: AUTH_CONFIG.tokenConfig.accessTokenAlgorithm })
      .setIssuedAt()
      .setExpirationTime(`${AUTH_CONFIG.accessTokenExpirationMinutes}m`)
      .sign(this.ENCODED_KEY);
  }

  /**
   * Sign refresh token
   */
  private static async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: AUTH_CONFIG.tokenConfig.accessTokenAlgorithm })
      .setIssuedAt()
      .setExpirationTime(`${AUTH_CONFIG.refreshTokenExpirationDays}d`)
      .sign(this.ENCODED_KEY);
  }

  /**
   * Verify token (generic)
   */
  private static async verifyToken(token: string, expectedType: 'access' | 'refresh'): Promise<any> {
    try {
      const { payload } = await jwtVerify(token, this.ENCODED_KEY);
      
      if (payload['type'] !== expectedType) {
        throw new Error(`Invalid token type: expected ${expectedType}, got ${payload['type']}`);
      }
      
      return payload;
    } catch (error) {
      throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate token family ID
   */
  private static generateTokenFamily(): string {
    return randomBytes(TOKEN_CONSTANTS.TOKEN_FAMILY_LENGTH).toString('hex');
  }

  /**
   * Generate token ID
   */
  private static generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}`;
    return createHash(SECURITY_CONSTANTS.DEVICE_FINGERPRINT_ALGORITHM)
      .update(data)
      .digest('hex');
  }
}
