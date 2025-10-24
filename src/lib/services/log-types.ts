/**
 * Log Service Types and Configuration
 * 
 * Defines TypeScript interfaces and types for the LogService
 * to ensure type safety and consistent logging patterns.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type LogCategory = 
  | 'auth' 
  | 'database' 
  | 'api' 
  | 'security' 
  | 'performance' 
  | 'system' 
  | 'user' 
  | 'transfer' 
  | 'communication'
  | 'audit'
  | 'general';

export interface LogContext {
  // Request context
  requestId?: string;
  sessionId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  
  // Operation context
  operation?: string;
  endpoint?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Performance context
  duration?: number;
  startTime?: number;
  
  // Additional metadata
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  category?: LogCategory;
  context?: LogContext;
  error?: {
    name?: string;
    message: string;
    code?: string;
    stack?: string;
    statusCode?: number;
  };
  performance?: {
    duration: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata?: Record<string, any>;
}

export interface LogConfig {
  // Environment settings
  environment: 'development' | 'production' | 'test';
  
  // Log level filtering
  minLevel: LogLevel;
  enableConsole: boolean;
  
  // Formatting options
  enableColors: boolean;
  enablePrettyPrint: boolean;
  enableStackTraces: boolean;
  
  // PII sanitization
  enableSanitization: boolean;
  sanitizeFields: string[];
  
  // Performance tracking
  enablePerformanceTracking: boolean;
  slowOperationThreshold: number; // milliseconds
  
  // Context enrichment
  enableAutoContext: boolean;
  enableRequestTracing: boolean;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogSanitizer {
  sanitize(data: any): any;
}

export interface PerformanceTracker {
  start(label: string): void;
  end(label: string): number;
  getMetrics(): Record<string, number>;
}

export interface LogServiceInterface {
  // Core logging methods
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: any, context?: LogContext): void;
  
  // Specialized logging methods
  logAuthEvent(message: string, context?: LogContext): void;
  logDatabaseEvent(message: string, context?: LogContext): void;
  logSecurityEvent(message: string, context?: LogContext): void;
  logPerformanceEvent(message: string, duration: number, context?: LogContext): void;
  
  // Performance tracking
  startTimer(label: string): void;
  endTimer(label: string): number;
  
  // Context management
  setContext(context: LogContext): void;
  getContext(): LogContext;
  clearContext(): void;
  
  // Configuration
  setConfig(config: Partial<LogConfig>): void;
  getConfig(): LogConfig;
}

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

// Log level hierarchy for filtering
export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4
};

// Color codes for console output
export const LOG_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m', // Gray
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

export const RESET_COLOR = '\x1b[0m';
