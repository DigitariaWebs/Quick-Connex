/**
 * Communication Logger Utilities
 * 
 * Simple utilities for communication module logging.
 * Follows the auth module pattern - use log.info/warn/error directly.
 * 
 * ## Standardized Logging Pattern
 * 
 * All communication logs should use the `createCommunicationContext()` helper
 * to ensure consistent structure and PII sanitization:
 * 
 * The `sanitizeRecipient()` and `sanitizeMessageForLogging()` functions
 * automatically mask sensitive information like email addresses and phone numbers.
 */

import { LogContext } from '../../../types/logging';

/**
 * Sanitize recipient data for logging (remove PII)
 */
export function sanitizeRecipient(recipient: any): any {
  const sanitized: any = {
    userType: recipient.userType
  };

  // Mask email
  if (recipient.email) {
    sanitized.email = maskEmail(recipient.email);
  }

  // Mask phone
  if (recipient.phone) {
    sanitized.phone = maskPhone(recipient.phone);
  }

  // Include name if present (not PII in this context)
  if (recipient.name) {
    sanitized.name = recipient.name;
  }

  return sanitized;
}

/**
 * Sanitize message content for logging
 */
export function sanitizeMessageForLogging(message: any): any {
  return {
    id: message.id,
    channel: message.channel,
    priority: message.priority,
    status: message.status,
    recipient: sanitizeRecipient(message.recipient),
    hasAttachments: message.content?.attachments?.length > 0,
    textLength: message.content?.text?.length || 0,
    subject: message.content?.subject || undefined
  };
}

/**
 * Create consistent communication log context
 */
export function createCommunicationContext(
  operation: string, 
  data: Record<string, any> = {}
): LogContext {
  return {
    category: 'communication',
    operation,
    ...data
  } as LogContext;
}

/**
 * Mask email address for logging
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || local.length <= 2) {
    return `***@${domain}`;
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Mask phone number for logging
 */
function maskPhone(phone: string): string {
  // Keep country code and last 4 digits
  return phone.replace(/(\+\d{1,3})\d{3,}(\d{4})/, '$1***$2');
}