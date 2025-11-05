/**
 * Privacy Utilities for Authentication
 * 
 * Handles privacy-focused operations for user data including
 * IP hashing and data retention.
 */

import crypto from 'crypto';

/**
 * Hash IP address for privacy protection
 * Uses SHA-256 with a salt to prevent rainbow table attacks
 */
export function hashIpAddress(ipAddress: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-in-production';
  const hash = crypto
    .createHash('sha256')
    .update(ipAddress + salt)
    .digest('hex');
  return hash.substring(0, 16);
}

/**
 * Truncate IP address for privacy (alternative to hashing)
 * Removes last octet of IPv4 addresses
 */
export function truncateIpAddress(ipAddress: string): string {
  // Handle IPv4 addresses
  if (ipAddress.includes('.') && !ipAddress.includes(':')) {
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  
  // Handle IPv6 addresses
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    if (parts.length > 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:xxxx`;
    }
  }
  
  return 'xxx.xxx.xxx.xxx';
}

