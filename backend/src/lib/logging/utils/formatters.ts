/**
 * Log Formatters
 * 
 * Functions for formatting log entries for different output methods.
 */

import { LogEntry, LogLevel } from '../../../types/logging';
import { LOG_COLORS, RESET_COLOR } from '../core/constants';

/**
 * Format log entry for pretty console output
 */
export function formatPrettyLog(entry: LogEntry, enableColors: boolean = true): string {
  const color = enableColors ? LOG_COLORS[entry.level] : '';
  const reset = enableColors ? RESET_COLOR : '';
  const emoji = getEmoji(entry.level);
  
  let output = `${color}${emoji} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${reset}`;
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
  }
  
  if (entry.error) {
    output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n  Stack: ${entry.error.stack}`;
    }
  }
  
  if (entry.performance) {
    output += `\n  Performance: ${entry.performance.duration}ms`;
  }
  
  return output;
}

/**
 * Format log entry for JSON output
 */
export function formatJSONLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Get emoji for log level
 */
export function getEmoji(level: LogLevel): string {
  const emojis = {
    trace: '🔍',
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌'
  };
  return emojis[level];
}

/**
 * Output log entry to console with appropriate method
 */
export function outputToConsole(entry: LogEntry): void {
  const output = formatPrettyLog(entry);
  
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

/**
 * Output log entry as JSON to console
 */
export function outputJSONToConsole(entry: LogEntry): void {
  const output = formatJSONLog(entry);
  
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
