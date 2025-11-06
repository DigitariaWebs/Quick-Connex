/**
 * Log Sanitizer Types
 * 
 * Type definitions for log sanitization interfaces.
 */

export interface LogSanitizer {
  sanitize(data: any): any;
}
