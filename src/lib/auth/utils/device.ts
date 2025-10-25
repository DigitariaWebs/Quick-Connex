/**
 * Device and User Agent Utilities
 * 
 * Functions for parsing user agents, generating device fingerprints,
 * and device-related security checks.
 */

import { 
  truncate 
} from '@/lib/utils/string-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';
import { DeviceInfo } from '../core/types';

/**
 * Parse user agent string into device info
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const sanitizedUA = sanitizeString(userAgent);
  const ua = sanitizedUA.toLowerCase();
  
  return {
    userAgent: truncate(sanitizedUA, { maxLength: 500, preserveWords: false }),
    platform: ua.includes('windows') ? 'Windows' : 
              ua.includes('mac') ? 'macOS' : 
              ua.includes('linux') ? 'Linux' : 'Unknown',
    browser: ua.includes('chrome') ? 'Chrome' : 
             ua.includes('firefox') ? 'Firefox' : 
             ua.includes('safari') ? 'Safari' : 'Unknown',
    browserVersion: 'Unknown', // Would need more sophisticated parsing
    os: ua.includes('windows') ? 'Windows' : 
        ua.includes('mac') ? 'macOS' : 
        ua.includes('linux') ? 'Linux' : 'Unknown',
    osVersion: 'Unknown', // Would need more sophisticated parsing
    deviceType: ua.includes('mobile') ? 'mobile' : 'desktop',
    screenResolution: 'Unknown', // Would need client-side data
    timezone: 'Unknown', // Would need client-side data
    language: 'Unknown' // Would need client-side data
  };
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(
  userAgent: string, 
  ipAddress: string, 
  screenResolution?: string
): string {
  const components = [
    userAgent,
    ipAddress,
    screenResolution || 'unknown',
    new Date().getTimezoneOffset().toString()
  ];
  
  return components.join('|');
}

/**
 * Format device info for logging
 */
export function formatDeviceInfoForLogging(deviceInfo: DeviceInfo): Record<string, any> {
  return {
    platform: deviceInfo.platform,
    browser: deviceInfo.browser,
    deviceType: deviceInfo.deviceType,
    os: deviceInfo.os
  };
}

/**
 * Check if user agent is suspicious
 */
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /php/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

