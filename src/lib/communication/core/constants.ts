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
  SENDGRID: 'sendgrid',
  GMAIL_API: 'gmail-api',
  GMAIL_SMTP: 'gmail-smtp',
  NODEMAILER: 'nodemailer',
  SES: 'ses',
  MAILGUN: 'mailgun',
  RESEND: 'resend'
} as const;

/**
 * SMS Providers
 */
export const SMS_PROVIDERS = {
  TWILIO: 'twilio',
  AWS_SNS: 'aws-sns',
  MESSAGEBIRD: 'messagebird',
  VONAGE: 'vonage',
  PLIVO: 'plivo'
} as const;

/**
 * Communication Configuration
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
  PROVIDER_ERROR: 'Communication provider error'
} as const;

/**
 * Communication Success Messages
 */
export const COMMUNICATION_SUCCESS = {
  EMAIL_SENT: 'Email sent successfully',
  SMS_SENT: 'SMS sent successfully',
  TEMPLATE_LOADED: 'Template loaded successfully',
  BATCH_PROCESSED: 'Batch processed successfully'
} as const;
