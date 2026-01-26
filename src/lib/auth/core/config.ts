/**
 * Authentication Configuration
 *
 * Centralized configuration for all authentication and session-related settings.
 * Used by both AuthService and SessionService to ensure consistency.
 */

export interface AuthConfig {
  // Rate limiting
  maxLoginAttempts: number;
  loginWindowMs: number;
  suspiciousActivityThreshold: number;

  // Session management
  maxSessionsPerUser: number;
  sessionTimeoutMinutes: number;
  tokenExpirationHours: number;
  requireIpBinding: boolean;

  // Device security
  requireDeviceVerification: boolean;
  maxNewDevicesPerDay: number;

  // JWT settings
  refreshTokenExpirationDays: number;

  // Security thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;

  // Account security
  accountLockoutDurationMs: number;
  passwordResetExpiryHours: number;

  // Session cleanup
  cleanupIntervalMs: number;
  maxSessionAgeHours: number;
}

export const AUTH_CONFIG: AuthConfig = {
  // Rate limiting
  maxLoginAttempts: 5,
  loginWindowMs: 1 * 60 * 1000, // 1 minute
  suspiciousActivityThreshold: 3,

  // Session management
  maxSessionsPerUser: 3,
  sessionTimeoutMinutes: 8 * 60, // 8 hours (matching AuthService)
  tokenExpirationHours: 24,
  requireIpBinding: true, // Matching AuthService

  // Device security
  requireDeviceVerification: true,
  maxNewDevicesPerDay: 2,

  // JWT settings
  refreshTokenExpirationDays: 7,

  // Security thresholds
  highRiskThreshold: 70,
  mediumRiskThreshold: 40,

  // Account security
  accountLockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  passwordResetExpiryHours: 24,

  // Session cleanup
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  maxSessionAgeHours: 7 * 24, // 7 days
};

export default AUTH_CONFIG;
