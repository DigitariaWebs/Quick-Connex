/**
 * Communication Helper Functions
 * 
 * Validation, formatting, and utility functions for the communication system.
 * Extracted from CommunicationService for better organization and reusability.
 */

import {
  EmailMessage,
  SMSMessage,
  CommunicationChannel,
  UserCommunicationPreferences
} from '../core/types';
import { validateEmail, validatePhoneNumber } from './validation';

/**
 * Validate email message
 */
export function validateEmailMessage(message: EmailMessage): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!message.recipient.email) {
    errors.push('Recipient email is required');
  } else if (!validateEmail(message.recipient.email)) {
    errors.push('Invalid recipient email format');
  }

  if (!message.content.subject) {
    errors.push('Email subject is required');
  }

  if (!message.content.text && !message.content.html) {
    errors.push('Email content (text or html) is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate SMS message
 */
export function validateSMSMessage(message: SMSMessage): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!message.recipient.phone) {
    errors.push('Recipient phone number is required');
  } else if (!validatePhoneNumber(message.recipient.phone)) {
    errors.push('Invalid recipient phone number format');
  }

  if (!message.content.text) {
    errors.push('SMS text content is required');
  } else if (message.content.text.length > 1600) {
    errors.push('SMS text content exceeds maximum length (1600 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format phone number for international use
 */
export function formatPhoneNumberForMessage(message: SMSMessage): SMSMessage {
  const { phone, countryCode } = message.recipient;
  
  if (!phone.startsWith('+')) {
    const defaultCountryCode = countryCode || '1';
    message.recipient.phone = `+${defaultCountryCode}${phone.replace(/\D/g, '')}`;
  }

  return message;
}

/**
 * Check if channel is enabled for user
 */
export function isChannelEnabledForUser(
  preferences: UserCommunicationPreferences,
  channel: CommunicationChannel,
  notificationType: string
): boolean {
  // Handle different channel types
  let channelPrefs;
  if (channel === 'email') {
    channelPrefs = preferences.email;
  } else if (channel === 'sms') {
    channelPrefs = preferences.sms;
  } else if (channel === 'push') {
    channelPrefs = preferences.push;
  } else {
    // For realtime or other channels, default to enabled
    return true;
  }

  if (!channelPrefs || !channelPrefs.enabled) {
    return false;
  }

  return channelPrefs.types.includes(notificationType);
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Check if user has communication preferences configured
 */
export function hasUserPreferences(userId: string): boolean {
  // This would typically check if user has preferences in database
  // For now, return true as default
  return true;
}

/**
 * Get default communication preferences for user
 */
export function getDefaultUserPreferences(): UserCommunicationPreferences {
  return {
    email: {
      enabled: true,
      frequency: 'immediate',
      types: ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'system'],
    },
    sms: {
      enabled: true,
      frequency: 'immediate',
      types: ['urgent_transfer', 'system'],
    },
    push: {
      enabled: true,
      frequency: 'immediate',
      types: ['transfer_status_change', 'new_transfer', 'urgent_transfer'],
    },
  };
}

/**
 * Validate communication channel
 */
export function isValidChannel(channel: string): channel is CommunicationChannel {
  return ['email', 'sms', 'push', 'realtime'].includes(channel);
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channel: CommunicationChannel): string {
  const displayNames = {
    email: 'Email',
    sms: 'SMS',
    push: 'Push Notification',
    realtime: 'Real-time'
  };
  
  return displayNames[channel];
}

/**
 * Check if message is urgent
 */
export function isUrgentMessage(priority: string): boolean {
  return priority === 'urgent';
}

/**
 * Get priority display name
 */
export function getPriorityDisplayName(priority: string): string {
  const displayNames = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  
  return displayNames[priority as keyof typeof displayNames] || 'Medium';
}

// Note: shouldRetryMessage and getRetryDelay are now in rate-limiter.ts

/**
 * Sanitize message content for logging
 */
export function sanitizeMessageForLogging(message: any): any {
  const sanitized = { ...message };
  
  // Remove sensitive data
  if (sanitized.recipient?.email) {
    const email = sanitized.recipient.email;
    const [local, domain] = email.split('@');
    sanitized.recipient.email = `${local.substring(0, 2)}***@${domain}`;
  }
  
  if (sanitized.recipient?.phone) {
    const phone = sanitized.recipient.phone;
    sanitized.recipient.phone = phone.replace(/(\+\d{1,3})\d{3,}(\d{4})/, '$1***$2');
  }
  
  // Truncate long content
  if (sanitized.content?.text && sanitized.content.text.length > 100) {
    sanitized.content.text = sanitized.content.text.substring(0, 100) + '...';
  }
  
  if (sanitized.content?.html && sanitized.content.html.length > 200) {
    sanitized.content.html = sanitized.content.html.substring(0, 200) + '...';
  }
  
  return sanitized;
}

/**
 * Generate message ID
 */
export function generateMessageId(prefix: string = 'msg'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if message is expired
 */
export function isMessageExpired(message: any): boolean {
  if (!message.metadata?.expiresAt) {
    return false;
  }
  
  return new Date() > new Date(message.metadata.expiresAt);
}

/**
 * Get message age in milliseconds
 */
export function getMessageAge(message: any): number {
  return Date.now() - new Date(message.createdAt).getTime();
}

/**
 * Check if message is stale (older than 24 hours)
 */
export function isMessageStale(message: any): boolean {
  const age = getMessageAge(message);
  const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
  return age > staleThreshold;
}
