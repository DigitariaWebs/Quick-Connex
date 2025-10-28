/**
 * JWT Utilities
 * 
 * JWT token signing, verification, and extraction utilities for dual-token system.
 */

import { SignJWT, jwtVerify } from 'jose';
import { 
  AccessTokenPayload, 
  RefreshTokenPayload, 
  TokenValidationResult,
  TokenErrorCode 
} from '../../../types/auth';
import { AUTH_CONFIG, getJwtSecret } from '../core/config';

/**
 * JWT Secret and encoded key
 */
const JWT_SECRET = getJwtSecret();
const ENCODED_KEY = new TextEncoder().encode(JWT_SECRET);

/**
 * Sign access token (15 min expiration)
 */
export async function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (AUTH_CONFIG.accessTokenExpirationMinutes * 60);
  
  const accessTokenPayload = {
    userId: payload['userId'],
    email: payload['email'],
    userType: payload['userType'],
    sessionId: payload['sessionId'],
    type: payload['type'],
    iat: now,
    exp
  } as AccessTokenPayload;

  return await new SignJWT(accessTokenPayload)
    .setProtectedHeader({ alg: AUTH_CONFIG.tokenConfig.accessTokenAlgorithm })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_CONFIG.accessTokenExpirationMinutes}m`)
    .sign(ENCODED_KEY);
}

/**
 * Sign refresh token (7 day expiration)
 */
export async function signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (AUTH_CONFIG.refreshTokenExpirationDays * 24 * 60 * 60);
  
  const refreshTokenPayload = {
    userId: payload['userId'],
    sessionId: payload['sessionId'],
    tokenFamily: payload['tokenFamily'],
    type: payload['type'],
    iat: now,
    exp
  } as RefreshTokenPayload;

  return await new SignJWT(refreshTokenPayload)
    .setProtectedHeader({ alg: AUTH_CONFIG.tokenConfig.accessTokenAlgorithm })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_CONFIG.refreshTokenExpirationDays}d`)
    .sign(ENCODED_KEY);
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<TokenValidationResult> {
  try {
    const { payload } = await jwtVerify(token, ENCODED_KEY);
    
    if (payload['type'] !== 'access') {
      return {
        isValid: false,
        error: 'Invalid token type',
        errorCode: TokenErrorCode.INVALID_TOKEN
      };
    }
    
    const accessPayload = payload as unknown as AccessTokenPayload;
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (accessPayload.exp < now) {
      return {
        isValid: false,
        error: 'Token expired',
        errorCode: TokenErrorCode.EXPIRED_TOKEN,
        isExpired: true
      };
    }
    
    return {
      isValid: true,
      payload: accessPayload
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Token verification failed',
      errorCode: TokenErrorCode.VALIDATION_FAILED
    };
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string): Promise<TokenValidationResult> {
  try {
    const { payload } = await jwtVerify(token, ENCODED_KEY);
    
    if (payload['type'] !== 'refresh') {
      return {
        isValid: false,
        error: 'Invalid token type',
        errorCode: TokenErrorCode.INVALID_TOKEN
      };
    }
    
    const refreshPayload = payload as unknown as RefreshTokenPayload;
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (refreshPayload.exp < now) {
      return {
        isValid: false,
        error: 'Token expired',
        errorCode: TokenErrorCode.EXPIRED_TOKEN,
        isExpired: true
      };
    }
    
    return {
      isValid: true,
      payload: refreshPayload
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Token verification failed',
      errorCode: TokenErrorCode.VALIDATION_FAILED
    };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

/**
 * Extract token from cookies
 */
export function extractTokenFromCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName === name) {
      return cookieValue || null;
    }
  }
  
  return null;
}

/**
 * Extract access token from request
 */
export function extractAccessTokenFromRequest(req: any): string | null {
  // Try Authorization header first
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    return bearerToken;
  }
  
  // Try cookie as fallback
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie;
  return extractTokenFromCookie(cookieHeader, 'access-token') || null;
}

/**
 * Extract refresh token from request
 */
export function extractRefreshTokenFromRequest(req: any): string | null {
  // Try cookie first (preferred for refresh tokens)
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie;
  const cookieToken = extractTokenFromCookie(cookieHeader, 'refresh-token');
  if (cookieToken) {
    return cookieToken;
  }
  
  // Try Authorization header as fallback
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  return extractBearerToken(authHeader) || null;
}

/**
 * Validate token format
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Each part should be base64url encoded
  for (const part of parts) {
    if (!part || !isValidBase64Url(part)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if string is valid base64url
 */
function isValidBase64Url(str: string): boolean {
  try {
    // Base64url alphabet: A-Z, a-z, 0-9, -, _
    const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
    return base64urlRegex.test(str);
  } catch {
    return false;
  }
}

/**
 * Decode JWT payload without verification (for debugging)
 */
export function decodeTokenPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = parts[1];
    if (!payload) {
      throw new Error('Missing payload in token');
    }
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decode token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpirationDate(token: string): Date | null {
  try {
    const payload = decodeTokenPayload(token);
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const expirationDate = getTokenExpirationDate(token);
    if (!expirationDate) {
      return true;
    }
    return expirationDate < new Date();
  } catch {
    return true;
  }
}

/**
 * Get token type
 */
export function getTokenType(token: string): 'access' | 'refresh' | null {
  try {
    const payload = decodeTokenPayload(token);
    return payload.type || null;
  } catch {
    return null;
  }
}

/**
 * Get token user ID
 */
export function getTokenUserId(token: string): string | null {
  try {
    const payload = decodeTokenPayload(token);
    return payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Get token session ID
 */
export function getTokenSessionId(token: string): string | null {
  try {
    const payload = decodeTokenPayload(token);
    return payload.sessionId || null;
  } catch {
    return null;
  }
}

/**
 * Get token family (for refresh tokens)
 */
export function getTokenFamily(token: string): string | null {
  try {
    const payload = decodeTokenPayload(token);
    return payload.tokenFamily || null;
  } catch {
    return null;
  }
}
