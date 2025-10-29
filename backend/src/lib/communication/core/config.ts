/**
 * Communication Configuration
 * 
 * Simplified configuration for Nodemailer, SendGrid, and Twilio providers.
 */

import { CommunicationConfig, EmailProviderConfig, SMSProviderConfig } from '../../../types/communication';
import { EMAIL_PROVIDERS } from './constants';

/**
 * Get communication configuration
 */
export function getCommunicationConfig(): CommunicationConfig {
  return {
    providers: {
      email: getEmailProviderConfig(),
      sms: getSMSProviderConfig()
    },
    templates: {
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: 1000
      }
    },
    queue: {
      enabled: false, // Simplified - no queue for now
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 10,
      processingInterval: 10000
    },
    analytics: {
      enabled: false, // Simplified - no analytics for now
      retentionDays: 90,
      aggregationInterval: 60,
      realtime: false
    },
    rateLimiting: {
      enabled: false, // Providers handle their own rate limiting
      perMinute: 60,
      perHour: 1000,
      perDay: 10000,
      perUser: 100,
      burst: 100,
      window: 60,
      strategy: 'sliding_window'
    },
    validation: {
      email: true,
      phone: true,
      content: true,
      template: true,
      strict: false
    },
    monitoring: {
      enabled: false, // Simplified - no monitoring for now
      healthCheckInterval: 60,
      metricsInterval: 60,
      alerting: {
        enabled: false,
        errorRate: 0.05,
        responseTime: 5000,
        queueSize: 1000,
        channels: ['email']
      }
    },
    logging: {
      level: 'info',
      structured: true,
      sensitive: false
    },
    security: {
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm',
        keyRotation: false
      },
      sanitization: {
        enabled: true,
        removeScripts: true,
        removeStyles: true,
        allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
      }
    },
    auth: {
      required: false,
      timeout: 30000,
      retry: 3
    },
    audit: {
      enabled: false, // Simplified - no audit for now
      level: 'standard',
      retention: 90
    }
  };
}

/**
 * Get email provider configuration
 */
function getEmailProviderConfig(): EmailProviderConfig {
  const provider = (process.env['EMAIL_PROVIDER'] || 'nodemailer') as 'nodemailer' | 'sendgrid';
  
  const baseConfig = {
    provider,
    fromEmail: process.env['EMAIL_FROM'] || 'noreply@hospital.com',
    fromName: process.env['EMAIL_FROM_NAME'] || 'Patient Management System',
    ...(process.env['EMAIL_REPLY_TO'] && { replyTo: process.env['EMAIL_REPLY_TO'] })
  };

  switch (provider) {
    case EMAIL_PROVIDERS.SENDGRID:
      return {
        ...baseConfig,
        apiKey: process.env['SENDGRID_API_KEY'] || '',
        apiSecret: process.env['SENDGRID_API_SECRET'] || ''
      };

    case EMAIL_PROVIDERS.NODEMAILER:
    default:
      return {
        ...baseConfig,
        host: process.env['SMTP_HOST'] || 'localhost',
        port: parseInt(process.env['SMTP_PORT'] || '587'),
        secure: process.env['SMTP_SECURE'] === 'true',
        apiKey: process.env['SMTP_USERNAME'] || '',
        apiSecret: process.env['SMTP_PASSWORD'] || '',
        tls: {
          rejectUnauthorized: process.env['SMTP_TLS_REJECT_UNAUTHORIZED'] !== 'false'
        }
      };
  }
}

/**
 * Get SMS provider configuration
 */
function getSMSProviderConfig(): SMSProviderConfig {
  const provider = 'twilio' as const;
  
  return {
    provider,
    accountSid: process.env['TWILIO_ACCOUNT_SID'] || '',
    authToken: process.env['TWILIO_AUTH_TOKEN'] || '',
    fromNumber: process.env['SMS_FROM_NUMBER'] || ''
  };
}

/**
 * Validate communication configuration
 */
export function validateCommunicationConfig(config: CommunicationConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate email configuration
  if (!config.providers.email.fromEmail) {
    errors.push('Email from address is required');
  }

  if (config.providers.email.fromEmail && !isValidEmail(config.providers.email.fromEmail)) {
    errors.push('Invalid email from address format');
  }

  // Validate email provider specific settings
  switch (config.providers.email.provider) {
    case EMAIL_PROVIDERS.SENDGRID:
      if (!config.providers.email.apiKey) {
        errors.push('SendGrid API key is required');
      }
      break;
    case EMAIL_PROVIDERS.NODEMAILER:
      if (!config.providers.email.apiKey || !config.providers.email.apiSecret) {
        errors.push('SMTP username and password are required');
      }
      break;
  }

  // Validate SMS configuration
  if (config.providers.sms.fromNumber && !isValidPhoneNumber(config.providers.sms.fromNumber)) {
    errors.push('Invalid SMS from number format');
  }

  // Validate SMS provider specific settings
  if (!config.providers.sms.accountSid || !config.providers.sms.authToken) {
    errors.push('Twilio Account SID and Auth Token are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get environment variable
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
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
 * Check if communication is enabled
 */
export function isCommunicationEnabled(): boolean {
  return process.env['COMMUNICATION_ENABLED'] !== 'false';
}

/**
 * Check if email is enabled
 */
export function isEmailEnabled(): boolean {
  return process.env['EMAIL_ENABLED'] !== 'false';
}

/**
 * Check if SMS is enabled
 */
export function isSMSEnabled(): boolean {
  return process.env['SMS_ENABLED'] !== 'false';
}

/**
 * Get development configuration
 */
export function getDevelopmentConfig(): CommunicationConfig {
  const config = getCommunicationConfig();
  
  // Override for development
  config.providers.email.fromEmail = 'dev@localhost';
  config.providers.email.fromName = 'Dev System';
  config.providers.sms.fromNumber = '+1234567890';
  
  return config;
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}