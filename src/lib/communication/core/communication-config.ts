/**
 * Communication Service Configuration
 * 
 * This file handles configuration for email and SMS communication services,
 * including provider settings, environment variables, and validation.
 */

import {
  CommunicationConfig,
  CommunicationProviderConfig,
  EmailProvider,
  SMSProvider
} from '@/types/communication';

/**
 * Get communication configuration from environment variables
 */
export function getCommunicationConfig(): CommunicationConfig {
  return {
    providers: getProviderConfig(),
    templates: {
      directory: process.env.COMMUNICATION_TEMPLATES_DIR || './src/templates/communication',
      cacheEnabled: process.env.COMMUNICATION_TEMPLATE_CACHE === 'true',
      cacheTTL: parseInt(process.env.COMMUNICATION_TEMPLATE_CACHE_TTL || '3600'), // 1 hour
    },
    queue: {
      enabled: process.env.COMMUNICATION_QUEUE_ENABLED === 'true',
      maxRetries: parseInt(process.env.COMMUNICATION_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.COMMUNICATION_RETRY_DELAY || '5000'), // 5 seconds
      batchSize: parseInt(process.env.COMMUNICATION_BATCH_SIZE || '10'),
      processingInterval: parseInt(process.env.COMMUNICATION_PROCESSING_INTERVAL || '10000'), // 10 seconds
    },
    analytics: {
      enabled: process.env.COMMUNICATION_ANALYTICS_ENABLED === 'true',
      retentionDays: parseInt(process.env.COMMUNICATION_ANALYTICS_RETENTION_DAYS || '90'),
      aggregationInterval: parseInt(process.env.COMMUNICATION_ANALYTICS_AGGREGATION_INTERVAL || '60'), // 1 hour
    },
    rateLimiting: {
      enabled: process.env.COMMUNICATION_RATE_LIMITING_ENABLED === 'true',
      maxPerMinute: parseInt(process.env.COMMUNICATION_RATE_LIMIT_PER_MINUTE || '60'),
      maxPerHour: parseInt(process.env.COMMUNICATION_RATE_LIMIT_PER_HOUR || '1000'),
      maxPerDay: parseInt(process.env.COMMUNICATION_RATE_LIMIT_PER_DAY || '10000'),
    },
    validation: {
      emailValidation: process.env.COMMUNICATION_EMAIL_VALIDATION === 'true',
      phoneValidation: process.env.COMMUNICATION_PHONE_VALIDATION === 'true',
      contentValidation: process.env.COMMUNICATION_CONTENT_VALIDATION === 'true',
    },
  };
}

/**
 * Get provider configuration from environment variables
 */
function getProviderConfig(): CommunicationProviderConfig {
  return {
    email: getEmailProviderConfig(),
    sms: getSMSProviderConfig(),
  };
}

/**
 * Get email provider configuration
 */
function getEmailProviderConfig() {
  const provider = (process.env.EMAIL_PROVIDER || 'nodemailer') as EmailProvider;
  
  const baseConfig = {
    provider,
    fromEmail: process.env.EMAIL_FROM || 'noreply@patientsmanagement.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Patient Management System',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM,
  };

  switch (provider) {
    case 'sendgrid':
      return {
        ...baseConfig,
        apiKey: process.env.SENDGRID_API_KEY,
        apiSecret: process.env.SENDGRID_API_SECRET,
      };

    case 'ses':
      return {
        ...baseConfig,
        apiKey: process.env.AWS_ACCESS_KEY_ID,
        apiSecret: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      };

    case 'mailgun':
      return {
        ...baseConfig,
        apiKey: process.env.MAILGUN_API_KEY,
        apiSecret: process.env.MAILGUN_API_SECRET,
        domain: process.env.MAILGUN_DOMAIN,
      };

    case 'gmail-api':
      return {
        ...baseConfig,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        accessToken: process.env.GMAIL_ACCESS_TOKEN,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        redirectUri: process.env.GMAIL_REDIRECT_URI,
      };

    case 'gmail-smtp':
      return {
        ...baseConfig,
        email: process.env.GMAIL_EMAIL,
        appPassword: process.env.GMAIL_APP_PASSWORD,
      };

    case 'resend':
      return {
        ...baseConfig,
        apiKey: process.env.RESEND_API_KEY,
      };

    case 'nodemailer':
    default:
      return {
        ...baseConfig,
        apiKey: process.env.SMTP_USERNAME,
        apiSecret: process.env.SMTP_PASSWORD,
        // Additional SMTP settings
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        tls: {
          rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
        },
      };
  }
}

/**
 * Get SMS provider configuration
 */
