/**
 * Communication Validation Utilities
 * 
 * Simple validation functions for email and phone numbers.
 */

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic international format)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + and has 10-15 digits
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(1);
    return digits.length >= 10 && digits.length <= 15;
  }
  
  // Check if it has 10-15 digits without country code
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Format phone number to international format
 */
export function formatPhoneNumber(phone: string, countryCode: string = '1'): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Add default country code
  return `+${countryCode}${cleaned}`;
}
