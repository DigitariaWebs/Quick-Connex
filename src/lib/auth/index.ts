/**
 * Authentication Module Exports
 * 
 * Clean, centralized exports for the authentication system.
 * Single import point for all auth-related functionality.
 */

// ===== MAIN SERVICE =====
export { AuthService } from './AuthService';

// ===== TYPES =====
export type {
  AuthContext,
  AuthResult,
  AuthOptions,
  LoginCredentials,
  LoginResult,
  SessionValidation,
  TokenPayload,
  AuthUser,
  AuthSession,
  SecurityCheck,
  RateLimitResult,
  RiskAssessment,
  DeviceInfo,
  LocationInfo,
  RequestInfo,
  AuthAuditContext,
  AuthConfig,
  UserRole,
  AuthErrorCode,
  AuthResponse,
  SessionInfo
} from './auth-types';

// ===== UTILITIES =====
export {
  signToken,
  verifyToken,
  getTokenFromCookies,
  setAuthCookie,
  clearAuthCookie
} from './jwt-utils';

export {
  handleAuthError
} from './auth-error-handler';

export { SessionService } from '@/lib/services/SessionService';

export { AUTH_CONFIG } from './auth-config';

// Device fingerprinting and security utilities are now inline in AuthService

// ===== CONSTANTS =====
// AuthErrorCode is already exported above