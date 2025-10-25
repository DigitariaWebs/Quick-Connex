/**
 * Communication Formatters
 * 
 * Formatting functions for phone numbers, message content, and recipients.
 */

import { CommunicationRecipient, CommunicationContent } from '../core/types';

/**
 * Format phone number for international use
 */
export function formatPhoneNumber(phone: string, countryCode: string = '1'): string {
  // If phone number doesn't start with +, add country code
  if (!phone.startsWith('+')) {
    const digits = phone.replace(/\D/g, '');
    return `+${countryCode}${digits}`;
  }
  return phone;
}

/**
 * Sanitize recipient information
 */
export function sanitizeRecipient(recipient: CommunicationRecipient): CommunicationRecipient {
  return {
    ...recipient,
    email: recipient.email?.toLowerCase().trim(),
    phone: recipient.phone?.replace(/\s/g, ''),
    name: recipient.name?.trim()
  };
}

/**
 * Format message content for display
 */
export function formatMessageContent(content: CommunicationContent): string {
  if (content.html) {
    // Strip HTML tags for plain text display
    return content.html.replace(/<[^>]*>/g, '').trim();
  }
  
  if (content.text) {
    return content.text.trim();
  }
  
  return '';
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Format as +X XXX XXX XXXX for international
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if can't format
  return phone;
}

/**
 * Format email for display
 */
export function formatEmailForDisplay(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Format recipient name for display
 */
export function formatRecipientName(recipient: CommunicationRecipient): string {
  if (recipient.name) {
    return recipient.name.trim();
  }
  
  if (recipient.email) {
    const [localPart] = recipient.email.split('@');
    return localPart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return 'Unknown Recipient';
}

/**
 * Format message ID for display
 */
export function formatMessageId(messageId: string): string {
  // Add hyphens for readability
  return messageId.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format priority for display
 */
export function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent'
  };
  
  return priorityMap[priority.toLowerCase()] || priority;
}

/**
 * Format channel for display
 */
export function formatChannel(channel: string): string {
  const channelMap: Record<string, string> = {
    'email': 'Email',
    'sms': 'SMS',
    'push': 'Push Notification',
    'realtime': 'Real-time'
  };
  
  return channelMap[channel.toLowerCase()] || channel;
}

/**
 * Format status for display
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'sent': 'Sent',
    'delivered': 'Delivered',
    'failed': 'Failed',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status.toLowerCase()] || status;
}
