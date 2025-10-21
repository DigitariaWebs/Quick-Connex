/**
 * Data Privacy and Security Utilities
 * 
 * Handles secure storage and processing of sensitive user data
 */

import crypto from 'crypto';

/**
 * Hash IP address for privacy protection
 * Uses SHA-256 with a salt to prevent rainbow table attacks
 */
export function hashIpAddress(ipAddress: string): string {
  // Create a consistent salt based on environment
  const salt = process.env.IP_HASH_SALT || 'default-salt-change-in-production';
  
  // Hash the IP address with salt
  const hash = crypto
    .createHash('sha256')
    .update(ipAddress + salt)
    .digest('hex');
  
  // Return first 16 characters for consistent length
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
  
  // Handle IPv6 addresses - truncate to first 3 groups
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    if (parts.length > 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:xxxx`;
    }
  }
  
  // Fallback for localhost or unknown formats
  return 'xxx.xxx.xxx.xxx';
}

/**
 * Check if login history entry is older than retention period
 */
export function isLoginHistoryExpired(timestamp: Date, retentionDays: number = 90): boolean {
  const now = new Date();
  const retentionDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
  return timestamp < retentionDate;
}

/**
 * Clean expired login history entries
 */
export function cleanExpiredLoginHistory(loginHistory: any[], retentionDays: number = 90): any[] {
  const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
  
  return loginHistory.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= cutoffDate;
  });
}

/**
 * Sanitize user agent for minimal storage
 * Only keep essential information, remove detailed fingerprinting data
 */
export function sanitizeUserAgent(userAgent: string): string {
  // Extract only browser and OS, remove version numbers and detailed info
  const browser = extractBrowser(userAgent);
  const os = extractOS(userAgent);
  
  return `${browser} on ${os}`;
}

function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function extractOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

/**
 * Generate audit log entry for admin access to sensitive data
 */
export function createAuditLogEntry(
  adminId: string,
  action: string,
  targetUserId: string,
  details: Record<string, any> = {}
): {
  timestamp: Date;
  adminId: string;
  action: string;
  targetUserId: string;
  details: Record<string, any>;
  ipAddress: string;
} {
  return {
    timestamp: new Date(),
    adminId,
    action,
    targetUserId,
    details,
    ipAddress: 'system' // Will be replaced with actual IP in the calling function
  };
}
