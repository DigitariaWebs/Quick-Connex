/**
 * Authentication Utilities
 * 
 * Utility functions for authentication service including device parsing,
 * security checks, and risk assessment.
 */

import { NextRequest } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Session from '@/models/Session';
import { AUTH_CONFIG } from './auth-config';
import { 
  DeviceInfo,
  SecurityCheck,
  RiskAssessment
} from './auth-types';
import { RiskLevel } from '@/models/AuditLog';
import { 
  truncate 
} from '@/lib/utils/string-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';
import { 
  addHoursToDate 
} from '@/lib/utils/date-time';

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
 * Assess security risk
 */
export function assessSecurityRisk(
  isNewDevice: boolean,
  isNewLocation: boolean,
  suspiciousFlags: string[],
  userType: string
): RiskAssessment {
  let score = 0;
  
  if (isNewDevice) score += 20;
  if (isNewLocation) score += 15;
  score += suspiciousFlags.length * 10;
  
  if (userType === 'admin' || userType === 'super_admin') {
    score += 10;
  }
  
  const riskLevel = score >= 70 ? RiskLevel.HIGH : score >= 40 ? RiskLevel.MEDIUM : RiskLevel.LOW;
  
  return {
    riskScore: Math.min(score, 100),
    riskLevel: riskLevel,
    flags: suspiciousFlags,
    recommendations: riskLevel === RiskLevel.HIGH ? ['Enable 2FA', 'Review login history'] : 
                     riskLevel === RiskLevel.MEDIUM ? ['Monitor account activity'] : []
  };
}

/**
 * Check for suspicious activity
 */
export async function checkSuspiciousActivity(
  userId: string,
  ipAddress: string,
  userAgent: string,
  failedAttempts: Map<string, { count: number; lastAttempt: number }>
): Promise<SecurityCheck> {
  const flags: string[] = [];
  
  // Check for multiple failed attempts
  const userFailedAttempts = failedAttempts.get(userId) || { count: 0, lastAttempt: 0 };
  if (userFailedAttempts.count > AUTH_CONFIG.suspiciousActivityThreshold) {
    flags.push('multiple_failed_logins');
  }
  
  // Check for unusual IP
  const recentSessions = await DatabaseService.findMany(Session, { 
    userId, 
    createdAt: { $gte: addHoursToDate(new Date(), -24) } 
  });
  
  const hasRecentIp = recentSessions.some(s => s.ipAddress === ipAddress);
  if (!hasRecentIp) {
    flags.push('unusual_ip_address');
  }
  
  return {
    suspicious: flags.length > 0,
    flags,
    riskScore: flags.length > 2 ? 80 : flags.length > 0 ? 50 : 20,
    recommendations: flags.length > 2 ? ['Enable 2FA', 'Review account activity'] : 
                     flags.length > 0 ? ['Monitor account activity'] : []
  };
}

/**
 * Extract IP address from request
 */
export function extractIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Check if device is new for user
 */
export async function isNewDevice(
  userId: string,
  deviceFingerprint: string
): Promise<boolean> {
  const existingSessions = await DatabaseService.findMany(Session, {
    userId,
    deviceFingerprint: { $ne: deviceFingerprint }
  });
  
  return existingSessions.length === 0;
}

/**
 * Check if location is new for user
 */
export async function isNewLocation(
  userId: string,
  ipAddress: string
): Promise<boolean> {
  const recentSessions = await DatabaseService.findMany(Session, {
    userId,
    ipAddress: { $ne: ipAddress },
    createdAt: { $gte: addHoursToDate(new Date(), -30 * 24) } // Last 30 days
  });
  
  return recentSessions.length === 0;
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic format validation
  const sessionIdPattern = /^sess_\d+_[a-z0-9]+$/;
  return sessionIdPattern.test(token);
}

/**
 * Calculate session age in minutes
 */
export function calculateSessionAge(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Check if session is expiring soon
 */
export function isSessionExpiringSoon(expiresAt: Date, warningMinutes: number = 10): boolean {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes <= warningMinutes && diffMinutes > 0;
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

/**
 * Generate rate limit key
 */
export function generateRateLimitKey(identifier: string, type: 'login' | 'signup' | 'password_reset'): string {
  return `${type}:${identifier}`;
}

/**
 * Check if rate limit is exceeded
 */
export function isRateLimitExceeded(
  rateLimitStore: Map<string, { count: number; resetTime: number }>,
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return false;
  }
  
  if (now > entry.resetTime) {
    rateLimitStore.delete(key);
    return false;
  }
  
  return entry.count >= maxAttempts;
}

/**
 * Update rate limit counter
 */
export function updateRateLimit(
  rateLimitStore: Map<string, { count: number; resetTime: number }>,
  key: string,
  windowMs: number
): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
  } else {
    entry.count++;
  }
}
