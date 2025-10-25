/**
 * Session Service Module Exports
 * 
 * Clean, centralized exports for the session management system.
 * Single import point for all session-related functionality.
 */

// ===== MAIN SERVICE =====
export { SessionService } from './SessionService';

// ===== TYPES =====
export type {
  SessionCreationData,
  SessionValidationResult,
  SessionRefreshResult,
  SessionStats,
  CleanupResult,
  SecurityContext,
  RiskFactors,
  SuspiciousActivityCheck,
  SessionLimitCheck
} from './types';

// ===== UTILITIES =====
export {
  checkSessionLimit,
  calculateRiskScore,
  generateFingerprint,
  isNewDeviceForUser,
  isNewLocationForUser,
  assessRiskLevel,
  getSecurityFlags,
  buildSecurityContext,
  checkSuspiciousActivityForUser,
  getSessionLimitInfo,
  getUserSessions,
  generateJWTToken,
  isSessionExpired,
  isSessionExpiringSoon,
  calculateSessionAge,
  formatSessionForLogging,
  requiresSecurityReview,
  getSessionSecuritySummary,
  isValidSessionToken,
  generateSessionId,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken
} from './utils';

// ===== CONFIGURATION =====
export {
  SESSION_LIMITS,
  SECURITY_THRESHOLDS,
  SESSION_TIMEOUTS,
  CLEANUP_INTERVALS,
  SECURITY_FLAGS,
  RISK_LEVELS,
  SESSION_STATUS,
  SESSION_TYPES,
  DEVICE_TYPES,
  PLATFORM_TYPES,
  BROWSER_TYPES,
  SECURITY_RECOMMENDATIONS,
  SESSION_ERROR_CODES,
  VALIDATION_RULES,
  SESSION_MONITORING_THRESHOLDS,
  CLEANUP_POLICIES,
  REFRESH_POLICIES,
  SECURITY_POLICIES,
  DEFAULT_SESSION_CONFIG
} from './config';
