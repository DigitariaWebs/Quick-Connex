/**
 * Communication Configuration Types
 * 
 * Simplified configuration types for the communication system.
 */

import { CommunicationChannel } from './core.types';
import { CommunicationProviderConfig } from './provider.types';

/**
 * Communication Configuration
 */
export interface CommunicationConfig {
  providers: CommunicationProviderConfig;
  templates: TemplateConfig;
  queue: QueueConfig;
  analytics: AnalyticsConfig;
  rateLimiting: RateLimitingConfig;
  validation: ValidationConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
  auth: AuthConfig;
  audit: AuditConfig;
}

/**
 * Template Configuration
 */
export interface TemplateConfig {
  cache: {
    enabled: boolean;
    ttl: number; // in seconds
    maxSize: number;
  };
}

/**
 * Queue Configuration
 */
export interface QueueConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  batchSize: number;
  processingInterval: number; // in milliseconds
}

/**
 * Analytics Configuration
 */
export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  aggregationInterval: number; // in minutes
  realtime: boolean;
}

/**
 * Rate Limiting Configuration
 */
export interface RateLimitingConfig {
  enabled: boolean;
  perMinute: number;
  perHour: number;
  perDay: number;
  perUser: number;
  burst: number;
  window: number; // in seconds
  strategy: 'sliding_window' | 'fixed_window' | 'token_bucket';
}

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  email: boolean;
  phone: boolean;
  content: boolean;
  template: boolean;
  strict: boolean;
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  healthCheckInterval: number; // in seconds
  metricsInterval: number; // in seconds
  alerting: {
    enabled: boolean;
    errorRate: number;
    responseTime: number;
    queueSize: number;
    channels: CommunicationChannel[];
  };
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotation: boolean;
  };
  sanitization: {
    enabled: boolean;
    removeScripts: boolean;
    removeStyles: boolean;
    allowedTags: string[];
  };
}

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  structured: boolean;
  sensitive: boolean;
}

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  required: boolean;
  timeout: number; // in milliseconds
  retry: number;
}

/**
 * Audit Configuration
 */
export interface AuditConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'detailed';
  retention: number; // in days
}

/**
 * Configuration Validation Result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Date;
}

/**
 * Configuration Validation Error
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * Configuration Validation Warning
 */
export interface ConfigValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}
