/**
 * Core Logging Components
 * 
 * Exports all core logging service components including
 * the main service, types, constants, and configuration.
 */

// Main Service
export { LogService, logService, log } from './LogService';

// Types
export type {
  LogLevel,
  LogCategory,
  LogContext,
  LogEntry,
  LogConfig,
  LogFormatter,
  LogSanitizer,
  PerformanceTracker as PerformanceTrackerInterface,
  LogServiceInterface
} from './types';

// Constants
export {
  LOG_LEVELS,
  LOG_COLORS,
  RESET_COLOR
} from './constants';

// Configuration
export {
  DEFAULT_LOG_CONFIG
} from './config';

