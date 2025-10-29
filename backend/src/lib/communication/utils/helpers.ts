/**
 * Communication Helper Functions
 * 
 * Utility functions for communication operations.
 * Stub implementations for now.
 */

import { EmailMessage, SMSMessage, CommunicationChannel } from '../../../types/communication';

/**
 * Validate email message
 */
export function validateEmailMessage(message: EmailMessage): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!message.id) errors.push('Message ID is required');
  if (!message.recipient?.email) errors.push('Recipient email is required');
  if (!message.content?.subject) errors.push('Subject is required');
  if (!message.content?.text && !message.content?.html) errors.push('Content is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate SMS message
 */
export function validateSMSMessage(message: SMSMessage): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!message.id) errors.push('Message ID is required');
  if (!message.recipient?.phone) errors.push('Recipient phone is required');
  if (!message.content?.text) errors.push('Text content is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format phone number for message
 */
export function formatPhoneNumberForMessage(message: SMSMessage): SMSMessage {
  // TODO: Implement phone number formatting
  return message;
}

/**
 * Check if channel is enabled for user
 */
export function isChannelEnabledForUser(_userId: string, _channel: CommunicationChannel): boolean {
  // TODO: Implement user preference check
  return true;
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
 * Get default user preferences
 */
export function getDefaultUserPreferences() {
  return {
    email: { enabled: true, frequency: 'immediate' },
    sms: { enabled: true, frequency: 'immediate' },
    push: { enabled: true, frequency: 'immediate' }
  };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Check if channel is valid
 */
export function isValidChannel(channel: string): boolean {
  return ['email', 'sms', 'push'].includes(channel);
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channel: string): string {
  const names: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    push: 'Push Notification'
  };
  return names[channel] || channel;
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
  const names: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  return names[priority] || priority;
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if message is expired
 */
export function isMessageExpired(message: any, maxAge: number = 24 * 60 * 60 * 1000): boolean {
  if (!message.createdAt) return false;
  const age = Date.now() - new Date(message.createdAt).getTime();
  return age > maxAge;
}

/**
 * Get message age in milliseconds
 */
export function getMessageAge(message: any): number {
  if (!message.createdAt) return 0;
  return Date.now() - new Date(message.createdAt).getTime();
}

/**
 * Check if message is stale
 */
export function isMessageStale(message: any, staleThreshold: number = 60 * 60 * 1000): boolean {
  return getMessageAge(message) > staleThreshold;
}