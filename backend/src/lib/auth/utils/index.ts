/**
 * Auth Utilities Index
 * 
 * Centralized exports for all authentication utilities.
 */

export { 
  hashIpAddress, 
  truncateIpAddress, 
  isLoginHistoryExpired,
  cleanExpiredLoginHistory 
} from './privacy';

export {
  parseUserAgent,
  generateDeviceFingerprint
} from './device';

export {
  assessSecurityRisk,
  checkSuspiciousActivity,
  extractIpAddress,
  isNewDevice,
  isNewLocation
} from './security';