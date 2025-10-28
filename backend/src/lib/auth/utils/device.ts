/**
 * Device and User Agent Utilities
 * 
 * Functions for parsing user agents, generating device fingerprints,
 * and device-related security checks.
 */

import { createHash } from 'crypto';
import { DeviceInfo } from '../../../types/auth';
import { log } from '../../logging';

/**
 * Parse user agent string into device info
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const sanitizedUA = sanitizeUserAgent(userAgent);
  const ua = sanitizedUA.toLowerCase();
  
  return {
    userAgent: truncateString(sanitizedUA, 500),
    platform: detectPlatform(ua),
    browser: detectBrowser(ua),
    browserVersion: detectBrowserVersion(ua),
    os: detectOS(ua),
    osVersion: detectOSVersion(ua),
    deviceType: detectDeviceType(ua),
    screenResolution: 'Unknown', // Client-side only
    timezone: 'Unknown', // Client-side only
    language: 'Unknown' // Client-side only
  };
}

/**
 * Detect platform from user agent
 */
function detectPlatform(ua: string): string {
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Unknown';
}

/**
 * Detect browser from user agent
 */
function detectBrowser(ua: string): string {
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
  return 'Unknown';
}

/**
 * Detect browser version from user agent
 */
function detectBrowserVersion(ua: string): string {
  const patterns = [
    /chrome\/(\d+\.\d+)/i,
    /firefox\/(\d+\.\d+)/i,
    /safari\/(\d+\.\d+)/i,
    /edge?\/(\d+\.\d+)/i,
    /opr\/(\d+\.\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = ua.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return 'Unknown';
}

/**
 * Detect OS from user agent
 */
function detectOS(ua: string): string {
  if (ua.includes('windows nt 10.0')) return 'Windows 10/11';
  if (ua.includes('windows nt 6.3')) return 'Windows 8.1';
  if (ua.includes('windows nt 6.2')) return 'Windows 8';
  if (ua.includes('windows nt 6.1')) return 'Windows 7';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os x')) return 'macOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Unknown';
}

/**
 * Detect OS version from user agent
 */
function detectOSVersion(ua: string): string {
  const patterns = [
    /windows nt ([\d.]+)/i,
    /mac os x ([\d_]+)/i,
    /android ([\d.]+)/i,
    /iphone os ([\d_]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = ua.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/_/g, '.');
    }
  }
  
  return 'Unknown';
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
}

/**
 * Generate device fingerprint (hashed)
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
  
  const fingerprintData = components.join('|');
  
  // Hash the fingerprint for privacy and consistency
  return createHash('sha256')
    .update(fingerprintData)
    .digest('hex');
}

/**
 * Format device info for logging
 */
export function formatDeviceInfoForLogging(deviceInfo: DeviceInfo): Record<string, any> {
  return {
    platform: deviceInfo.platform,
    browser: deviceInfo.browser,
    browserVersion: deviceInfo.browserVersion,
    deviceType: deviceInfo.deviceType,
    os: deviceInfo.os,
    osVersion: deviceInfo.osVersion
  };
}

/**
 * Check if user agent is suspicious
 */
export function isSuspiciousUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 10) {
    return true;
  }
  
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /java/i,
    /php/i,
    /perl/i,
    /ruby/i,
    /go-http-client/i,
    /libwww/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.includes('mobile') || 
         ua.includes('android') || 
         ua.includes('iphone');
}

/**
 * Check if device is tablet
 */
export function isTabletDevice(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.includes('tablet') || ua.includes('ipad');
}

/**
 * Sanitize user agent string
 */
function sanitizeUserAgent(userAgent: string): string {
  if (!userAgent) {
    return 'Unknown';
  }
  
  // Remove any control characters and trim
  return userAgent
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Truncate string to max length
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Compare device fingerprints
 */
export function compareDeviceFingerprints(
  fingerprint1: string,
  fingerprint2: string
): boolean {
  return fingerprint1 === fingerprint2;
}

/**
 * Extract device info summary
 */
export function getDeviceInfoSummary(deviceInfo: DeviceInfo): string {
  return `${deviceInfo.browser} on ${deviceInfo.os} (${deviceInfo.deviceType})`;
}

/**
 * Validate device info
 */
export function validateDeviceInfo(deviceInfo: Partial<DeviceInfo>): boolean {
  if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 10) {
    log.warn('Invalid device info: user agent too short or missing');
    return false;
  }
  
  if (!deviceInfo.platform || deviceInfo.platform === 'Unknown') {
    log.warn('Invalid device info: platform unknown');
    return false;
  }
  
  if (!deviceInfo.deviceType) {
    log.warn('Invalid device info: device type missing');
    return false;
  }
  
  return true;
}

/**
 * Check if user agent is likely a real browser
 */
export function isLikelyRealBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  
  // Real browsers typically have these characteristics
  const hasRenderer = ua.includes('webkit') || 
                     ua.includes('gecko') || 
                     ua.includes('trident');
  
  const hasKnownBrowser = ua.includes('chrome') || 
                          ua.includes('firefox') || 
                          ua.includes('safari') ||
                          ua.includes('edge');
  
  const notBot = !isSuspiciousUserAgent(userAgent);
  
  return hasRenderer && hasKnownBrowser && notBot;
}

/**
 * Get browser family
 */
export function getBrowserFamily(browser: string): string {
  const chromiumBased = ['Chrome', 'Edge', 'Opera', 'Brave'];
  const geckoBased = ['Firefox'];
  const webkitBased = ['Safari'];
  
  if (chromiumBased.includes(browser)) return 'Chromium';
  if (geckoBased.includes(browser)) return 'Gecko';
  if (webkitBased.includes(browser)) return 'WebKit';
  return 'Unknown';
}
