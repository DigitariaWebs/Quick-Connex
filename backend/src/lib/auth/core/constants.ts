/**
 * Auth Constants
 * 
 * Constants for authentication system including rate limits, timeouts, and security settings.
 */

// ===== RATE LIMITING CONSTANTS =====

/**
 * Rate limiting constants
 */
export const RATE_LIMITS = {
  // Login attempts
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  
  // Signup attempts
  MAX_SIGNUP_ATTEMPTS: 3,
  SIGNUP_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  
  // Password reset attempts
  MAX_PASSWORD_RESET_ATTEMPTS: 3,
  PASSWORD_RESET_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  
  // Token refresh attempts
  MAX_TOKEN_REFRESH_ATTEMPTS: 10,
  TOKEN_REFRESH_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  
  // General API requests
  MAX_API_REQUESTS_PER_MINUTE: 100,
  MAX_API_REQUESTS_PER_HOUR: 1000,
  
  // Session management
  MAX_SESSIONS_PER_USER: 5,
  MAX_CONCURRENT_SESSIONS: 3
} as const;

// ===== TOKEN CONSTANTS =====

/**
 * Token-related constants
 */
export const TOKEN_CONSTANTS = {
  // Token expiration times
  ACCESS_TOKEN_EXPIRATION_MINUTES: 15,
  REFRESH_TOKEN_EXPIRATION_DAYS: 7,
  
  // Token algorithms
  DEFAULT_ALGORITHM: 'HS256',
  SUPPORTED_ALGORITHMS: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'] as const,
  
  // Token family settings
  TOKEN_FAMILY_LENGTH: 32,
  MAX_TOKENS_PER_FAMILY: 10,
  
  // Token cleanup
  EXPIRED_TOKEN_CLEANUP_DAYS: 7,
  REVOKED_TOKEN_CLEANUP_DAYS: 30,
  
  // Security settings
  TOKEN_REUSE_DETECTION_ENABLED: true,
  SECURITY_BREACH_THRESHOLD: 3
} as const;

// ===== SESSION CONSTANTS =====

/**
 * Session-related constants
 */
export const SESSION_CONSTANTS = {
  // Session timeout
  DEFAULT_SESSION_TIMEOUT_MINUTES: 24 * 60, // 24 hours
  MAX_SESSION_TIMEOUT_MINUTES: 7 * 24 * 60, // 7 days
  MIN_SESSION_TIMEOUT_MINUTES: 15, // 15 minutes
  
  // Session security
  REQUIRE_IP_BINDING: false,
  REQUIRE_DEVICE_VERIFICATION: false,
  MAX_NEW_DEVICES_PER_DAY: 3,
  
  // Session cleanup
  EXPIRED_SESSION_CLEANUP_DAYS: 7,
  REVOKED_SESSION_CLEANUP_DAYS: 30,
  
  // Session types
  SESSION_TYPES: ['web', 'mobile', 'api'] as const,
  DEFAULT_SESSION_TYPE: 'web'
} as const;

// ===== SECURITY CONSTANTS =====

/**
 * Security-related constants
 */
export const SECURITY_CONSTANTS = {
  // Risk assessment
  HIGH_RISK_THRESHOLD: 70,
  MEDIUM_RISK_THRESHOLD: 40,
  LOW_RISK_THRESHOLD: 0,
  
  // Suspicious activity
  SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
  MAX_FAILED_ATTEMPTS_BEFORE_LOCKOUT: 5,
  ACCOUNT_LOCKOUT_DURATION_MINUTES: 30,
  
  // Device fingerprinting
  DEVICE_FINGERPRINT_LENGTH: 64,
  DEVICE_FINGERPRINT_ALGORITHM: 'sha256' as const,
  
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SPECIAL_CHARS: false,
  
  // Account security
  MAX_LOGIN_HISTORY_ENTRIES: 100,
  LOGIN_HISTORY_CLEANUP_DAYS: 90
} as const;

// ===== VALIDATION CONSTANTS =====

/**
 * Validation-related constants
 */
