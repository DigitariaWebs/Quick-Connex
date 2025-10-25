/**
 * Logging Configuration
 * 
 * Configuration objects and defaults for the logging system.
 */

import { LogConfig } from './types';

// Default configuration
export const DEFAULT_LOG_CONFIG: LogConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableColors: process.env.NODE_ENV !== 'production',
  enablePrettyPrint: process.env.NODE_ENV !== 'production',
  enableStackTraces: process.env.NODE_ENV !== 'production',
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

