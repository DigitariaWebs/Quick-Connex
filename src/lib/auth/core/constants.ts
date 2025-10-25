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

// Security flags moved to sessions module

/**
 * Risk level thresholds
 */
export const RISK_THRESHOLDS = {
  LOW: 0,
  MEDIUM: 40,
  HIGH: 70,
  CRITICAL: 90
} as const;

// Session limits moved to sessions module

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

// Security recommendations moved to sessions module

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

// Cleanup intervals moved to sessions module

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
