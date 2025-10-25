/**
 * Communication Validation Utilities
 * 
 * Validation functions for email, phone, and message content.
 */

import { CommunicationRecipient, CommunicationConfig } from '../core/types';

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Check if it's between 10-15 digits (international standard)
  const digits = cleaned.replace(/\+/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Note: validateCommunicationConfig is now in core/config.ts

/**
 * Validate message content
 */
export function validateMessageContent(content: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!content) {
    errors.push('Message content is required');
    return { isValid: false, errors };
  }

  if (content.text && typeof content.text !== 'string') {
    errors.push('Text content must be a string');
  }

  if (content.html && typeof content.html !== 'string') {
    errors.push('HTML content must be a string');
  }

  if (!content.text && !content.html) {
    errors.push('Message must have either text or HTML content');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate recipient information
 */
export function validateRecipient(recipient: CommunicationRecipient): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!recipient.id) {
    errors.push('Recipient ID is required');
  }

  if (!recipient.email && !recipient.phone) {
    errors.push('Recipient must have either email or phone');
  }

  if (recipient.email && !validateEmail(recipient.email)) {
    errors.push('Invalid email format');
  }

  if (recipient.phone && !validatePhoneNumber(recipient.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
