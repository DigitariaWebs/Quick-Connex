/**
 * String Helpers
 * 
 * Comprehensive string manipulation and formatting utilities.
 * Provides text processing, sanitization, and formatting functions.
 */

// ===== TYPES =====

export interface TruncateOptions {
  maxLength: number;
  suffix?: string;
  preserveWords?: boolean;
}

export interface MaskOptions {
  visibleStart?: number;
  visibleEnd?: number;
  maskChar?: string;
}

// ===== TEXT PROCESSING =====

/**
 * Create URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Truncate text with options
 */
export function truncate(
  text: string,
  options: TruncateOptions
): string {
  const { maxLength, suffix = '...', preserveWords = true } = options;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  if (!preserveWords) {
    return text.substring(0, maxLength - suffix.length) + suffix;
  }
  
  // Find the last space before the limit
  const truncated = text.substring(0, maxLength - suffix.length);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + suffix;
  }
  
  return truncated + suffix;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert to sentence case
 */
export function sentenceCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to camelCase
 */
export function camelCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Convert to PascalCase
 */
export function pascalCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
    .replace(/\s+/g, '');
}

/**
 * Convert to kebab-case
 */
export function kebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert to snake_case
 */
export function snakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// ===== RANDOM STRING GENERATION =====

/**
 * Generate random string
 */
export function generateRandomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate random alphanumeric string
 */
