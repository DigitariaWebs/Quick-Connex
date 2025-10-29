/**
 * Communication Formatters
 * 
 * Formatting utilities for messages, content, and data.
 */

/**
 * Format phone number to international format
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Add default country code (US)
  const code = countryCode || '1';
  return `+${code}${cleaned}`;
}

/**
 * Format email address
 */
export function formatEmailAddress(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(html: string, options?: {
  removeScripts?: boolean;
  removeStyles?: boolean;
  allowedTags?: string[];
}): string {
  const {
    removeScripts = true,
    removeStyles = true,
    allowedTags: _allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span']
  } = options || {};
  
  let sanitized = html;
  
  // Remove script tags
  if (removeScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  // Remove style tags
  if (removeStyles) {
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    sanitized = sanitized.replace(/style="[^"]*"/gi, '');
  }
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  
  return sanitized;
}

/**
 * Convert HTML to plain text
 */
export function htmlToText(html: string): string {
  let text = html;
  
  // Replace <br> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Replace closing block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li)>/gi, '\n');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = decodeHTMLEntities(text);
  
  // Remove extra whitespace
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Decode HTML entities
 */
export function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format message preview
 */
export function formatMessagePreview(content: string, maxLength: number = 100): string {
  // Remove HTML if present
  const text = content.includes('<') ? htmlToText(content) : content;
  
  // Truncate
  return truncateText(text, maxLength);
}

/**
 * Format date for email
 */
export function formatDateForEmail(date: Date, locale: string = 'en-US'): string {
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format SMS segments
 */
export function formatSMSSegments(text: string): {
  segments: number;
  charactersPerSegment: number;
  totalCharacters: number;
  remaining: number;
} {
  const totalCharacters = text.length;
  
  // Check if message contains unicode characters
  const hasUnicode = /[^\u0000-\u007F]/.test(text);
  const charactersPerSegment = hasUnicode ? 70 : 160;
  
  const segments = Math.ceil(totalCharacters / charactersPerSegment);
  const remaining = (segments * charactersPerSegment) - totalCharacters;
  
  return {
    segments,
    charactersPerSegment,
    totalCharacters,
    remaining
  };
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Format recipient name
 */
export function formatRecipientName(name?: string, email?: string): string {
  if (name) {
    return name;
  }
  
  if (email) {
    // Extract name from email
    const localPart = email.split('@')[0];
    return localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  return 'Recipient';
}

/**
 * Format message status
 */
export function formatMessageStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
    bounced: 'Bounced',
    blocked: 'Blocked'
  };
  
  return statusMap[status.toLowerCase()] || status;
}

