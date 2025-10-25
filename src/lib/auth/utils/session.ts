/**
 * Session Management Utilities
 * 
 * Basic session utilities that don't require database access.
 * For full session management, use the sessions module.
 */

// Re-export session utilities from the sessions module
export {
  generateSessionId,
  isValidSessionToken,
  calculateSessionAge,
  isSessionExpiringSoon
} from '../sessions/utils';
