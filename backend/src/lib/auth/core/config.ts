/**
 * Auth Configuration
 * 
 * Environment-based configuration for authentication system.
 * Follows database config pattern with dual-token settings.
 */

import { AuthConfig, TokenConfig } from '../../../types/auth';

/**
 * Get authentication configuration from environment variables
 */
export function getAuthConfig(): AuthConfig {
  return {
    // Token settings - NEW DUAL TOKEN SYSTEM
    accessTokenExpirationMinutes: parseInt(process.env['ACCESS_TOKEN_EXPIRATION_MINUTES'] || '15'),        // 15 minutes
    refreshTokenExpirationDays: parseInt(process.env['REFRESH_TOKEN_EXPIRATION_DAYS'] || '7'),           // 7 days
    refreshTokenRotationEnabled: process.env['REFRESH_TOKEN_ROTATION_ENABLED'] !== 'false',       // Rotate on every use
    
    // Rate limiting
    maxLoginAttempts: parseInt(process.env['MAX_LOGIN_ATTEMPTS'] || '5'),
    loginWindowMs: parseInt(process.env['LOGIN_WINDOW_MS'] || '900000'), // 15 min
    maxSessionsPerUser: parseInt(process.env['MAX_SESSIONS_PER_USER'] || '5'),
    
    // Session security
    sessionTimeoutMinutes: parseInt(process.env['SESSION_TIMEOUT_MINUTES'] || '1440'), // 24h
    requireIpBinding: process.env['REQUIRE_IP_BINDING'] === 'true',
    suspiciousActivityThreshold: parseInt(process.env['SUSPICIOUS_ACTIVITY_THRESHOLD'] || '3'),
    
    // Device security
    requireDeviceVerification: process.env['REQUIRE_DEVICE_VERIFICATION'] === 'true',
    maxNewDevicesPerDay: parseInt(process.env['MAX_NEW_DEVICES_PER_DAY'] || '3'),
    
    // Security thresholds
    highRiskThreshold: parseInt(process.env['HIGH_RISK_THRESHOLD'] || '70'),
    mediumRiskThreshold: parseInt(process.env['MEDIUM_RISK_THRESHOLD'] || '40'),
    
    // Token configuration
    tokenConfig: getTokenConfig(),
    
    // Cleanup settings
    expiredSessionCleanupDays: parseInt(process.env['EXPIRED_SESSION_CLEANUP_DAYS'] || '7'),
    revokedSessionCleanupDays: parseInt(process.env['REVOKED_SESSION_CLEANUP_DAYS'] || '30'),
    
    // Monitoring settings
    enableAuditLogging: process.env['ENABLE_AUDIT_LOGGING'] !== 'false',
    enableSecurityMonitoring: process.env['ENABLE_SECURITY_MONITORING'] !== 'false',
    enablePerformanceTracking: process.env['ENABLE_PERFORMANCE_TRACKING'] !== 'false'
  };
}

/**
 * Get token configuration
 */
function getTokenConfig(): TokenConfig {
  return {
    // Access token settings
    accessTokenExpirationMinutes: parseInt(process.env['ACCESS_TOKEN_EXPIRATION_MINUTES'] || '15'),
    accessTokenAlgorithm: (process.env['ACCESS_TOKEN_ALGORITHM'] as any) || 'HS256',
    
    // Refresh token settings
    refreshTokenExpirationDays: parseInt(process.env['REFRESH_TOKEN_EXPIRATION_DAYS'] || '7'),
    refreshTokenRotationEnabled: process.env['REFRESH_TOKEN_ROTATION_ENABLED'] !== 'false',
    refreshTokenFamilyTracking: process.env['REFRESH_TOKEN_FAMILY_TRACKING'] !== 'false',
    
    // Security settings
    maxRefreshTokensPerFamily: parseInt(process.env['MAX_REFRESH_TOKENS_PER_FAMILY'] || '10'),
    tokenReuseDetectionEnabled: process.env['TOKEN_REUSE_DETECTION_ENABLED'] !== 'false',
    securityBreachThreshold: parseInt(process.env['SECURITY_BREACH_THRESHOLD'] || '3'),
    
    // Cleanup settings
    expiredTokenCleanupDays: parseInt(process.env['EXPIRED_TOKEN_CLEANUP_DAYS'] || '7'),
    revokedTokenCleanupDays: parseInt(process.env['REVOKED_TOKEN_CLEANUP_DAYS'] || '30')
  };
}

/**
 * Default authentication configuration
 */
export const AUTH_CONFIG = getAuthConfig();

/**
 * JWT Secret validation
 */
export function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
}

/**
 * Environment validation
 */
export function validateAuthConfig(): void {
  const config = AUTH_CONFIG;
  
  // Validate token expiration times
  if (config.accessTokenExpirationMinutes < 1 || config.accessTokenExpirationMinutes > 60) {
    throw new Error('ACCESS_TOKEN_EXPIRATION_MINUTES must be between 1 and 60 minutes');
  }
  
  if (config.refreshTokenExpirationDays < 1 || config.refreshTokenExpirationDays > 30) {
    throw new Error('REFRESH_TOKEN_EXPIRATION_DAYS must be between 1 and 30 days');
  }
  
  // Validate rate limiting
  if (config.maxLoginAttempts < 1 || config.maxLoginAttempts > 20) {
    throw new Error('MAX_LOGIN_ATTEMPTS must be between 1 and 20');
  }
  
  if (config.loginWindowMs < 60000 || config.loginWindowMs > 3600000) {
    throw new Error('LOGIN_WINDOW_MS must be between 1 minute and 1 hour');
  }
  
  // Validate session settings
  if (config.sessionTimeoutMinutes < 15 || config.sessionTimeoutMinutes > 10080) {
    throw new Error('SESSION_TIMEOUT_MINUTES must be between 15 minutes and 7 days');
  }
  
  // Validate security thresholds
  if (config.highRiskThreshold < config.mediumRiskThreshold) {
    throw new Error('HIGH_RISK_THRESHOLD must be greater than MEDIUM_RISK_THRESHOLD');
  }
  
  if (config.mediumRiskThreshold < 0 || config.mediumRiskThreshold > 100) {
    throw new Error('MEDIUM_RISK_THRESHOLD must be between 0 and 100');
  }
  
  if (config.highRiskThreshold < 0 || config.highRiskThreshold > 100) {
    throw new Error('HIGH_RISK_THRESHOLD must be between 0 and 100');
  }
}

// Validate configuration on module load
try {
  validateAuthConfig();
} catch (error) {
  console.error('Auth configuration validation failed:', error);
  process.exit(1);
}
