/**
 * Log Formatter Types
 * 
 * Type definitions for log formatting interfaces.
 */

import { LogEntry } from './core.types';

export interface LogFormatter {
  format(entry: LogEntry): string;
}
