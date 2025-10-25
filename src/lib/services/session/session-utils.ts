/**
 * Session Utilities
 * 
 * Utility functions for session management including validation,
 * security checks, and risk assessment.
 */

import { DatabaseService } from '@/lib/database';
import Session from '@/models/Session';
import User from '@/models/User';
import { AUTH_CONFIG } from '@/lib/auth/auth-config';
import { 
  SessionCreationData,
  SecurityContext,
  RiskFactors,
  SuspiciousActivityCheck,
  SessionLimitCheck
} from './session-types';
import { DeviceInfo } from '@/lib/auth/auth-types';
import { 
  addHoursToDate,
  calculateDateDiff,
  isPast
} from '@/lib/utils/date-time';
import { 
  maskEmail, 
  truncate 
} from '@/lib/utils/string-helpers';

/**
 * Check if user is within session limit
 */
export async function checkSessionLimit(userId: string): Promise<boolean> {
  const activeSessions = await getUserSessions(userId);
  return activeSessions.length < AUTH_CONFIG.maxSessionsPerUser;
}

/**
 * Calculate risk score for session
 */
export async function calculateRiskScore(
  userId: string,
  ipAddress: string,
  fingerprint: string
): Promise<number> {
  let score = 0;
  
  // Check for new device
  const isNewDevice = await isNewDeviceForUser(userId, fingerprint);
  if (isNewDevice) score += 30;
  
  // Check for new location
  const isNewLocation = await isNewLocationForUser(userId, ipAddress);
  if (isNewLocation) score += 20;
  
  // Check for suspicious activity
  const suspiciousCheck = await checkSuspiciousActivityForUser(userId, ipAddress, fingerprint);
  if (suspiciousCheck.suspicious) {
    score += suspiciousCheck.flags.length * 10; // Add score based on number of flags
  }
  
  // Check user type (admin users are higher risk)
  const user = await DatabaseService.findById(User, userId);
  if (user && (user.userType === 'admin' || user.userType === 'super_admin')) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * Generate device fingerprint
 */
export function generateFingerprint(
  deviceInfo: DeviceInfo,
  userAgent: string
): string {
  const components = [
    deviceInfo.platform,
    deviceInfo.browser,
    deviceInfo.os,
    deviceInfo.deviceType,
    userAgent.substring(0, 100) // Limit user agent length
  ];
  
  return components.join('|');
}

/**
 * Check if device is new for user
 */
export async function isNewDeviceForUser(
  userId: string,
  fingerprint: string
): Promise<boolean> {
  const existingSessions = await DatabaseService.findMany(Session, {
    userId,
    'securityContext.fingerprint': { $ne: fingerprint }
  });
  
  return existingSessions.length === 0;
}

/**
 * Check if location is new for user
 */
export async function isNewLocationForUser(
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
 * Assess risk level based on score
 */
export function assessRiskLevel(riskScore: number): string {
  if (riskScore >= AUTH_CONFIG.highRiskThreshold) return 'high';
  if (riskScore >= AUTH_CONFIG.mediumRiskThreshold) return 'medium';
  return 'low';
}

/**
 * Get security flags from risk factors
 */
export function getSecurityFlags(factors: RiskFactors): string[] {
  const flags: string[] = [];
  
  if (factors.newDevice) flags.push('new_device');
  if (factors.newLocation) flags.push('new_location');
  if (factors.rapidLocationChange) flags.push('rapid_location_change');
  if (factors.unusualTime) flags.push('unusual_time');
  if (factors.tooManySessions) flags.push('too_many_sessions');
  if (factors.suspiciousIP) flags.push('suspicious_ip');
  
  return flags;
}

/**
 * Build security context for session
 */
export async function buildSecurityContext(
  userId: string,
  deviceInfo: DeviceInfo,
  ipAddress: string,
  userAgent: string
): Promise<SecurityContext> {
  const fingerprint = generateFingerprint(deviceInfo, userAgent);
  const riskScore = await calculateRiskScore(userId, ipAddress, fingerprint);
  const riskLevel = assessRiskLevel(riskScore);
  
  const factors: RiskFactors = {
    newDevice: await isNewDeviceForUser(userId, fingerprint),
    newLocation: await isNewLocationForUser(userId, ipAddress),
    rapidLocationChange: false, // Could be implemented based on recent location changes
    unusualTime: false, // Could be implemented based on time of day
    tooManySessions: false, // Could be implemented based on session count
    suspiciousIP: false // Could be implemented based on IP reputation
  };
  
  const flags = getSecurityFlags(factors);
  
  return {
    fingerprint,
    riskScore,
    isNewDevice: factors.newDevice,
    isNewLocation: factors.newLocation,
    suspiciousActivity: flags.length > 0,
    lastSecurityCheck: new Date(),
    securityFlags: flags
  };
}

/**
 * Check for suspicious activity
 */
export async function checkSuspiciousActivityForUser(
  userId: string,
  ipAddress: string,
  fingerprint: string
): Promise<SuspiciousActivityCheck> {
  const flags: string[] = [];
  
  // Check for multiple failed attempts (would need access to failed attempts store)
  // This is a simplified version - in real implementation, you'd check against auth service
  
  // Check for unusual IP patterns
  const recentSessions = await DatabaseService.findMany(Session, {
    userId,
    createdAt: { $gte: addHoursToDate(new Date(), -24) }
  });
  
  const hasRecentIp = recentSessions.some(s => s.ipAddress === ipAddress);
  if (!hasRecentIp) {
    flags.push('unusual_ip_address');
  }
  
  // Check for rapid session creation
  const recentSessionCount = recentSessions.length;
  if (recentSessionCount > 5) {
    flags.push('rapid_session_creation');
  }
  
  return {
    suspicious: flags.length > 0,
    flags
  };
}

/**
 * Get session limit information
 */
export async function getSessionLimitInfo(userId: string): Promise<SessionLimitCheck> {
  const activeSessions = await getUserSessions(userId);
  const currentCount = activeSessions.length;
  const maxAllowed = AUTH_CONFIG.maxSessionsPerUser;
  
  return {
    currentCount,
    maxAllowed,
    withinLimit: currentCount < maxAllowed,
    canCreateNew: currentCount < maxAllowed
  };
}

/**
 * Get user sessions
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  return DatabaseService.findMany(
    Session,
    {
      userId,
      isActive: true,
      revoked: false,
      expiresAt: { $gt: new Date() }
    },
    {
      sort: { createdAt: -1 }
    }
  );
}

/**
 * Generate JWT token for session
 */
export async function generateJWTToken(session: any): Promise<string> {
  const { signToken } = await import('@/lib/auth/jwt-utils');
  const user = await DatabaseService.findById(User, session.userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return signToken({
    userId: (user._id as any).toString(),
    sessionId: session.sessionId,
    userType: user.userType,
    email: user.email
  });
}

/**
 * Validate session expiry
 */
export function isSessionExpired(session: any): boolean {
  return isPast(session.expiresAt);
}

/**
 * Check if session is expiring soon
 */
export function isSessionExpiringSoon(session: any, warningMinutes: number = 30): boolean {
  const now = new Date();
  const diffMs = session.expiresAt.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes <= warningMinutes && diffMinutes > 0;
}

/**
 * Calculate session age in minutes
 */
export function calculateSessionAge(session: any): number {
  return calculateDateDiff(session.createdAt, new Date(), 'minutes');
}

/**
 * Format session for logging
 */
export function formatSessionForLogging(session: any): Record<string, any> {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    ipAddress: session.ipAddress,
    deviceType: session.deviceInfo?.deviceType,
    platform: session.deviceInfo?.platform,
    browser: session.deviceInfo?.browser,
    riskLevel: session.securityContext?.riskLevel,
    riskScore: session.securityContext?.riskScore,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    isActive: session.isActive,
    revoked: session.revoked
  };
}

/**
 * Check if session requires security review
 */
export function requiresSecurityReview(session: any): boolean {
  return session.securityContext?.requiresReview === true ||
         session.securityContext?.riskLevel === 'high' ||
         session.securityContext?.flags?.length > 0;
}

/**
 * Get session security summary
 */
export function getSessionSecuritySummary(session: any): Record<string, any> {
  return {
    riskLevel: session.securityContext?.riskLevel || 'low',
    riskScore: session.securityContext?.riskScore || 0,
    flags: session.securityContext?.flags || [],
    requiresReview: requiresSecurityReview(session),
    isSensitive: session.securityContext?.isSensitive || false,
    lastSecurityCheck: session.securityContext?.lastSecurityCheck
  };
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic format validation for session ID
  const sessionIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return sessionIdPattern.test(token);
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(): string {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

/**
 * Hash refresh token
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(token, 12);
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string, hashedToken: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(token, hashedToken);
}
