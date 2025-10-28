/**
 * Logging Constants
 * 
 * Constants for log levels, colors, and configuration defaults.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

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
