/**
 * Audit Configuration
 * 
 * Configuration objects and settings for audit logging
 * including retention policies, monitoring, and security settings.
 */

// Types are not used in this config file

/**
 * Audit retention policies (in days)
 */
export const AUDIT_RETENTION_POLICIES = {
  GENERAL: 730, // 2 years
  HIGH_RISK: 2555, // 7 years
  CRITICAL: 3650, // 10 years
  SYSTEM: 365, // 1 year
  AUTHENTICATION: 90, // 3 months
  DATA_ACCESS: 1095, // 3 years
  FILE_MANAGEMENT: 1825, // 5 years
  COMMUNICATION: 365 // 1 year
} as const;

/**
 * Risk level mappings
 */
export const RISK_LEVEL_MAPPINGS = {
  LOW: {
    retentionDays: AUDIT_RETENTION_POLICIES.GENERAL,
    requiresReview: false,
    alertThreshold: 100
  },
  MEDIUM: {
    retentionDays: AUDIT_RETENTION_POLICIES.HIGH_RISK,
    requiresReview: true,
    alertThreshold: 50
  },
  HIGH: {
    retentionDays: AUDIT_RETENTION_POLICIES.CRITICAL,
    requiresReview: true,
    alertThreshold: 10
  },
  CRITICAL: {
    retentionDays: AUDIT_RETENTION_POLICIES.CRITICAL,
    requiresReview: true,
    alertThreshold: 1
  }
} as const;

/**
 * Monitoring thresholds for audit events
 */
export const AUDIT_MONITORING_THRESHOLDS = {
  HIGH_RISK_SESSION_COUNT: 10,
  SUSPICIOUS_ACTIVITY_COUNT: 5,
  RAPID_SESSION_CREATION_COUNT: 3,
  UNUSUAL_IP_COUNT: 2,
  FAILED_VALIDATION_COUNT: 3
} as const;

/**
 * Alert configurations
 */
export const ALERT_CONFIGURATIONS = {
  EMAIL: {
    enabled: true,
    recipients: ['admin@hospital.com', 'security@hospital.com'],
    template: 'audit_alert'
  },
  SLACK: {
    enabled: false,
    webhook: process.env['SLACK_AUDIT_WEBHOOK'],
    channel: '#audit-alerts'
  },
  SMS: {
    enabled: false,
    recipients: ['+1234567890'],
    provider: 'twilio'
  }
} as const;

/**
 * Data sanitization rules
 */
export const SANITIZATION_RULES = {
  PASSWORD: {
    pattern: /password/i,
    replacement: '[REDACTED]',
    fields: ['password', 'newPassword', 'oldPassword']
  },
  EMAIL: {
    pattern: /email/i,
    replacement: '[EMAIL]',
    fields: ['email', 'userEmail', 'recipientEmail']
  },
  PHONE: {
    pattern: /phone/i,
    replacement: '[PHONE]',
    fields: ['phone', 'phoneNumber', 'mobile']
  },
  SSN: {
    pattern: /ssn|social/i,
    replacement: '[SSN]',
    fields: ['ssn', 'socialSecurityNumber']
  }
} as const;

/**
 * Export configurations
 */
export const EXPORT_CONFIGURATIONS = {
  FORMATS: ['json', 'csv', 'xlsx'],
  MAX_RECORDS: 10000,
  COMPRESSION: true,
  ENCRYPTION: true,
  RETENTION_DAYS: 30
} as const;

/**
 * Backup configurations
 */
export const BACKUP_CONFIGURATIONS = {
  FREQUENCY: 'daily',
  RETENTION_DAYS: 90,
  COMPRESSION: true,
  ENCRYPTION: true,
  STORAGE_LOCATION: 's3://audit-backups'
} as const;

/**
 * Default audit settings
 */
export const DEFAULT_AUDIT_SETTINGS = {
  ENABLED: true,
  LOG_LEVEL: 'info',
  RETENTION_DAYS: 730,
  REAL_TIME_ALERTS: true,
  BATCH_PROCESSING: true,
  BATCH_SIZE: 100,
  BATCH_INTERVAL_MS: 5000
} as const;

/**
 * Performance settings
 */
export const AUDIT_PERFORMANCE_SETTINGS = {
  MAX_CONCURRENT_OPERATIONS: 10,
  BATCH_SIZE: 100,
  BATCH_TIMEOUT_MS: 5000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_MS: 300000 // 5 minutes
} as const;

/**
 * Security settings
 */
export const AUDIT_SECURITY_SETTINGS = {
  ENCRYPTION_ENABLED: true,
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  HASH_ALGORITHM: 'SHA-256',
  SALT_ROUNDS: 12,
  TOKEN_EXPIRY_HOURS: 24,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30
} as const;
