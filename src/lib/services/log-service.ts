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
  LogServiceInterface,
  DEFAULT_LOG_CONFIG,
  LOG_LEVELS,
  LOG_COLORS,
  RESET_COLOR
} from './log-types';

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
    for (const [label, durations] of this.performanceMetrics.entries()) {
      if (durations.length > 0) {
        metrics[`${label}_count`] = durations.length;
        metrics[`${label}_total`] = durations.reduce((a, b) => a + b, 0);
        metrics[`${label}_average`] = durations.reduce((a, b) => a + b, 0) / durations.length;
        metrics[`${label}_min`] = Math.min(...durations);
        metrics[`${label}_max`] = Math.max(...durations);
      }
    }
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
    return this.sanitizeContext(merged);
  }

  private formatError(error: any): Partial<LogEntry> {
    if (!(error instanceof Error)) {
      return {
        error: {
          name: 'UnknownError',
          message: String(error),
          stack: this.config.enableStackTraces ? new Error().stack : undefined
        }
      };
    }
    
    return {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.enableStackTraces ? error.stack : undefined
      }
    };
  }

  private sanitizeContext(context: LogContext): LogContext {
    if (!this.config.enableSanitization) {
      return context;
    }

    const sanitized = { ...context };

    // Sanitize PII fields
    for (const field of this.config.sanitizeFields) {
      if (sanitized[field]) {
        sanitized[field] = this.sanitizeValue(sanitized[field]);
      }
    }

    // Sanitize email specifically
    if (sanitized.userEmail) {
      sanitized.userEmail = this.maskEmail(sanitized.userEmail);
    }

    // Sanitize phone numbers
    if (sanitized.phone) {
      sanitized.phone = this.maskPhone(sanitized.phone);
    }

    return sanitized;
  }

  private sanitizeValue(value: any): string {
    if (typeof value === 'string') {
      if (value.length <= 4) return '***';
      return value.substring(0, 2) + '***' + value.substring(value.length - 2);
    }
    return '***';
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return '***@' + domain;
    return local.substring(0, 2) + '***@' + domain;
  }

  private maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return '***';
    return '***-***-' + cleaned.substring(cleaned.length - 4);
  }

  private outputToConsole(entry: LogEntry): void {
    if (this.config.enablePrettyPrint && this.config.environment === 'development') {
      this.outputPretty(entry);
    } else {
      this.outputJSON(entry);
    }
  }

  private outputPretty(entry: LogEntry): void {
    const color = this.config.enableColors ? LOG_COLORS[entry.level] : '';
    const reset = this.config.enableColors ? RESET_COLOR : '';
    const emoji = this.getEmoji(entry.level);
    
    let output = `${color}${emoji} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${reset}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.config.enableStackTraces) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    if (entry.performance) {
      output += `\n  Performance: ${entry.performance.duration}ms`;
    }

    // Use appropriate console method
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private outputJSON(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private getEmoji(level: LogLevel): string {
    const emojis = {
      trace: '🔍',
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    return emojis[level];
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
