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

export {
  parseUserAgent,
  generateDeviceFingerprint,
  assessSecurityRisk,
  checkSuspiciousActivity,
  extractIpAddress,
  isNewDevice,
  isNewLocation,
  generateSessionId,
  isValidSessionToken,
  calculateSessionAge,
  isSessionExpiringSoon,
  formatDeviceInfoForLogging,
  isSuspiciousUserAgent,
  generateRateLimitKey,
  isRateLimitExceeded,
  updateRateLimit
} from './auth-utils';

export {
  rateLimitStore,
  failedAttempts,
  activeSessions,
  SECURITY_FLAGS,
  RISK_THRESHOLDS,
  SESSION_LIMITS,
  RATE_LIMITS,
  SECURITY_RECOMMENDATIONS,
  AUTH_ERROR_CODES,
  CLEANUP_INTERVALS,
  TIMEOUTS
} from './auth-constants';

export { SessionService } from '@/lib/services/session';

export { AUTH_CONFIG } from './auth-config';