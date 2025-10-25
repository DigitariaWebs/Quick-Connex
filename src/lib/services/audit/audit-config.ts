/**
 * Audit Configuration
 * 
 * Configuration constants and settings for audit logging
 * including retention policies, categories, and security settings.
 */

import { AuditAction, AuditCategory, ActorType, RiskLevel, TargetResourceType } from '@/models/AuditLog';

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
 * Audit categories and their configurations
 */
export const AUDIT_CATEGORIES = {
  AUTHENTICATION: {
    retentionDays: AUDIT_RETENTION_POLICIES.AUTHENTICATION,
    requiresReview: false,
    sensitiveFields: ['password', 'token', 'sessionId']
  },
  USER_MANAGEMENT: {
    retentionDays: AUDIT_RETENTION_POLICIES.HIGH_RISK,
    requiresReview: true,
    sensitiveFields: ['email', 'phone', 'ssn', 'address']
  },
  PATIENT_MANAGEMENT: {
    retentionDays: AUDIT_RETENTION_POLICIES.CRITICAL,
    requiresReview: true,
    sensitiveFields: ['ssn', 'address', 'phone', 'medicalRecordNumber', 'insuranceNumber']
  },
  TRANSFER_MANAGEMENT: {
    retentionDays: AUDIT_RETENTION_POLICIES.HIGH_RISK,
    requiresReview: true,
    sensitiveFields: ['patientId', 'medicalRecordNumber']
  },
  COMMUNICATION: {
    retentionDays: AUDIT_RETENTION_POLICIES.COMMUNICATION,
    requiresReview: false,
    sensitiveFields: ['content', 'message']
  },
  FILE_MANAGEMENT: {
    retentionDays: AUDIT_RETENTION_POLICIES.FILE_MANAGEMENT,
    requiresReview: true,
    sensitiveFields: ['content', 'metadata']
  },
  DATA_ACCESS: {
    retentionDays: AUDIT_RETENTION_POLICIES.DATA_ACCESS,
    requiresReview: true,
    sensitiveFields: ['query', 'filters', 'exportedData']
  },
  SYSTEM: {
    retentionDays: AUDIT_RETENTION_POLICIES.SYSTEM,
    requiresReview: true,
    sensitiveFields: ['configuration', 'secrets', 'credentials']
  },
  GENERAL: {
    retentionDays: AUDIT_RETENTION_POLICIES.GENERAL,
    requiresReview: false,
    sensitiveFields: []
  }
} as const;

/**
 * High-risk actions that require special handling
 */
export const HIGH_RISK_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.USER_DATA_EXPORTED,
  AuditAction.DATA_EXPORTED,
  AuditAction.BULK_DATA_ACCESS,
  AuditAction.BULK_TRANSFER_OPERATION,
  AuditAction.SYSTEM_MAINTENANCE
];

/**
 * Actions that require immediate review
 */
export const IMMEDIATE_REVIEW_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.SYSTEM_MAINTENANCE,
  AuditAction.BULK_TRANSFER_OPERATION
];

/**
 * Actions that require admin approval
 */
export const ADMIN_APPROVAL_ACTIONS: AuditAction[] = [
  AuditAction.USER_DELETED,
  AuditAction.TRANSFER_DELETED,
  AuditAction.PATIENT_DELETED,
  AuditAction.SYSTEM_MAINTENANCE,
  AuditAction.BULK_TRANSFER_OPERATION,
  AuditAction.USER_DATA_EXPORTED,
  AuditAction.DATA_EXPORTED
];

/**
 * Sensitive data fields by resource type
 */
export const SENSITIVE_FIELDS_BY_RESOURCE: Record<TargetResourceType, string[]> = {
  [TargetResourceType.USER]: ['password', 'email', 'phone', 'ssn', 'address', 'dateOfBirth'],
  [TargetResourceType.PATIENT]: ['ssn', 'address', 'phone', 'medicalRecordNumber', 'insuranceNumber', 'dateOfBirth'],
  [TargetResourceType.TRANSFER]: ['patientId', 'medicalRecordNumber', 'patientName'],
  [TargetResourceType.FILE]: ['content', 'metadata', 'filePath'],
  [TargetResourceType.SYSTEM]: ['configuration', 'secrets', 'credentials', 'apiKeys'],
  [TargetResourceType.NOTIFICATION]: [],
  [TargetResourceType.SETTING]: [],
  [TargetResourceType.REPORT]: [],
  [TargetResourceType.API]: [],
  [TargetResourceType.SESSION]: []
};

