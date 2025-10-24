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
import { DatabaseService, Session } from '@/lib/database';
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
} from './session-types';
import { DeviceInfo } from '@/lib/auth/auth-types';
import { AUTH_CONFIG } from '@/lib/auth/auth-config';
import { 
  AppError,
  NotFoundError,
  logErrorWithContext,
  logInfo,
  logDebug
} from '@/lib/utils/error-handling';
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
    // 1. Check session limit FIRST
    const activeSessions = await this.getUserSessions(data.userId);
    if (activeSessions.length >= AUTH_CONFIG.maxSessionsPerUser) {
      throw new AppError(
        `Maximum ${AUTH_CONFIG.maxSessionsPerUser} concurrent sessions allowed`,
        429,
        'TOO_MANY_SESSIONS'
      );
    }
    
    // 2. Build security context
    const securityContext = await this.buildSecurityContext(
      data.userId,
      data.deviceInfo,
      data.ipAddress,
      data.userAgent
    );
    
    // 3. Create session object (in memory only)
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
      concurrentSessions: activeSessions.length + 1,
      isPrimary: activeSessions.length === 0,
      isActive: true,
      revoked: false
    });
    
    // 4. Validate user exists (BEFORE saving)
    const user = await DatabaseService.findById(User, data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // 5. Save to database (ONLY after all validations)
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
      securityRisk: this.assessRiskLevel(session.securityContext?.riskScore || 0)
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
    const sessions = await this.getUserSessions(userId);
    
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
    const activeSessions = await this.getUserSessions(userId);
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
    const isNewDevice = await this.isNewDevice(userId, fingerprint);
    if (isNewDevice) riskScore += 20;
    
    // Check if new location
    const isNewLocation = await this.isNewLocation(userId, ipAddress);
    if (isNewLocation) riskScore += 15;
    
    // Check for suspicious activity
    const suspiciousCheck = await this.checkSuspiciousActivity(userId, ipAddress, fingerprint);
    riskScore += suspiciousCheck.flags.length * 10;
    
    // Check session count
    const activeSessions = await this.getUserSessions(userId);
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
    const existingSessions = await this.getUserSessions(userId);
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
    const existingSessions = await this.getUserSessions(userId);
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
    const fingerprint = this.generateFingerprint(deviceInfo, userAgent);
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(userId, ipAddress, fingerprint);
    
    // Check for new device/location
    const isNewDevice = await this.isNewDevice(userId, fingerprint);
    const isNewLocation = await this.isNewLocation(userId, ipAddress);
    
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
    const activeSessions = await this.getUserSessions(userId);
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
    const { signToken } = await import('@/lib/auth/jwt-utils');
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
}
