/**
 * Privacy Utilities for Authentication
 * 
 * Handles privacy-focused operations for user data including
 * IP hashing, login history management, and data retention.
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

/**
 * Check if login history entry is older than retention period
 */
export function isLoginHistoryExpired(
  timestamp: Date, 
  retentionDays: number = 90
): boolean {
  const now = new Date();
  const retentionDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
  return timestamp < retentionDate;
}

/**
 * Clean expired login history entries
 */
export function cleanExpiredLoginHistory(
  loginHistory: any[], 
  retentionDays: number = 90
): any[] {
  const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
  
  return loginHistory.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= cutoffDate;
  });
}

