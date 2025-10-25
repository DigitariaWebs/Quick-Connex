/**
 * Core Authentication Components
 * 
 * Exports all core authentication service components including
 * the main service, types, constants, and configuration.
 */

// Main Service
export { AuthService } from './AuthService';

// Types
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
} from './types';

// Constants
export {
  rateLimitStore,
  failedAttempts,
  activeSessions,
  RISK_THRESHOLDS,
  RATE_LIMITS,
  AUTH_ERROR_CODES,
  TIMEOUTS
} from './constants';

// Configuration
export { AUTH_CONFIG } from './config';
