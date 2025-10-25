/**
 * Security and Risk Assessment Utilities
 * 
 * Functions for security checks, risk assessment, and suspicious activity detection.
 */

import { NextRequest } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Session from '@/models/Session';
import { AUTH_CONFIG } from '../core/config';
import { 
  SecurityCheck,
  RiskAssessment
} from '../core/types';
import { RiskLevel } from '@/models/AuditLog';
import { 
  addHoursToDate 
} from '@/lib/utils/date-time';

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

