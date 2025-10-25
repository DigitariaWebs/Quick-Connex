/**
 * Session Configuration
 * 
 * Configuration constants and settings for session management
 * including limits, timeouts, and security thresholds.
 */

/**
 * Session limits and thresholds
 */
export const SESSION_LIMITS = {
  MAX_SESSIONS_PER_USER: 5,
  MAX_SESSIONS_PER_IP: 10,
  MAX_SESSIONS_GLOBAL: 1000,
  SESSION_DURATION_HOURS: 24,
  REFRESH_THRESHOLD_MINUTES: 30,
  WARNING_THRESHOLD_MINUTES: 10,
  CLEANUP_INTERVAL_HOURS: 1
} as const;

/**
 * Security risk thresholds
 */
export const SECURITY_THRESHOLDS = {
  LOW_RISK_MAX: 30,
  MEDIUM_RISK_MAX: 70,
  HIGH_RISK_MIN: 70,
  CRITICAL_RISK_MIN: 90
} as const;

/**
 * Session timeout configurations
 */
export const SESSION_TIMEOUTS = {
  DEFAULT_HOURS: 24,
  ADMIN_HOURS: 8,
  MOBILE_HOURS: 168, // 7 days
  API_HOURS: 1,
  REFRESH_GRACE_PERIOD_MINUTES: 5
} as const;

/**
 * Cleanup intervals for various tasks
 */
export const CLEANUP_INTERVALS = {
  EXPIRED_SESSIONS_MS: 60 * 60 * 1000, // 1 hour
  FAILED_ATTEMPTS_MS: 24 * 60 * 60 * 1000, // 24 hours
  SECURITY_LOGS_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  AUDIT_LOGS_MS: 30 * 24 * 60 * 60 * 1000 // 30 days
} as const;

/**
 * Security flags for session monitoring
 */
export const SECURITY_FLAGS = {
  NEW_DEVICE: 'new_device',
  NEW_LOCATION: 'new_location',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  HIGH_RISK_USER: 'high_risk_user',
  ADMIN_ACCESS: 'admin_access',
  BULK_OPERATION: 'bulk_operation',
  UNUSUAL_IP: 'unusual_ip_address',
  RAPID_CREATION: 'rapid_session_creation',
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins'
} as const;

/**
 * Risk level definitions
 */
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

/**
 * Session status values
 */
export const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
} as const;

/**
 * Session types
 */
export const SESSION_TYPES = {
  WEB: 'web',
  MOBILE: 'mobile',
  API: 'api',
  ADMIN: 'admin'
} as const;

/**
 * Device types for classification
 */
export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  UNKNOWN: 'unknown'
} as const;

/**
 * Platform types for classification
 */
export const PLATFORM_TYPES = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  LINUX: 'Linux',
  ANDROID: 'Android',
  IOS: 'iOS',
  UNKNOWN: 'Unknown'
} as const;

/**
 * Browser types for classification
 */
export const BROWSER_TYPES = {
  CHROME: 'Chrome',
  FIREFOX: 'Firefox',
  SAFARI: 'Safari',
  EDGE: 'Edge',
  OPERA: 'Opera',
  UNKNOWN: 'Unknown'
} as const;

/**
 * Security recommendations by risk level
 */
export const SECURITY_RECOMMENDATIONS = {
  LOW: [
    'Continue monitoring account activity'
  ],
  MEDIUM: [
    'Monitor account activity',
    'Consider enabling 2FA'
  ],
  HIGH: [
    'Enable 2FA immediately',
    'Review login history',
    'Change password',
    'Contact administrator'
  ],
  CRITICAL: [
    'Account temporarily locked',
    'Contact administrator immediately',
    'Review all recent activity',
    'Change password immediately'
  ]
} as const;

/**
 * Session error codes
 */
export const SESSION_ERROR_CODES = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_INVALID: 'SESSION_INVALID',
  TOO_MANY_SESSIONS: 'TOO_MANY_SESSIONS',
  IP_MISMATCH: 'IP_MISMATCH',
  DEVICE_MISMATCH: 'DEVICE_MISMATCH',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
} as const;

/**
 * Session validation rules
 */
export const VALIDATION_RULES = {
  MIN_SESSION_ID_LENGTH: 8,
  MAX_SESSION_ID_LENGTH: 128,
  MIN_IP_LENGTH: 7, // IPv4 minimum
  MAX_IP_LENGTH: 45, // IPv6 maximum
  MIN_USER_AGENT_LENGTH: 10,
  MAX_USER_AGENT_LENGTH: 500,
  MIN_DEVICE_FINGERPRINT_LENGTH: 10,
  MAX_DEVICE_FINGERPRINT_LENGTH: 200
} as const;

/**
 * Session monitoring thresholds
 */
export const MONITORING_THRESHOLDS = {
  HIGH_RISK_SESSION_COUNT: 10,
  SUSPICIOUS_ACTIVITY_COUNT: 5,
  RAPID_SESSION_CREATION_COUNT: 3,
  UNUSUAL_IP_COUNT: 2,
  FAILED_VALIDATION_COUNT: 3
} as const;

/**
 * Session cleanup policies
 */
export const CLEANUP_POLICIES = {
  EXPIRED_SESSIONS: {
    ENABLED: true,
    INTERVAL_HOURS: 1,
    BATCH_SIZE: 100
  },
  FAILED_ATTEMPTS: {
    ENABLED: true,
    INTERVAL_HOURS: 24,
    BATCH_SIZE: 50
  },
  SECURITY_LOGS: {
    ENABLED: true,
    INTERVAL_HOURS: 168, // 7 days
    BATCH_SIZE: 200
  },
  AUDIT_LOGS: {
    ENABLED: true,
    INTERVAL_HOURS: 720, // 30 days
    BATCH_SIZE: 500
  }
} as const;

/**
 * Session refresh policies
 */
export const REFRESH_POLICIES = {
  AUTO_REFRESH_ENABLED: true,
  REFRESH_THRESHOLD_MINUTES: 30,
  MAX_REFRESH_ATTEMPTS: 3,
  REFRESH_COOLDOWN_MINUTES: 5,
  GRACE_PERIOD_MINUTES: 10
} as const;

/**
 * Session security policies
 */
export const SECURITY_POLICIES = {
  IP_BINDING_ENABLED: true,
  DEVICE_FINGERPRINTING_ENABLED: true,
  RISK_ASSESSMENT_ENABLED: true,
  SUSPICIOUS_ACTIVITY_MONITORING: true,
  AUTO_REVOKE_HIGH_RISK: false,
  REQUIRE_SECURITY_REVIEW: true
} as const;

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG = {
  sessionTimeoutMinutes: SESSION_TIMEOUTS.DEFAULT_HOURS * 60,
  maxSessionsPerUser: SESSION_LIMITS.MAX_SESSIONS_PER_USER,
  refreshThresholdMinutes: SESSION_LIMITS.REFRESH_THRESHOLD_MINUTES,
  warningThresholdMinutes: SESSION_LIMITS.WARNING_THRESHOLD_MINUTES,
  cleanupIntervalHours: SESSION_LIMITS.CLEANUP_INTERVAL_HOURS,
  securityThresholds: SECURITY_THRESHOLDS,
  validationRules: VALIDATION_RULES,
  monitoringThresholds: MONITORING_THRESHOLDS,
  cleanupPolicies: CLEANUP_POLICIES,
  refreshPolicies: REFRESH_POLICIES,
  securityPolicies: SECURITY_POLICIES
} as const;