export const VALIDATION_CONSTANTS = {
  // Email validation
  EMAIL_MAX_LENGTH: 255,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Phone validation
  PHONE_MIN_LENGTH: 7,
  PHONE_MAX_LENGTH: 15,
  PHONE_REGEX: /^\+?[0-9\s\-\(\)]+$/,
  
  // Name validation
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  NAME_REGEX: /^[a-zA-Z\s\-'\.]+$/,
  
  // UUID validation
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // IP address validation
  IPV4_REGEX: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6_REGEX: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  
  // File validation
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'] as const,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ] as const
} as const;

// ===== ERROR CONSTANTS =====

/**
 * Error-related constants
 */
export const ERROR_CONSTANTS = {
  // Error codes
  ERROR_CODES: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_NOT_APPROVED: 'ACCOUNT_NOT_APPROVED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SESSION_REVOKED: 'SESSION_REVOKED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
    REVOKED_TOKEN: 'REVOKED_TOKEN',
    TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
    SECURITY_BREACH: 'SECURITY_BREACH',
    RATE_LIMITED: 'RATE_LIMITED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    IP_MISMATCH: 'IP_MISMATCH',
    DEVICE_NOT_TRUSTED: 'DEVICE_NOT_TRUSTED',
    TOO_MANY_SESSIONS: 'TOO_MANY_SESSIONS',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  } as const,
  
  // HTTP status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  } as const
} as const;

// ===== AUDIT CONSTANTS =====

/**
 * Audit-related constants
 */
export const AUDIT_CONSTANTS = {
  // Audit levels
  AUDIT_LEVELS: ['low', 'medium', 'high'] as const,
  
  // Audit actions
  AUDIT_ACTIONS: {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    SIGNUP: 'SIGNUP',
    TOKEN_REFRESH: 'TOKEN_REFRESH',
    TOKEN_REVOKE: 'TOKEN_REVOKE',
    PASSWORD_RESET: 'PASSWORD_RESET',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ACCOUNT_LOCK: 'ACCOUNT_LOCK',
    ACCOUNT_UNLOCK: 'ACCOUNT_UNLOCK',
    SESSION_CREATE: 'SESSION_CREATE',
    SESSION_REVOKE: 'SESSION_REVOKE',
    SECURITY_BREACH: 'SECURITY_BREACH',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
  } as const,
  
  // Audit retention
  AUDIT_RETENTION_DAYS: 365,
  SENSITIVE_AUDIT_RETENTION_DAYS: 2555 // 7 years
} as const;

// ===== PERFORMANCE CONSTANTS =====

/**
 * Performance-related constants
 */
export const PERFORMANCE_CONSTANTS = {
  // Timeouts
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  DATABASE_TIMEOUT_MS: 10000, // 10 seconds
  CACHE_TIMEOUT_MS: 5000, // 5 seconds
  
  // Performance thresholds
  SLOW_QUERY_THRESHOLD_MS: 1000,
  SLOW_AUTH_THRESHOLD_MS: 500,
  SLOW_TOKEN_REFRESH_THRESHOLD_MS: 200,
  
  // Cache settings
  DEFAULT_CACHE_TTL_SECONDS: 300, // 5 minutes
  SESSION_CACHE_TTL_SECONDS: 60, // 1 minute
  TOKEN_CACHE_TTL_SECONDS: 30, // 30 seconds
  
  // Batch processing
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  BATCH_TIMEOUT_MS: 5000
} as const;

// ===== CACHE CONSTANTS =====

/**
 * Cache-related constants
 */
export const CACHE_CONSTANTS = {
  // Cache keys
  CACHE_KEYS: {
    USER_SESSION: 'user:session:',
    USER_PROFILE: 'user:profile:',
    TOKEN_FAMILY: 'token:family:',
    RATE_LIMIT: 'rate:limit:',
    DEVICE_FINGERPRINT: 'device:fingerprint:',
    SECURITY_CHECK: 'security:check:'
  } as const,
  
  // Cache TTL
  CACHE_TTL: {
    USER_SESSION: 300, // 5 minutes
    USER_PROFILE: 600, // 10 minutes
    TOKEN_FAMILY: 60, // 1 minute
    RATE_LIMIT: 60, // 1 minute
    DEVICE_FINGERPRINT: 3600, // 1 hour
    SECURITY_CHECK: 300 // 5 minutes
  } as const,
  
  // Cache limits
  MAX_CACHE_SIZE: 10000,
  MAX_CACHE_ENTRY_SIZE: 1024 * 1024, // 1MB
  CACHE_CLEANUP_INTERVAL_MS: 5 * 60 * 1000 // 5 minutes
} as const;
