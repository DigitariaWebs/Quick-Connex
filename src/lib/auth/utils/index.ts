/**
 * Authentication Utilities
 * 
 * Exports all utility functions organized by category.
 */

// JWT Utilities
export {
  signToken,
  verifyToken,
  getTokenFromCookies,
  setAuthCookie,
  clearAuthCookie
} from './jwt';

// Cookie Verification Utilities
export {
  verifyAuthCookie
} from './cookie-verification';

// Device Utilities
export {
  parseUserAgent,
  generateDeviceFingerprint,
  formatDeviceInfoForLogging,
  isSuspiciousUserAgent
} from './device';

// Security Utilities
export {
  assessSecurityRisk,
  checkSuspiciousActivity,
  extractIpAddress,
  isNewDevice,
  isNewLocation
} from './security';

// Session Utilities
export {
  generateSessionId,
  isValidSessionToken,
  calculateSessionAge,
  isSessionExpiringSoon
} from './session';

// Rate Limiting Utilities
export {
  generateRateLimitKey,
  isRateLimitExceeded,
  updateRateLimit
} from './rate-limit';

// Generic Rate Limiting
export {
  rateLimit,
  type RateLimitOptions,
  type GenericRateLimitResult
} from './generic-rate-limit';

// Privacy Utilities
export {
  hashIpAddress,
  truncateIpAddress
} from './privacy';
