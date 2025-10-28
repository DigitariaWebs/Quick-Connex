/**
 * Centralized Log Service
 * 
 * Provides comprehensive logging capabilities with:
 * - Structured logging with context enrichment
 * - PII sanitization for security
 * - Performance tracking and monitoring
 * - Environment-based formatting
 * - Automatic request correlation
 */

import {
  LogLevel,
  LogCategory,
  LogContext,
  LogEntry,
  LogConfig,
  LogServiceInterface
} from '../../../types/logging';
import { DEFAULT_LOG_CONFIG } from './config';
import { LOG_LEVELS } from './constants';
import { 
  sanitizeContext, 
  outputToConsole, 
  outputJSONToConsole 
} from '../utils';

export class LogService implements LogServiceInterface {
  private config: LogConfig;
  private context: LogContext = {};
  private timers: Map<string, number> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_LOG_CONFIG, ...config };
  }

  // ===== CORE LOGGING METHODS =====

  trace(message: string, context?: LogContext): void {
    this.log('trace', message, undefined, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context);
  }

  error(message: string, error?: any, context?: LogContext): void {
    this.log('error', message, error, context);
  }

  // ===== SPECIALIZED LOGGING METHODS =====

  logAuthEvent(message: string, context?: LogContext): void {
    this.log('info', message, undefined, { ...context, category: 'auth' });
  }

  logDatabaseEvent(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, { ...context, category: 'database' });
  }

  logSecurityEvent(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, { ...context, category: 'security' });
  }

  logPerformanceEvent(message: string, duration: number, context?: LogContext): void {
    this.log('info', message, undefined, { 
      ...context, 
      category: 'performance',
      performance: { duration }
    });
  }

  // ===== PERFORMANCE TRACKING =====

  startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      this.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    // Track performance metrics
    if (!this.performanceMetrics.has(label)) {
      this.performanceMetrics.set(label, []);
    }
    this.performanceMetrics.get(label)!.push(duration);

    // Log slow operations
    if (duration > this.config.slowOperationThreshold) {
      this.warn(`Slow operation detected: ${label}`, {
        operation: label,
        duration,
        threshold: this.config.slowOperationThreshold
      });
    }

    return duration;
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.performanceMetrics.forEach((durations, label) => {
      if (durations.length > 0) {
        metrics[`${label}_count`] = durations.length;
        metrics[`${label}_total`] = durations.reduce((a, b) => a + b, 0);
        metrics[`${label}_average`] = durations.reduce((a, b) => a + b, 0) / durations.length;
        metrics[`${label}_min`] = Math.min(...durations);
        metrics[`${label}_max`] = Math.max(...durations);
      }
    });
    return metrics;
  }

  // ===== CONTEXT MANAGEMENT =====

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): LogContext {
    return { ...this.context };
  }

  clearContext(): void {
    this.context = {};
  }

  // ===== CONFIGURATION =====

  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }

  // ===== PRIVATE METHODS =====

  private log(level: LogLevel, message: string, error?: any, context?: LogContext): void {
    // Check if we should log this level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.mergeContext(context),
      ...(error && this.formatError(error))
    };

    // Add performance data if available
    if (this.config.enablePerformanceTracking && context?.duration) {
      entry.performance = { duration: context.duration };
    }

    // Output to console
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  private mergeContext(context?: LogContext): LogContext {
    const merged = { ...this.context };
    if (context) {
      Object.assign(merged, context);
    }
    return sanitizeContext(merged, this.config.sanitizeFields, this.config.enableSanitization);
  }

  private formatError(error: any): Partial<LogEntry> {
    if (!(error instanceof Error)) {
      return {
        error: {
          name: 'UnknownError',
          message: String(error),
          ...(this.config.enableStackTraces ? { stack: new Error().stack } : {})
        }
      };
    }
    
    return {
      error: {
        name: error.name,
        message: error.message,
        ...(this.config.enableStackTraces && error.stack ? { stack: error.stack } : {})
      }
    };
  }

  private outputToConsole(entry: LogEntry): void {
    if (this.config.enablePrettyPrint && this.config.environment === 'development') {
      outputToConsole(entry);
    } else {
      outputJSONToConsole(entry);
    }
  }
}

// ===== SINGLETON INSTANCE =====

// Create and export a singleton instance
export const logService = new LogService();

// Helper function to handle error type conversion
const logError = (message: string, error?: any, context?: LogContext) => {
  logService.error(message, error, context);
};

// Export convenience methods for direct usage
export const log = {
  trace: (message: string, context?: LogContext) => logService.trace(message, context),
  debug: (message: string, context?: LogContext) => logService.debug(message, context),
  info: (message: string, context?: LogContext) => logService.info(message, context),
  warn: (message: string, context?: LogContext) => logService.warn(message, context),
  error: logError,
  
  // Specialized methods
  auth: (message: string, context?: LogContext) => logService.logAuthEvent(message, context),
  database: (message: string, context?: LogContext) => logService.logDatabaseEvent(message, context),
  security: (message: string, context?: LogContext) => logService.logSecurityEvent(message, context),
  performance: (message: string, duration: number, context?: LogContext) => 
    logService.logPerformanceEvent(message, duration, context),
  
  // Performance tracking
  startTimer: (label: string) => logService.startTimer(label),
  endTimer: (label: string) => logService.endTimer(label),
  
  // Context management
  setContext: (context: LogContext) => logService.setContext(context),
  getContext: () => logService.getContext(),
  clearContext: () => logService.clearContext(),
  
  // Configuration
  setConfig: (config: Partial<LogConfig>) => logService.setConfig(config),
  getConfig: () => logService.getConfig()
};

// Export types for external use
export type { LogLevel, LogCategory, LogContext, LogEntry, LogConfig };
