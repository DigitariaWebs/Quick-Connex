/**
 * Communication System Constants
 * 
 * This file contains all constants and configuration values for the communication system.
 */

/**
 * Communication Channels
 */
export const COMMUNICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  REALTIME: 'realtime'
} as const;

/**
 * Communication Priority Levels
 */
export const COMMUNICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

/**
 * Communication Status
 */
export const COMMUNICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  BLOCKED: 'blocked'
} as const;

/**
 * Email Providers
 */
export const EMAIL_PROVIDERS = {
  NODEMAILER: 'nodemailer',
  SENDGRID: 'sendgrid'
} as const;

/**
 * SMS Providers
 */
export const SMS_PROVIDERS = {
  TWILIO: 'twilio'
} as const;

/**
 * Communication Configuration Defaults
 */
export const COMMUNICATION_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  BATCH_SIZE: 10,
  PROCESSING_INTERVAL: 10000, // 10 seconds
  RATE_LIMIT_PER_MINUTE: 60,
  RATE_LIMIT_PER_HOUR: 1000,
  RATE_LIMIT_PER_DAY: 10000,
  TEMPLATE_CACHE_TTL: 3600, // 1 hour
  ANALYTICS_RETENTION_DAYS: 90,
  ANALYTICS_AGGREGATION_INTERVAL: 60 // 1 hour
} as const;

/**
 * Communication Error Messages
 */
export const COMMUNICATION_ERRORS = {
  PROVIDER_NOT_CONFIGURED: 'Communication provider not configured',
  INVALID_RECIPIENT: 'Invalid recipient information',
  TEMPLATE_NOT_FOUND: 'Template not found',
  SEND_FAILED: 'Failed to send message',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INVALID_CONTENT: 'Invalid message content',
  PROVIDER_ERROR: 'Communication provider error',
  VALIDATION_ERROR: 'Message validation failed',
  AUTHENTICATION_ERROR: 'Provider authentication failed',
  NETWORK_ERROR: 'Network connection error',
  CONFIGURATION_ERROR: 'Configuration error',
  TEMPLATE_ERROR: 'Template rendering error',
  UNKNOWN_ERROR: 'Unknown error occurred'
} as const;

/**
 * Communication Success Messages
 */
export const COMMUNICATION_SUCCESS = {
  EMAIL_SENT: 'Email sent successfully',
  SMS_SENT: 'SMS sent successfully',
  TEMPLATE_LOADED: 'Template loaded successfully',
  BATCH_PROCESSED: 'Batch processed successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully',
  PROVIDER_CONNECTED: 'Provider connected successfully'
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITING = {
  WINDOW_SIZES: {
    MINUTE: 60, // seconds
    HOUR: 3600, // seconds
    DAY: 86400 // seconds
  },
  STRATEGIES: {
    SLIDING_WINDOW: 'sliding_window',
    FIXED_WINDOW: 'fixed_window',
    TOKEN_BUCKET: 'token_bucket'
  },
  DEFAULT_LIMITS: {
    PER_MINUTE: 60,
    PER_HOUR: 1000,
    PER_DAY: 10000,
    BURST_LIMIT: 100
  }
} as const;

/**
 * Template Constants
 */
export const TEMPLATE = {
  CACHE: {
    DEFAULT_TTL: 3600, // 1 hour
    MAX_SIZE: 1000,
    CLEANUP_INTERVAL: 300 // 5 minutes
  }
} as const;

/**
 * Provider Health Status
 */
export const PROVIDER_HEALTH = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
} as const;

/**
 * Event Types
 */
export const EVENT_TYPES = {
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_FAILED: 'message_failed',
  MESSAGE_BOUNCED: 'message_bounced',
  MESSAGE_READ: 'message_read',
  MESSAGE_CLICKED: 'message_clicked',
  BULK_SEND_STARTED: 'bulk_send_started',
  BULK_SEND_COMPLETED: 'bulk_send_completed',
  PROVIDER_ERROR: 'provider_error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  TEMPLATE_RENDERED: 'template_rendered',
  TEMPLATE_ERROR: 'template_error',
  USER_PREFERENCES_UPDATED: 'user_preferences_updated',
  ANALYTICS_UPDATED: 'analytics_updated'
} as const;

/**
 * Validation Constants
 */
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  MAX_EMAIL_LENGTH: 320,
  MAX_SMS_LENGTH: 1600,
  MAX_SUBJECT_LENGTH: 998,
  MAX_ATTACHMENT_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_ATTACHMENT_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

/**
 * Security Constants
 */
export const SECURITY = {
  ENCRYPTION_ALGORITHMS: {
    AES_256_GCM: 'aes-256-gcm',
    AES_256_CBC: 'aes-256-cbc'
  },
  SANITIZATION: {
    ALLOWED_HTML_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    REMOVE_SCRIPTS: true,
    REMOVE_STYLES: true
  },
  AUDIT_LEVELS: {
    MINIMAL: 'minimal',
    STANDARD: 'standard',
    DETAILED: 'detailed'
  }
} as const;

/**
 * Monitoring Constants
 */
export const MONITORING = {
  HEALTH_CHECK_INTERVALS: {
    PROVIDER: 60, // seconds
    QUEUE: 30, // seconds
    DATABASE: 120 // seconds
  },
  METRICS_INTERVALS: {
    REAL_TIME: 10, // seconds
    STANDARD: 60, // seconds
    ANALYTICS: 300 // seconds
  },
  ALERT_THRESHOLDS: {
    ERROR_RATE: 0.05, // 5%
    RESPONSE_TIME: 5000, // 5 seconds
    QUEUE_SIZE: 1000
  }
} as const;

/**
 * Queue Constants
 */
export const QUEUE = {
  PRIORITIES: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4
  },
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RETRYING: 'retrying'
  },
  DEFAULT_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000,
    BATCH_SIZE: 10,
    PROCESSING_INTERVAL: 10000
  }
} as const;

