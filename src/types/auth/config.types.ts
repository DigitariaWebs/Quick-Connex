/**
 * Auth Config Types
 * 
 * Authentication configuration types.
 */

export interface AuthConfig {
  // Rate limiting
  maxLoginAttempts: number;
  loginWindowMs: number;
  maxSessionsPerUser: number;
  
  // Session security
  sessionTimeoutMinutes: number;
  requireIpBinding: boolean;
  suspiciousActivityThreshold: number;
  
  // Device security
  requireDeviceVerification: boolean;
  maxNewDevicesPerDay: number;
  
  // JWT settings
  tokenExpirationHours: number;
  refreshTokenExpirationDays: number;
  
  // Security thresholds
  highRiskThreshold: number;
  mediumRiskThreshold: number;
}