/**
 * Audit log levels and their configurations
 */
export const AUDIT_LOG_LEVELS = {
  TRACE: {
    enabled: true,
    retentionDays: 30,
    requiresReview: false
  },
  DEBUG: {
    enabled: true,
    retentionDays: 90,
    requiresReview: false
  },
  INFO: {
    enabled: true,
    retentionDays: AUDIT_RETENTION_POLICIES.GENERAL,
    requiresReview: false
  },
  WARN: {
    enabled: true,
    retentionDays: AUDIT_RETENTION_POLICIES.HIGH_RISK,
    requiresReview: true
  },
  ERROR: {
    enabled: true,
    retentionDays: AUDIT_RETENTION_POLICIES.CRITICAL,
    requiresReview: true
  },
  CRITICAL: {
    enabled: true,
    retentionDays: AUDIT_RETENTION_POLICIES.CRITICAL,
    requiresReview: true
  }
} as const;

/**
 * Audit monitoring thresholds
 */
export const MONITORING_THRESHOLDS = {
  HIGH_RISK_ACTIONS_PER_HOUR: 10,
  FAILED_LOGINS_PER_HOUR: 5,
  BULK_OPERATIONS_PER_DAY: 3,
  DATA_EXPORTS_PER_DAY: 5,
  SYSTEM_CHANGES_PER_DAY: 2,
  SUSPICIOUS_ACTIVITY_COUNT: 3
} as const;

/**
 * Audit alert configurations
 */
export const ALERT_CONFIGURATIONS = {
  ENABLED: true,
  EMAIL_ALERTS: true,
  SLACK_ALERTS: false,
  WEBHOOK_ALERTS: false,
  ALERT_RECIPIENTS: ['admin@example.com'],
  ALERT_COOLDOWN_MINUTES: 30,
  ALERT_THRESHOLDS: {
    HIGH_RISK_ACTIONS: 5,
    FAILED_LOGINS: 3,
    BULK_OPERATIONS: 2,
    DATA_EXPORTS: 3,
    SYSTEM_CHANGES: 1
  }
} as const;

/**
 * Audit data sanitization rules
 */
export const SANITIZATION_RULES = {
  EMAIL_PATTERN: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE_PATTERN: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  SSN_PATTERN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  CREDIT_CARD_PATTERN: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  IP_ADDRESS_PATTERN: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  TOKEN_PATTERN: /[a-zA-Z0-9]{20,}/g
} as const;

/**
 * Audit export configurations
 */
export const EXPORT_CONFIGURATIONS = {
  MAX_RECORDS_PER_EXPORT: 10000,
  EXPORT_FORMATS: ['json', 'csv', 'xlsx'],
  EXPORT_ENCRYPTION: true,
  EXPORT_RETENTION_DAYS: 30,
  EXPORT_APPROVAL_REQUIRED: true
} as const;

/**
 * Audit backup configurations
 */
export const BACKUP_CONFIGURATIONS = {
  ENABLED: true,
  BACKUP_INTERVAL_HOURS: 24,
  BACKUP_RETENTION_DAYS: 90,
  BACKUP_ENCRYPTION: true,
  BACKUP_COMPRESSION: true,
  BACKUP_LOCATION: 's3://audit-backups/'
} as const;

/**
 * Default audit settings
 */
export const DEFAULT_AUDIT_SETTINGS = {
  ENABLED: true,
  ASYNC_PROCESSING: true,
  ERROR_RECOVERY: true,
  BATCH_SIZE: 100,
  BATCH_TIMEOUT_MS: 5000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  COMPRESSION_ENABLED: true,
  ENCRYPTION_ENABLED: true
} as const;

/**
 * Audit performance settings
 */
export const PERFORMANCE_SETTINGS = {
  MAX_CONCURRENT_OPERATIONS: 10,
  BATCH_PROCESSING_SIZE: 100,
  CACHE_SIZE: 1000,
  CACHE_TTL_MS: 300000, // 5 minutes
  INDEX_OPTIMIZATION: true,
  QUERY_TIMEOUT_MS: 30000
} as const;

/**
 * Audit security settings
 */
export const SECURITY_SETTINGS = {
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  HASH_ALGORITHM: 'SHA-256',
  SALT_ROUNDS: 12,
  TOKEN_EXPIRY_HOURS: 24,
  SESSION_TIMEOUT_MINUTES: 30,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30
} as const;
