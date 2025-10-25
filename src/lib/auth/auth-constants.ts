/**
 * Authentication Constants
 * 
 * Constants and storage for authentication service including
 * rate limiting, failed attempts tracking, and session management.
 */

/**
 * Rate limiting storage
 * Key format: "type:identifier" (e.g., "login:user@example.com")
 * Value: { count: number, resetTime: number }
 */
export const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Failed login attempts tracking
 * Key: userId
 * Value: { count: number, lastAttempt: number }
 */
export const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * Active sessions tracking (for cleanup)
 * Key: sessionId
 * Value: { userId: string, expiresAt: Date }
 */
export const activeSessions = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * Security flags for suspicious activity
 */
export const SECURITY_FLAGS = {
  MULTIPLE_FAILED_LOGINS: 'multiple_failed_logins',
  UNUSUAL_IP_ADDRESS: 'unusual_ip_address',
  NEW_DEVICE: 'new_device',
  NEW_LOCATION: 'new_location',
  SUSPICIOUS_USER_AGENT: 'suspicious_user_agent',
  HIGH_RISK_USER: 'high_risk_user',
  ADMIN_ACCESS: 'admin_access',
  BULK_OPERATION: 'bulk_operation'
} as const;

/**
 * Risk level thresholds
 */
export const RISK_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 90
} as const;

/**
 * Session limits and timeouts
 */
export const SESSION_LIMITS = {
  MAX_SESSIONS_PER_USER: 5,
  SESSION_DURATION_HOURS: 24,
  REFRESH_THRESHOLD_MINUTES: 30,
  WARNING_THRESHOLD_MINUTES: 10,
  CLEANUP_INTERVAL_HOURS: 1
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  LOGIN: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    LOCKOUT_MS: 30 * 60 * 1000 // 30 minutes
  },
  SIGNUP: {
    MAX_ATTEMPTS: 3,
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    LOCKOUT_MS: 2 * 60 * 60 * 1000 // 2 hours
  },
  PASSWORD_RESET: {
    MAX_ATTEMPTS: 3,
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    LOCKOUT_MS: 2 * 60 * 60 * 1000 // 2 hours
  }
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
 * Device types for classification
 */
export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  UNKNOWN: 'unknown'
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
 * Session status values
 */
export const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  SUSPENDED: 'suspended'
} as const;

/**
 * Authentication error codes
 */
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

/**
 * Cleanup intervals for various tasks
 */
export const CLEANUP_INTERVALS = {
  FAILED_ATTEMPTS_MS: 24 * 60 * 60 * 1000, // 24 hours
  RATE_LIMIT_MS: 60 * 60 * 1000, // 1 hour
  EXPIRED_SESSIONS_MS: 60 * 60 * 1000, // 1 hour
  AUDIT_LOGS_MS: 7 * 24 * 60 * 60 * 1000 // 7 days
} as const;

/**
 * Default timeouts for various operations
 */
export const TIMEOUTS = {
  LOGIN_MS: 30 * 1000, // 30 seconds
  SIGNUP_MS: 60 * 1000, // 1 minute
  SESSION_REFRESH_MS: 10 * 1000, // 10 seconds
  PASSWORD_RESET_MS: 30 * 1000, // 30 seconds
  DATABASE_QUERY_MS: 10 * 1000 // 10 seconds
} as const;

/**
 * Password requirements
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: true,
  FORBID_COMMON: true,
  FORBID_USER_INFO: true
} as const;

/**
 * Token expiration times
 */
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN_HOURS: 1,
  REFRESH_TOKEN_DAYS: 30,
  PASSWORD_RESET_HOURS: 1,
  EMAIL_VERIFICATION_HOURS: 24
} as const;
