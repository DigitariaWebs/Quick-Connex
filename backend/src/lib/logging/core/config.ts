/**
 * Logging Configuration Management
 * 
 * Environment-based configuration for logging system,
 * similar to database configuration pattern.
 */

import { LogConfig } from '../../../types/logging';

/**
 * Get logging configuration from environment variables
 */
export function getLoggingConfig(): LogConfig {
  const config: LogConfig = {
    environment: (process.env['NODE_ENV'] as any) || 'development',
    minLevel: process.env['LOG_LEVEL'] as any || (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug'),
    enableConsole: process.env['LOG_ENABLE_CONSOLE'] !== 'false',
    enableColors: process.env['LOG_ENABLE_COLORS'] !== 'false' && process.env['NODE_ENV'] !== 'production',
    enablePrettyPrint: process.env['LOG_ENABLE_PRETTY_PRINT'] !== 'false' && process.env['NODE_ENV'] !== 'production',
    enableStackTraces: process.env['LOG_ENABLE_STACK_TRACES'] !== 'false' && process.env['NODE_ENV'] !== 'production',
    enableSanitization: process.env['LOG_ENABLE_SANITIZATION'] !== 'false',
    sanitizeFields: process.env['LOG_SANITIZE_FIELDS']?.split(',') || [
      'password',
      'token',
      'secret',
      'key',
      'email',
      'phone',
      'ssn',
      'creditCard',
      'bankAccount'
    ],
    enablePerformanceTracking: process.env['LOG_ENABLE_PERFORMANCE_TRACKING'] !== 'false',
    slowOperationThreshold: parseInt(process.env['LOG_SLOW_OPERATION_THRESHOLD'] || '1000'),
    enableAutoContext: process.env['LOG_ENABLE_AUTO_CONTEXT'] !== 'false',
    enableRequestTracing: process.env['LOG_ENABLE_REQUEST_TRACING'] !== 'false'
  };

  return config;
}

/**
 * Default logging configuration
 */
export const DEFAULT_LOG_CONFIG: LogConfig = {
  environment: (process.env['NODE_ENV'] as any) || 'development',
  minLevel: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableColors: process.env['NODE_ENV'] !== 'production',
  enablePrettyPrint: process.env['NODE_ENV'] !== 'production',
  enableStackTraces: process.env['NODE_ENV'] !== 'production',
  enableSanitization: true,
  sanitizeFields: [
    'password',
    'token',
    'secret',
    'key',
    'email',
    'phone',
    'ssn',
    'creditCard',
    'bankAccount'
  ],
  enablePerformanceTracking: true,
  slowOperationThreshold: 1000,
  enableAutoContext: true,
  enableRequestTracing: true
};

/**
 * Validate logging configuration
 */
export function validateLoggingConfig(config: LogConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!['development', 'production', 'test'].includes(config.environment)) {
    errors.push('Environment must be development, production, or test');
  }

  if (!['trace', 'debug', 'info', 'warn', 'error'].includes(config.minLevel)) {
    errors.push('minLevel must be trace, debug, info, warn, or error');
  }

  if (config.slowOperationThreshold < 0) {
    errors.push('slowOperationThreshold must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
