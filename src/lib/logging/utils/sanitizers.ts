/**
 * Log Sanitizers
 * 
 * Functions for sanitizing PII and sensitive data in log entries.
 */

import { LogContext } from '../core/types';

/**
 * Sanitize context by masking PII fields
 */
export function sanitizeContext(
  context: LogContext, 
  sanitizeFields: string[], 
  enableSanitization: boolean = true
): LogContext {
  if (!enableSanitization) {
    return context;
  }

  const sanitized = { ...context };

  // Sanitize PII fields
  for (const field of sanitizeFields) {
    if (sanitized[field]) {
      sanitized[field] = sanitizeValue(sanitized[field]);
    }
  }

  // Sanitize email specifically
  if (sanitized.userEmail) {
    sanitized.userEmail = maskEmail(sanitized.userEmail);
  }

  // Sanitize phone numbers
  if (sanitized.phone) {
    sanitized.phone = maskPhone(sanitized.phone);
  }

  return sanitized;
}

/**
 * Sanitize a value by masking it
 */
export function sanitizeValue(value: any): string {
  if (typeof value === 'string') {
    if (value.length <= 4) return '***';
    return value.substring(0, 2) + '***' + value.substring(value.length - 2);
  }
  return '***';
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return '***@' + domain;
  return local.substring(0, 2) + '***@' + domain;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return '***';
  return '***-***-' + cleaned.substring(cleaned.length - 4);
}

