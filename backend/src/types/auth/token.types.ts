/**
 * Token Types
 * 
 * Dual-token system types for access and refresh tokens.
 * Implements token rotation and family tracking for security.
 */

import { ObjectId } from '../common';

// ===== TOKEN PAYLOADS =====

/**
 * Access Token Payload
 * Short-lived token (15 minutes) for API access
 */
export interface AccessTokenPayload {
  userId: string;
  email: string;
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  sessionId: string;
  type: 'access';
  iat: number;
  exp: number;
  [key: string]: any; // Index signature for JWT compatibility
}

/**
 * Refresh Token Payload
 * Long-lived token (7 days) for token refresh
 */
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenFamily: string; // For rotation tracking
  type: 'refresh';
  iat: number;
  exp: number;
  [key: string]: any; // Index signature for JWT compatibility
}

// ===== TOKEN RESPONSES =====

/**
 * Token Pair
 * Both tokens returned to client after login/refresh
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

/**
 * Token Refresh Response
 * Response from refresh endpoint
 */
export interface TokenRefreshResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  error?: string;
  errorCode?: string;
}

// ===== DATABASE RECORDS =====

/**
 * Refresh Token Database Record
 * Stored in database with hashed token
 */
export interface RefreshTokenRecord {
  _id?: ObjectId;
  tokenId: string;
  userId: ObjectId;
  sessionId: string;
  tokenFamily: string;
  tokenHash: string; // bcrypt hash
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  deviceFingerprint: string;
  ipAddress: string;
}

// ===== TOKEN FAMILY TRACKING =====

/**
 * Token Family
 * Groups related refresh tokens for rotation tracking
 */
export interface TokenFamily {
  familyId: string;
  userId: ObjectId;
  sessionId: string;
  createdAt: Date;
  lastUsedAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  tokenCount: number;
}

/**
 * Token Rotation Event
 * Logged when tokens are rotated
 */
export interface TokenRotationEvent {
  familyId: string;
  oldTokenId: string;
  newTokenId: string;
  userId: ObjectId;
  sessionId: string;
  timestamp: Date;
  ipAddress: string;
  deviceFingerprint: string;
  reason: 'refresh' | 'security_breach' | 'manual_revoke';
}

// ===== TOKEN VALIDATION =====

/**
 * Token Validation Result
 * Result of token verification
 */
export interface TokenValidationResult {
  isValid: boolean;
  payload?: AccessTokenPayload | RefreshTokenPayload;
  error?: string;
  errorCode?: string;
  isExpired?: boolean;
  isRevoked?: boolean;
}

/**
 * Token Security Check
 * Security analysis of token usage
 */
export interface TokenSecurityCheck {
  suspicious: boolean;
  flags: string[];
  riskScore: number;
  recommendations: string[];
  familyHistory?: TokenFamily[];
  recentRotations?: TokenRotationEvent[];
}

// ===== TOKEN CONFIGURATION =====

/**
 * Token Configuration
 * Settings for token generation and validation
 */
export interface TokenConfig {
  // Access token settings
  accessTokenExpirationMinutes: number;
  accessTokenAlgorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  
  // Refresh token settings
  refreshTokenExpirationDays: number;
  refreshTokenRotationEnabled: boolean;
  refreshTokenFamilyTracking: boolean;
  
  // Security settings
  maxRefreshTokensPerFamily: number;
  tokenReuseDetectionEnabled: boolean;
  securityBreachThreshold: number;
  
  // Cleanup settings
  expiredTokenCleanupDays: number;
  revokedTokenCleanupDays: number;
}

// ===== TOKEN ERRORS =====

/**
 * Token Error Codes
 * Specific error codes for token operations
 */
export enum TokenErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  REVOKED_TOKEN = 'REVOKED_TOKEN',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  SECURITY_BREACH = 'SECURITY_BREACH',
  FAMILY_REVOKED = 'FAMILY_REVOKED',
  INVALID_FAMILY = 'INVALID_FAMILY',
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',
  ROTATION_FAILED = 'ROTATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

/**
 * Token Error
 * Error thrown for token-related issues
 */
export interface TokenError {
  code: TokenErrorCode;
  message: string;
  status: number;
  details?: {
    tokenId?: string;
    familyId?: string;
    userId?: string;
    sessionId?: string;
    reason?: string;
  };
}

// ===== TOKEN STATISTICS =====

/**
 * Token Statistics
 * Metrics for token usage and security
 */
export interface TokenStats {
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  revokedTokens: number;
  rotatedTokens: number;
  securityBreaches: number;
  averageTokenAge: number;
  averageFamilySize: number;
  rotationFrequency: number;
}

/**
 * Token Family Statistics
 * Statistics for token families
 */
export interface TokenFamilyStats {
  totalFamilies: number;
  activeFamilies: number;
  revokedFamilies: number;
  averageFamilyAge: number;
  averageTokensPerFamily: number;
  familiesWithBreaches: number;
}

// ===== UTILITY TYPES =====

/**
 * Token Type Guard
 * Type guard for token payloads
 */
export type TokenType = 'access' | 'refresh';

/**
 * Token Operation
 * Operations that can be performed on tokens
 */
export type TokenOperation = 'generate' | 'verify' | 'refresh' | 'revoke' | 'rotate' | 'cleanup';

/**
 * Token Context
 * Context information for token operations
 */
export interface TokenContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  operation: TokenOperation;
  timestamp: Date;
  metadata?: Record<string, any>;
}