function getSMSProviderConfig() {
  const provider = (process.env.SMS_PROVIDER || 'twilio') as SMSProvider;
  
  const baseConfig = {
    provider,
    fromNumber: process.env.SMS_FROM_NUMBER,
  };

  switch (provider) {
    case 'twilio':
      return {
        ...baseConfig,
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        apiKey: process.env.TWILIO_API_KEY,
        apiSecret: process.env.TWILIO_API_SECRET,
      };

    case 'aws-sns':
      return {
        ...baseConfig,
        apiKey: process.env.AWS_ACCESS_KEY_ID,
        apiSecret: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      };

    case 'messagebird':
      return {
        ...baseConfig,
        apiKey: process.env.MESSAGEBIRD_API_KEY,
      };

    case 'vonage':
      return {
        ...baseConfig,
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
      };

    case 'plivo':
      return {
        ...baseConfig,
        apiKey: process.env.PLIVO_AUTH_ID,
        apiSecret: process.env.PLIVO_AUTH_TOKEN,
      };

    default:
      return {
        ...baseConfig,
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET,
      };
  }
}

/**
 * Validate communication configuration
 */
export function validateCommunicationConfig(config: CommunicationConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate email configuration
  if (!config.providers.email.fromEmail) {
    errors.push('Email from address is required');
  }

  if (!isValidEmail(config.providers.email.fromEmail)) {
    errors.push('Invalid email from address format');
  }

  // Validate email provider specific settings
  switch (config.providers.email.provider) {
    case 'sendgrid':
      if (!config.providers.email.apiKey) {
        errors.push('SendGrid API key is required');
      }
      break;
    case 'ses':
      if (!config.providers.email.apiKey || !config.providers.email.apiSecret) {
        errors.push('AWS SES credentials are required');
      }
      break;
    case 'mailgun':
      if (!config.providers.email.apiKey || !config.providers.email.domain) {
        errors.push('Mailgun API key and domain are required');
      }
      break;
    case 'resend':
      if (!config.providers.email.apiKey) {
        errors.push('Resend API key is required');
      }
      break;
  }

  // Validate SMS configuration
  if (config.providers.sms.fromNumber && !isValidPhoneNumber(config.providers.sms.fromNumber)) {
    errors.push('Invalid SMS from number format');
  }

  // Validate SMS provider specific settings
  switch (config.providers.sms.provider) {
    case 'twilio':
      if (!config.providers.sms.accountSid || !config.providers.sms.authToken) {
        errors.push('Twilio Account SID and Auth Token are required');
      }
      break;
    case 'aws-sns':
      if (!config.providers.sms.apiKey || !config.providers.sms.apiSecret) {
        errors.push('AWS SNS credentials are required');
      }
      break;
    case 'messagebird':
      if (!config.providers.sms.apiKey) {
        errors.push('MessageBird API key is required');
      }
      break;
    case 'vonage':
      if (!config.providers.sms.apiKey || !config.providers.sms.apiSecret) {
        errors.push('Vonage API key and secret are required');
      }
      break;
    case 'plivo':
      if (!config.providers.sms.apiKey || !config.providers.sms.apiSecret) {
        errors.push('Plivo Auth ID and Auth Token are required');
      }
      break;
  }

  // Validate numeric configurations
  if (config.queue.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }

  if (config.queue.retryDelay < 0) {
    errors.push('Retry delay must be non-negative');
  }

  if (config.queue.batchSize <= 0) {
    errors.push('Batch size must be positive');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Simple phone number validation
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Check if it's between 10-15 digits (international standard)
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

/**
 * Get required environment variable
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if communication services are enabled
 */
export function isCommunicationEnabled(): boolean {
  return process.env.COMMUNICATION_ENABLED !== 'false';
}

/**
 * Check if email service is enabled
 */
export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED !== 'false' && isCommunicationEnabled();
}

/**
 * Check if SMS service is enabled
 */
export function isSMSEnabled(): boolean {
  return process.env.SMS_ENABLED !== 'false' && isCommunicationEnabled();
}

/**
 * Get default communication settings for development
 */
export function getDevelopmentConfig(): Partial<CommunicationConfig> {
  return {
    providers: {
      email: {
        provider: 'nodemailer',
        fromEmail: 'dev@patientsmanagement.local',
        fromName: 'Patient Management Dev',
      },
      sms: {
        provider: 'twilio',
        fromNumber: '+1234567890', // Test number
      },
    },
    queue: {
      enabled: false, // Disable queue in development
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      processingInterval: 30000,
    },
    analytics: {
      enabled: false, // Disable analytics in development
      retentionDays: 30,
      aggregationInterval: 3600000,
    },
    rateLimiting: {
      enabled: false, // Disable rate limiting in development
      maxPerMinute: 60,
      maxPerHour: 1000,
      maxPerDay: 10000,
    },
    validation: {
      emailValidation: false, // Relaxed validation in development
      phoneValidation: false,
      contentValidation: false,
    },
  };
}

/**
 * Export the main configuration function
 */
export default getCommunicationConfig;
