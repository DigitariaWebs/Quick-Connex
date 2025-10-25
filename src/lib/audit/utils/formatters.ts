/**
 * Formatter Utilities
 * 
 * Functions for formatting data for audit logging.
 */

import { getCurrentTimestamp } from '@/lib/utils/date-time';

/**
 * Format changes for audit logging
 */
export function formatChangesForAudit(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  sensitiveFields: string[] = []
): Record<string, any> {
  const changes: Record<string, any> = {};
  
  // Compare fields and track changes
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    if (oldValue !== newValue) {
      if (sensitiveFields.includes(key)) {
        changes[key] = {
          old: '[REDACTED]',
          new: '[REDACTED]'
        };
      } else {
        changes[key] = {
          old: oldValue,
          new: newValue
        };
      }
    }
  }
  
  return changes;
}

/**
 * Sanitize audit data
 */
export function sanitizeAuditData(data: Record<string, any>): Record<string, any> {
  const sanitized = { ...data };
  
  // Remove or mask sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'email'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Format error for audit logging
 */
export function formatErrorForAudit(error: any): {
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return {
    message: 'Unknown error',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Format audit timestamp
 */
export function formatAuditTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Generate audit description
 */
export function generateAuditDescription(
  action: string,
  actorName: string,
  targetName?: string,
  details?: string
): string {
  let description = `${actorName} performed ${action}`;
  
  if (targetName) {
    description += ` on ${targetName}`;
  }
  
  if (details) {
    description += `: ${details}`;
  }
  
  return description;
}