export function generateRandomAlphanumeric(length: number): string {
  return generateRandomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * Generate random numeric string
 */
export function generateRandomNumeric(length: number): string {
  return generateRandomString(length, '0123456789');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===== DATA MASKING =====

/**
 * Mask email address
 */
export function maskEmail(email: string, options: MaskOptions = {}): string {
  const { visibleStart = 1, visibleEnd = 1, maskChar = '*' } = options;
  
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= visibleStart + visibleEnd) {
    return email; // Don't mask if too short
  }
  
  const maskedLocal = localPart.substring(0, visibleStart) + 
    maskChar.repeat(localPart.length - visibleStart - visibleEnd) + 
    localPart.substring(localPart.length - visibleEnd);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string, options: MaskOptions = {}): string {
  const { visibleStart = 3, visibleEnd = 4, maskChar = '*' } = options;
  
  if (!phone || phone.length <= visibleStart + visibleEnd) {
    return phone;
  }
  
  const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
  const masked = cleaned.substring(0, visibleStart) + 
    maskChar.repeat(cleaned.length - visibleStart - visibleEnd) + 
    cleaned.substring(cleaned.length - visibleEnd);
  
  // Restore original format
  return phone.replace(/\d/g, (match, index) => {
    const digitIndex = phone.substring(0, index).replace(/\D/g, '').length;
    return digitIndex < masked.length ? masked[digitIndex] : match;
  });
}

/**
 * Mask credit card number
 */
export function maskCreditCard(number: string, options: MaskOptions = {}): string {
  const { visibleStart = 0, visibleEnd = 4, maskChar = '*' } = options;
  
  if (!number || number.length <= visibleStart + visibleEnd) {
    return number;
  }
  
  const cleaned = number.replace(/\D/g, ''); // Remove non-digits
  const masked = cleaned.substring(0, visibleStart) + 
    maskChar.repeat(cleaned.length - visibleStart - visibleEnd) + 
    cleaned.substring(cleaned.length - visibleEnd);
  
  // Restore original format
  return number.replace(/\d/g, (match, index) => {
    const digitIndex = number.substring(0, index).replace(/\D/g, '').length;
    return digitIndex < masked.length ? masked[digitIndex] : match;
  });
}

/**
 * Mask sensitive data
 */
export function maskSensitiveData(
  text: string,
  options: MaskOptions = {}
): string {
  const { visibleStart = 2, visibleEnd = 2, maskChar = '*' } = options;
  
  if (!text || text.length <= visibleStart + visibleEnd) {
    return text;
  }
  
  return text.substring(0, visibleStart) + 
    maskChar.repeat(text.length - visibleStart - visibleEnd) + 
    text.substring(text.length - visibleEnd);
}

// ===== TEXT CLEANING =====

/**
 * Remove accents/diacritics
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Escape HTML characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (s) => map[s]);
}

/**
 * Unescape HTML characters
 */
export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };
  
  return text.replace(/&(amp|lt|gt|quot|#x27|#x2F);/g, (s) => map[s]);
}

/**
 * Strip HTML tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Remove extra spaces
 */
export function removeExtraSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Remove line breaks
 */
export function removeLineBreaks(text: string): string {
  return text.replace(/[\r\n]+/g, ' ');
}

/**
 * Clean text for display
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim() // Remove leading/trailing spaces
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// ===== TEXT VALIDATION =====

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(text: string): boolean {
  return !text || text.trim().length === 0;
}

/**
 * Check if string is valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is valid phone number
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Check if string is valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string contains only letters
 */
export function isAlpha(text: string): boolean {
  return /^[a-zA-Z]+$/.test(text);
}

/**
 * Check if string contains only numbers
 */
export function isNumeric(text: string): boolean {
  return /^\d+$/.test(text);
}

/**
 * Check if string contains only alphanumeric characters
 */
export function isAlphanumeric(text: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(text);
}

// ===== TEXT FORMATTING =====

/**
 * Format phone number
 */
export function formatPhone(phone: string, format: 'US' | 'International' = 'US'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (format === 'US') {
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
  }
  
  if (format === 'International') {
    if (cleaned.length >= 10) {
      return `+${cleaned}`;
    }
  }
  
  return phone;
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(
  number: number,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale).format(number);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

// ===== TEXT SEARCH =====

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(
  text: string,
  searchTerm: string,
  highlightClass: string = 'highlight'
): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  return text.replace(regex, `<span class="${highlightClass}">$1</span>`);
}

/**
 * Escape regex special characters
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find all occurrences of substring
 */
export function findAllOccurrences(text: string, substring: string): number[] {
  const occurrences: number[] = [];
  let index = text.indexOf(substring);
  
  while (index !== -1) {
    occurrences.push(index);
    index = text.indexOf(substring, index + 1);
  }
  
  return occurrences;
}

// ===== TEXT TRANSFORMATION =====

/**
 * Reverse string
 */
export function reverse(text: string): string {
  return text.split('').reverse().join('');
}

/**
 * Remove duplicates from string
 */
export function removeDuplicates(text: string): string {
  return [...new Set(text.split(''))].join('');
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in text
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Count lines in text
 */
export function countLines(text: string): number {
  return text.split('\n').length;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Pad string to specified length
 */
export function padString(
  text: string,
  length: number,
  padChar: string = ' ',
  direction: 'left' | 'right' | 'both' = 'right'
): string {
  if (text.length >= length) return text;
  
  const padding = padChar.repeat(length - text.length);
  
  switch (direction) {
    case 'left':
      return padding + text;
    case 'right':
      return text + padding;
    case 'both':
      const leftPad = Math.floor((length - text.length) / 2);
      const rightPad = length - text.length - leftPad;
      return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
    default:
      return text + padding;
  }
}

/**
 * Repeat string
 */
export function repeatString(text: string, count: number): string {
  return text.repeat(count);
}

/**
 * Split string into chunks
 */
export function chunkString(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Join array of strings
 */
export function joinStrings(strings: string[], separator: string = ''): string {
  return strings.join(separator);
}

/**
 * Check if string starts with substring
 */
export function startsWith(text: string, substring: string): boolean {
  return text.startsWith(substring);
}

/**
 * Check if string ends with substring
 */
export function endsWith(text: string, substring: string): boolean {
  return text.endsWith(substring);
}

/**
 * Check if string contains substring
 */
export function contains(text: string, substring: string): boolean {
  return text.includes(substring);
}
