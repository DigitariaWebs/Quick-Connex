/**
 * Session Service
 * 
 * Dedicated service for all session management operations.
 * Handles session creation, validation, refresh, revocation, and cleanup.
 * Always uses { lean: false } to ensure Mongoose document methods are available.
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '@/lib/database';
import Session from '@/models/Session';
import User from '@/models/User';
import { 
  SessionCreationData,
  SessionValidationResult,
  SessionRefreshResult,
  SessionStats,
  CleanupResult,
  SecurityContext,
  RiskFactors,
  SuspiciousActivityCheck,
  SessionLimitCheck
} from './types';
import {
  checkSessionLimit,
  calculateRiskScore,
  generateFingerprint,
  isNewDeviceForUser,
  isNewLocationForUser,
  assessRiskLevel,
  getSecurityFlags,
  buildSecurityContext,
  checkSuspiciousActivityForUser,
  getSessionLimitInfo,
  getUserSessions,
  generateJWTToken,
  isSessionExpired,
  isSessionExpiringSoon,
  calculateSessionAge,
  formatSessionForLogging,
  requiresSecurityReview,
  getSessionSecuritySummary,
  isValidSessionToken,
  generateSessionId,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken
} from './utils';
import {
  SESSION_LIMITS,
  SECURITY_THRESHOLDS,
  SESSION_TIMEOUTS,
  CLEANUP_INTERVALS,
  SECURITY_FLAGS,
  RISK_LEVELS,
  SESSION_STATUS,
  SESSION_TYPES,
  DEVICE_TYPES,
  PLATFORM_TYPES,
  BROWSER_TYPES,
  SECURITY_RECOMMENDATIONS,
  SESSION_ERROR_CODES,
  VALIDATION_RULES,
  SESSION_MONITORING_THRESHOLDS,
  CLEANUP_POLICIES,
  REFRESH_POLICIES,
  SECURITY_POLICIES,
  DEFAULT_SESSION_CONFIG
} from './config';
import { DeviceInfo } from '../core/types';
import { AUTH_CONFIG } from '../core/config';
import { 
  AppError,
  NotFoundError
} from '@/lib/utils/error-handling';
import { log } from '@/lib/logging';
import { maskEmail, truncate } from '@/lib/utils/string-helpers';

export class SessionService {
  
  // ===== PUBLIC SESSION OPERATIONS =====
  
  /**
   * Create a new session with full security checks
   * Only saves to DB after all validations pass
   * 
   * @param data - Session creation data
   * @returns Promise<SessionDocument> - Created session with Mongoose methods
   */
  static async createSession(data: SessionCreationData): Promise<any> {
    // 1. Check if there's an existing session cookie
    const existingSessionId = data.existingSessionId;
    
    if (existingSessionId) {
      const existingSession = await this.validateSession(existingSessionId);
      
      if (existingSession.valid && existingSession.session) {
        // Reuse existing session - just extend it
        log.info('Reusing existing session from cookie', {
          sessionId: existingSessionId,
          userId: data.userId
        });
        
        await existingSession.session.extendSession(AUTH_CONFIG.sessionTimeoutMinutes / 60);
        return existingSession.session;
      } else {
        // Session exists but invalid - will be replaced
        log.info('Replacing invalid session from cookie', {
          sessionId: existingSessionId,
          userId: data.userId,
          reason: existingSession.error
        });
        
        await this.revokeSession(existingSessionId, 'Replacing with new login');
      }
    }
    
    // 2. Check for existing session from same device/fingerprint
    const fingerprint = generateFingerprint(data.deviceInfo, data.userAgent);
    const userSessions = await getUserSessions(data.userId);
    
    const sameDeviceSession = userSessions.find(s => 
      s.securityContext?.fingerprint === fingerprint
    );
    
    if (sameDeviceSession) {
      log.info('Found existing session from same device, replacing it', {
        oldSessionId: sameDeviceSession.sessionId,
        userId: data.userId
      });
      
      await this.revokeSession(sameDeviceSession.sessionId, 'New login from same device');
    }
    
    // 3. Check session limit (after cleanup)
    const remainingSessions = await getUserSessions(data.userId);
    if (remainingSessions.length >= AUTH_CONFIG.maxSessionsPerUser) {
      // Try to auto-cleanup stale sessions
      const staleSessionsRemoved = await this.cleanupStaleSessions(data.userId);
      
      if (staleSessionsRemoved > 0) {
        log.info('Removed stale sessions to make room', {
          userId: data.userId,
          removedCount: staleSessionsRemoved
        });
      } else {
        // Still at limit - revoke oldest
        await this.revokeOldestSession(data.userId);
        log.warn('Revoked oldest session due to limit', {
          userId: data.userId,
          maxSessions: AUTH_CONFIG.maxSessionsPerUser
        });
      }
    }
    
    // 4. Build security context
    const securityContext = await buildSecurityContext(
      data.userId,
      data.deviceInfo,
      data.ipAddress,
      data.userAgent
    );
    
    // 5. Create session object (in memory only)
    const sessionId = uuidv4();
    const refreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    
    const session = new Session({
      sessionId,
      userId: data.userId,
      deviceInfo: data.deviceInfo,
      ipAddress: data.ipAddress,
      expiresAt: new Date(Date.now() + AUTH_CONFIG.sessionTimeoutMinutes * 60 * 1000),
      securityContext,
      refreshToken: hashedRefreshToken,
      sessionType: 'web',
      concurrentSessions: remainingSessions.length + 1,
      isPrimary: remainingSessions.length === 0,
      isActive: true,
      revoked: false
    });
    
    // 6. Validate user exists (BEFORE saving)
    const user = await DatabaseService.findById(User, data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // 7. Save to database (ONLY after all validations)
    await session.save();
    
    return session; // Returns Mongoose document
  }
  
  /**
   * Validate a session (expiry, revocation, IP binding)
   * Returns Mongoose document with methods
   * 
   * @param sessionId - Session ID to validate
   * @param ipAddress - Optional IP address for binding check
   * @returns Promise<SessionValidationResult> - Validation result
   */
  static async validateSession(
    sessionId: string, 
    ipAddress?: string
  ): Promise<SessionValidationResult> {
    // Fetch session with Mongoose methods
    const session = await DatabaseService.findOne(
      Session,
      {
        sessionId,
        isActive: true,
        revoked: false,
        expiresAt: { $gt: new Date() }
      },
      { lean: false } // CRITICAL: Need Mongoose methods
    );
    
    if (!session) {
      return {
        valid: false,
        error: 'Session not found or expired',
        errorCode: 'SESSION_EXPIRED'
      };
    }
    
    // Use Mongoose method
    if (session.isExpired()) {
      return {
        valid: false,
        error: 'Session expired',
        errorCode: 'SESSION_EXPIRED'
      };
    }
    
    // Use Mongoose method
    if (session.isRevoked()) {
      return {
        valid: false,
        error: 'Session revoked',
        errorCode: 'SESSION_REVOKED'
      };
    }
    
    // IP binding check
    if (ipAddress && AUTH_CONFIG.requireIpBinding && session.ipAddress !== ipAddress) {
      return {
        valid: false,
        error: 'IP address mismatch',
        errorCode: 'IP_MISMATCH'
      };
    }
    
    return {
      valid: true,
      session,
      securityRisk: assessRiskLevel(session.securityContext?.riskScore || 0)
    };
  }
  
  /**
   * Refresh/extend a session
   * 
   * @param sessionId - Session ID to refresh
   * @returns Promise<SessionRefreshResult> - Refresh result with new token
   */
  static async refreshSession(sessionId: string): Promise<SessionRefreshResult> {
    const validation = await this.validateSession(sessionId);
    
    if (!validation.valid || !validation.session) {
      throw new AppError(
        validation.error || 'Session validation failed',
        401,
        validation.errorCode || 'SESSION_INVALID'
      );
    }
    
    // Extend session using Mongoose method
    await validation.session.extendSession(AUTH_CONFIG.tokenExpirationHours);
    
    // Generate new JWT token
    const newToken = await this.generateJWTToken(validation.session);
    
    return {
      success: true,
      session: validation.session,
      newToken,
      expiresAt: validation.session.expiresAt
    };
  }
  
  /**
   * Revoke a single session
   * 
   * @param sessionId - Session ID to revoke
   * @param reason - Optional reason for revocation
   * @returns Promise<boolean> - Success status
   */
  static async revokeSession(
    sessionId: string, 
    reason?: string
  ): Promise<boolean> {
    const session = await DatabaseService.findOne(
      Session,
      { sessionId },
      { lean: false } // Need revokeSession() method
    );
    
    if (!session) {
      return false;
    }
    
    await session.revokeSession(undefined, reason);
    return true;
  }
  
  /**
   * Revoke all sessions for a user
   * 
   * @param userId - User ID to revoke sessions for
   * @param exceptSessionId - Optional session ID to exclude from revocation
   * @param reason - Optional reason for revocation
   * @returns Promise<number> - Number of sessions revoked
   */
  static async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string,
    reason?: string
  ): Promise<number> {
    const sessions = await getUserSessions(userId);
    
    let revokedCount = 0;
    for (const session of sessions) {
      if (!exceptSessionId || session.sessionId !== exceptSessionId) {
        await session.revokeSession(undefined, reason);
        revokedCount++;
      }
    }
    
    return revokedCount;
  }
  
  /**
   * Get all active sessions for a user
   * 
   * @param userId - User ID to get sessions for
   * @returns Promise<SessionDocument[]> - Array of active sessions
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    return DatabaseService.findMany(
      Session,
      {
        userId,
        isActive: true,
        revoked: false,
        expiresAt: { $gt: new Date() }
      },
      {
        lean: false, // Need Mongoose methods
        sort: { createdAt: -1 }
      }
    );
  }
  
  /**
   * Get global session statistics
   * 
   * @returns Promise<SessionStats> - Global session statistics
   */
  static async getSessionStats(): Promise<SessionStats> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Get all active sessions
    const activeSessions = await DatabaseService.findMany(
      Session,
      {
        isActive: true,
        revoked: false,
        expiresAt: { $gt: now }
      },
      { lean: false }
    );
    
    // Get unique users
    const uniqueUsers = new Set(activeSessions.map(s => s.userId.toString()));
    
    // Calculate statistics
    const highRiskSessions = activeSessions.filter(s => 
      s.securityContext?.riskScore >= AUTH_CONFIG.highRiskThreshold
    ).length;
    
    const newDeviceSessions = activeSessions.filter(s => 
      s.securityContext?.isNewDevice
    ).length;
    
    const expiringSoon = activeSessions.filter(s => 
      s.expiresAt <= new Date(now.getTime() + 60 * 60 * 1000) // Next hour
    ).length;
    
    const oldestSession = activeSessions.length > 0 
      ? new Date(Math.min(...activeSessions.map(s => s.createdAt.getTime())))
      : null;
    
    const newestSession = activeSessions.length > 0
      ? new Date(Math.max(...activeSessions.map(s => s.createdAt.getTime())))
      : null;
    
    return {
      totalActiveSessions: activeSessions.length,
      totalUsers: uniqueUsers.size,
      averageSessionsPerUser: uniqueUsers.size > 0 ? activeSessions.length / uniqueUsers.size : 0,
      highRiskSessions,
      newDeviceSessions,
      expiringSoon,
      oldestSession,
      newestSession
    };
  }
  
  /**
   * Cleanup expired sessions (maintenance job)
   * 
   * @returns Promise<CleanupResult> - Cleanup results
   */
  static async cleanupExpiredSessions(): Promise<CleanupResult> {
    const now = new Date();
    
    // Find expired sessions
    const expiredSessions = await DatabaseService.findMany(
      Session,
      {
        $or: [
          { expiresAt: { $lt: now } },
          { isActive: false },
          { revoked: true }
        ]
      },
      { lean: false }
    );
    
    const expiredSessionIds = expiredSessions.map(s => s.sessionId);
    
    // Delete expired sessions
    const deleteResult = await DatabaseService.deleteMany(
      Session,
      {
        $or: [
          { expiresAt: { $lt: now } },
          { isActive: false },
          { revoked: true }
        ]
      }
    );
    
    return {
      deletedCount: deleteResult.deletedCount || 0,
      expiredSessionIds
    };
  }
  
  // ===== SECURITY & VALIDATION =====
  
  /**
   * Check if user has reached session limit
   * 
   * @param userId - User ID to check
   * @returns Promise<boolean> - True if within limit, false if exceeded
   */
  static async checkSessionLimit(userId: string): Promise<boolean> {
    const activeSessions = await getUserSessions(userId);
    return activeSessions.length < AUTH_CONFIG.maxSessionsPerUser;
  }
  
  /**
   * Calculate risk score for new session
   * 
   * @param userId - User ID
   * @param ipAddress - IP address
   * @param fingerprint - Device fingerprint
   * @returns Promise<number> - Risk score (0-100)
   */
  static async calculateRiskScore(
    userId: string,
    ipAddress: string,
    fingerprint: string
  ): Promise<number> {
    let riskScore = 10; // Base risk
    
    // Check if new device
    const isNewDevice = await isNewDeviceForUser(userId, fingerprint);
    if (isNewDevice) riskScore += 20;
    
    // Check if new location
    const isNewLocation = await isNewLocationForUser(userId, ipAddress);
    if (isNewLocation) riskScore += 15;
    
    // Check for suspicious activity
    const suspiciousCheck = await this.checkSuspiciousActivity(userId, ipAddress, fingerprint);
    riskScore += suspiciousCheck.flags.length * 10;
    
    // Check session count
    const activeSessions = await getUserSessions(userId);
    if (activeSessions.length > 2) riskScore += 10;
    
    return Math.min(riskScore, 100);
  }
  
  /**
   * Generate device fingerprint
   * 
   * @param deviceInfo - Device information
   * @param userAgent - User agent string
   * @returns string - Device fingerprint
   */
  static generateFingerprint(
    deviceInfo: DeviceInfo,
    userAgent: string
  ): string {
    const components = [
      userAgent,
      deviceInfo.platform || 'unknown',
      deviceInfo.browser || 'unknown',
      deviceInfo.screenResolution || 'unknown',
      new Date().getTimezoneOffset().toString()
    ];
    
    return components.join('|');
  }
  
  /**
   * Check if device is new for user
   * 
   * @param userId - User ID
   * @param fingerprint - Device fingerprint
   * @returns Promise<boolean> - True if new device
   */
  static async isNewDevice(
    userId: string,
    fingerprint: string
  ): Promise<boolean> {
    const existingSessions = await getUserSessions(userId);
    return !existingSessions.some(s => 
      s.securityContext?.fingerprint === fingerprint
    );
  }
  
  /**
   * Check if location is new for user
   * 
   * @param userId - User ID
   * @param ipAddress - IP address
   * @returns Promise<boolean> - True if new location
   */
  static async isNewLocation(
    userId: string,
    ipAddress: string
  ): Promise<boolean> {
    const existingSessions = await getUserSessions(userId);
    return !existingSessions.some(s => s.ipAddress === ipAddress);
  }
  
  /**
   * Assess security risk level
   * 
   * @param riskScore - Risk score (0-100)
   * @returns string - Risk level description
   */
  static assessRiskLevel(riskScore: number): string {
    if (riskScore >= AUTH_CONFIG.highRiskThreshold) return 'high';
    if (riskScore >= AUTH_CONFIG.mediumRiskThreshold) return 'medium';
    return 'low';
  }
  
  /**
   * Get security flags based on risk factors
   * 
   * @param factors - Risk factors
   * @returns string[] - Array of security flags
   */
  static getSecurityFlags(factors: RiskFactors): string[] {
    const flags: string[] = [];
    
    if (factors.newDevice) flags.push('new_device');
    if (factors.newLocation) flags.push('new_location');
    if (factors.rapidLocationChange) flags.push('rapid_location_change');
    if (factors.unusualTime) flags.push('unusual_time');
    if (factors.tooManySessions) flags.push('too_many_sessions');
    if (factors.suspiciousIP) flags.push('suspicious_ip');
    
    return flags;
  }
  
  // ===== PRIVATE HELPERS =====
  
  /**
   * Build security context for new session
   * 
   * @param userId - User ID
   * @param deviceInfo - Device information
   * @param ipAddress - IP address
   * @param userAgent - User agent string
   * @returns Promise<SecurityContext> - Security context
   */
  private static async buildSecurityContext(
    userId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string
  ): Promise<SecurityContext> {
    // Generate fingerprint
    const fingerprint = generateFingerprint(deviceInfo, userAgent);
    
    // Calculate risk score
    const riskScore = await calculateRiskScore(userId, ipAddress, fingerprint);
    
    // Check for new device/location
    const isNewDevice = await isNewDeviceForUser(userId, fingerprint);
    const isNewLocation = await isNewLocationForUser(userId, ipAddress);
    
    // Check for suspicious activity
    const suspiciousCheck = await this.checkSuspiciousActivity(userId, ipAddress, fingerprint);
    
    // Get security flags
    const riskFactors: RiskFactors = {
      newDevice: isNewDevice,
      newLocation: isNewLocation,
      rapidLocationChange: false, // Would need more complex logic
      unusualTime: false, // Would need time analysis
      tooManySessions: false, // Already checked in createSession
      suspiciousIP: suspiciousCheck.suspicious
    };
    
    const securityFlags = this.getSecurityFlags(riskFactors);
    
    return {
      fingerprint,
      riskScore,
      isNewDevice,
      isNewLocation,
      suspiciousActivity: suspiciousCheck.suspicious,
      lastSecurityCheck: new Date(),
      securityFlags
    };
  }
  
  /**
   * Check for suspicious activity patterns
   * 
   * @param userId - User ID
   * @param ipAddress - IP address
   * @param fingerprint - Device fingerprint
   * @returns Promise<SuspiciousActivityCheck> - Suspicious activity check result
   */
  private static async checkSuspiciousActivity(
    userId: string,
    ipAddress: string,
    fingerprint: string
  ): Promise<SuspiciousActivityCheck> {
    const flags: string[] = [];
    
    // Check for unusual IP (simplified - would need rate limiting store)
    const recentSessions = await DatabaseService.findMany(Session, { 
      userId, 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
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
   * Get detailed session limit information
   * 
   * @param userId - User ID
   * @returns Promise<SessionLimitCheck> - Session limit check result
   */
  private static async getSessionLimitInfo(userId: string): Promise<SessionLimitCheck> {
    const activeSessions = await getUserSessions(userId);
    const currentCount = activeSessions.length;
    const maxAllowed = AUTH_CONFIG.maxSessionsPerUser;
    
    return {
      withinLimit: currentCount < maxAllowed,
      currentCount,
      maxAllowed,
      canCreateNew: currentCount < maxAllowed
    };
  }
  
  /**
   * Generate JWT token for session
   * 
   * @param session - Session document
   * @returns Promise<string> - JWT token
   */
  private static async generateJWTToken(session: any): Promise<string> {
    const { signToken } = await import('@/lib/auth');
    const user = await DatabaseService.findById(User, session.userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    return signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      userType: user.userType,
      sessionId: session.sessionId
    });
  }

  /**
   * Clean up stale sessions (not accessed in 7 days)
   * Returns number of sessions removed
   */
  static async cleanupStaleSessions(userId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const staleSessions = await DatabaseService.findMany(
      Session,
      {
        userId,
        isActive: true,
        revoked: false,
        lastAccessedAt: { $lt: sevenDaysAgo }
      },
      { lean: false }
    );
    
    for (const session of staleSessions) {
      await session.revokeSession(undefined, 'Stale session cleanup');
    }
    
    return staleSessions.length;
  }

  /**
   * Revoke the oldest session for a user
   */
  static async revokeOldestSession(userId: string): Promise<boolean> {
    const sessions = await getUserSessions(userId);
    
    if (sessions.length === 0) {
      return false;
    }
    
    // Sort by lastAccessedAt, oldest first
    sessions.sort((a, b) => 
      a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
    );
    
    const oldestSession = sessions[0];
    await oldestSession.revokeSession(undefined, 'Auto-revoked to make room for new session');
    
    return true;
  }

  /**
   * Get session by cookie/token
   */
  static async getSessionFromCookie(sessionId: string): Promise<any | null> {
    return DatabaseService.findOne(
      Session,
      { sessionId },
      { lean: false }
    );
  }
}
