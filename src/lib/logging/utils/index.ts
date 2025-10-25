/**
 * Logging Utilities
 * 
 * Exports all utility functions organized by category.
 */

// Formatters
export {
  formatPrettyLog,
  formatJSONLog,
  getEmoji,
  outputToConsole,
  outputJSONToConsole
} from './formatters';

// Sanitizers
export {
  sanitizeContext,
  sanitizeValue,
  maskEmail,
  maskPhone
} from './sanitizers';

// Performance
export {
  PerformanceTracker,
  createPerformanceTracker
} from './performance';

