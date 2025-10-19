/**
 * Simple Session Manager
 * 
 * Single source of truth for all session operations.
 * Clean, simple, and maintainable.
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/database/mongoose';
import Session from '@/models/Session';
import User from '@/models/User';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/jwt';
import { SessionSecurity, SECURITY_CONFIG } from './SessionSecurity';
import { sessionPool, SessionPoolStats } from './SessionPool';
import { SecurityLogging } from './SecurityLogging';
import { SessionCleanup } from './SessionCleanup';

// Simple interfaces
export interface SessionResult {
  success: boolean;
  session?: any;
  user?: any;
  error?: string;
}

export interface ValidationResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export interface SessionInfo {
  sessionId: string;
  expiresAt: Date;
  lastAccessedAt: Date;
  securityRisk: 'low' | 'medium' | 'high';
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
}

export class SessionManager {
  
  /**
   * Create a new session
   */
  static async createSession(
    userId: string, 
    deviceInfo: any, 
    ipAddress: string,
    location?: any
  ): Promise<SessionResult> {
    try {
      await dbConnect();
      
      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Check if user is approved
      if (user.status !== 'approved') {
        return { success: false, error: 'User account not approved' };
      }
      
      // Check concurrent session limits
      const existingSessions = await Session.find({ 
        userId, 
        isActive: true, 
        revoked: false 
      });
      
      if (existingSessions.length >= SECURITY_CONFIG.maxSessionsPerUser) {
        return { 
          success: false, 
          error: `Maximum ${SECURITY_CONFIG.maxSessionsPerUser} concurrent sessions allowed` 
        };
      }
      
      // Enhanced device fingerprinting
      const fingerprint = SessionSecurity.generateEnhancedFingerprint(
        deviceInfo.userAgent || '',
        ipAddress,
        deviceInfo.screenResolution,
        deviceInfo.timezone,
        deviceInfo.language
      );
      
      // Check for new device/location
      const isNewDevice = !existingSessions.some(s => 
        s.securityContext.fingerprint === fingerprint
      );
      const isNewLocation = !existingSessions.some(s => s.ipAddress === ipAddress);
      
      // Check for suspicious activity
      const suspiciousCheck = await SessionSecurity.checkSuspiciousActivity(
        userId,
        ipAddress,
        deviceInfo.userAgent || ''
      );
      
      // Calculate enhanced risk score
      const riskScore = SessionSecurity.calculateRiskScore(
        isNewDevice,
        isNewLocation,
        suspiciousCheck.flags,
        user.userType,
        existingSessions
      );
      
      // Enhanced security context
      const securityContext = {
        fingerprint,
        riskScore,
        isNewDevice,
        isNewLocation,
        suspiciousActivity: suspiciousCheck.suspicious,
        lastSecurityCheck: new Date(),
        securityFlags: suspiciousCheck.flags
      };
      
      // Generate session ID and refresh token
      const sessionId = uuidv4();
      
        // Log security event if high risk
        if (riskScore >= 50) {
          await SecurityLogging.logSessionCreated(
            userId,
            sessionId,
            ipAddress,
            deviceInfo.userAgent || '',
            riskScore,
            suspiciousCheck.flags
          );
        }
      const refreshToken = uuidv4();
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
      
      // Create session
      const session = new Session({
        sessionId,
        userId,
        deviceInfo: {
          userAgent: deviceInfo.userAgent || '',
          platform: deviceInfo.platform || 'Unknown',
          browser: deviceInfo.browser || 'Unknown',
          browserVersion: deviceInfo.browserVersion || 'Unknown',
          os: deviceInfo.os || 'Unknown',
          osVersion: deviceInfo.osVersion || 'Unknown',
          deviceType: deviceInfo.deviceType || 'desktop',
          screenResolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone || 'UTC',
          language: deviceInfo.language || 'en-US'
        },
        ipAddress,
        location,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        securityContext,
        refreshToken: hashedRefreshToken,
        sessionType: 'web',
        concurrentSessions: existingSessions.length + 1,
        isPrimary: existingSessions.length === 0
      });
      
      await session.save();
      
      // Create JWT token
      const jwtToken = await signToken({
        userId: (user._id as any).toString(),
        email: user.email,
        userType: user.userType,
        sessionId: sessionId
      });
      
      // Set HTTP-only cookie
      await setAuthCookie(jwtToken);
      
      console.log(`✅ Session created for user ${user.email} (${sessionId})`);
      
      return {
        success: true,
        session: {
          sessionId,
          expiresAt: session.expiresAt,
          securityRisk: session.getSecurityRisk(),
          isNewDevice: securityContext.isNewDevice,
          isNewLocation: securityContext.isNewLocation,
          sessionAge: session.getSessionAge(),
          remainingTime: session.getRemainingTime()
        },
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName
        }
      };
      
    } catch (error) {
      console.error('❌ Session creation failed:', error);
      return { 
        success: false, 
        error: 'Failed to create session' 
      };
    }
  }
  
  /**
   * Validate a session (optimized with session pool)
   */
  static async validateSession(sessionId: string, ipAddress?: string): Promise<ValidationResult> {
    try {
      await dbConnect();
      
      // Use session pool for better performance
      const session = await sessionPool.getSession(sessionId);
      
      if (!session) {
        return { success: false, error: 'Session not found' };
      }
      
      if (session.isExpired()) {
        return { success: false, error: 'Session expired' };
      }
      
      if (session.isRevoked()) {
        return { success: false, error: 'Session revoked' };
      }
      
        // IP binding validation
        if (ipAddress) {
          const ipValidation = await SessionSecurity.validateIpBinding(sessionId, ipAddress);
          if (!ipValidation.valid) {
            await SecurityLogging.logDeviceFingerprintMismatch(
              session.userId.toString(),
              sessionId,
              ipAddress,
              session.ipAddress,
              ipAddress
            );
            return { success: false, error: ipValidation.reason };
          }
        }
      
      // Get user
      const user = await User.findById(session.userId).select('-password');
      if (!user || user.status !== 'approved') {
        return { success: false, error: 'User not found or inactive' };
      }
      
      // Update last accessed
      await session.updateLastAccessed();
      
      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status
        },
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: session.getSecurityRisk(),
          isNewDevice: session.securityContext.isNewDevice,
          isNewLocation: session.securityContext.isNewLocation,
          sessionAge: session.getSessionAge(),
          remainingTime: session.getRemainingTime()
        }
      };
      
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return { 
        success: false, 
        error: 'Session validation failed' 
      };
    }
  }
  
  /**
   * Refresh a session
   */
  static async refreshSession(sessionId: string): Promise<SessionResult> {
    try {
      await dbConnect();
      
      const session = await Session.findOne({ 
        sessionId, 
        isActive: true, 
        revoked: false 
      });
      
      if (!session || session.isExpired()) {
        return { success: false, error: 'Session not found or expired' };
      }
      
      // Extend session by 24 hours
      await session.extendSession(24);
      
      return {
        success: true,
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastAccessedAt: session.lastAccessedAt,
          securityRisk: session.getSecurityRisk(),
          isNewDevice: session.securityContext.isNewDevice,
          isNewLocation: session.securityContext.isNewLocation,
          sessionAge: session.getSessionAge(),
          remainingTime: session.getRemainingTime()
        }
      };
      
    } catch (error) {
      console.error('❌ Session refresh failed:', error);
      return { 
        success: false, 
        error: 'Session refresh failed' 
      };
    }
  }
  
  /**
   * Revoke a session
   */
  static async revokeSession(sessionId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return false;
      }
      
      await session.revokeSession();
      return true;
      
    } catch (error) {
      console.error('❌ Session revocation failed:', error);
      return false;
    }
  }
  
  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      await Session.updateMany(
        { userId, isActive: true },
        { 
          revoked: true, 
          revokedAt: new Date(),
          revokedReason: 'User logout or admin action'
        }
      );
      return true;
      
    } catch (error) {
      console.error('❌ Revoke all sessions failed:', error);
      return false;
    }
  }
  
  /**
   * Get user's active sessions (optimized with session pool)
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    try {
      await dbConnect();
      
      // Use session pool for better performance
      const sessions = await sessionPool.getSessions(userId);
      
      return sessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: {
          browser: session.deviceInfo.browser,
          browserVersion: session.deviceInfo.browserVersion,
          os: session.deviceInfo.os,
          osVersion: session.deviceInfo.osVersion,
          deviceType: session.deviceInfo.deviceType,
          platform: session.deviceInfo.platform
        },
        ipAddress: session.ipAddress,
        location: session.location,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        sessionType: session.sessionType,
        securityRisk: session.getSecurityRisk(),
        isNewDevice: session.securityContext.isNewDevice,
        isNewLocation: session.securityContext.isNewLocation,
        sessionAge: session.getSessionAge(),
        remainingTime: session.getRemainingTime(),
        isPrimary: session.isPrimary
      }));
      
    } catch (error) {
      console.error('❌ Get user sessions failed:', error);
      return [];
    }
  }
  
  /**
   * Cleanup expired sessions (enhanced with comprehensive cleanup)
   */
  static async cleanupExpiredSessions(): Promise<{ cleaned: number; performance: number }> {
    try {
      await dbConnect();
      
      // Use enhanced session cleanup for comprehensive cleanup
      const result = await SessionCleanup.performCleanup();
      return { 
        cleaned: result.total, 
        performance: result.metrics.cleanupDuration 
      };
      
    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
      return { cleaned: 0, performance: 0 };
    }
  }
  
  /**
   * Get session pool statistics
   */
  static async getSessionPoolStats(): Promise<SessionPoolStats> {
    try {
      return await sessionPool.getPoolStats();
    } catch (error) {
      console.error('❌ Failed to get pool stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        highRiskSessions: 0,
        averageSessionAge: 0,
        sessionDistribution: {},
        performanceMetrics: {
          averageQueryTime: 0,
          cacheHitRate: 0,
          totalQueries: 0,
          memoryUsage: 0
        }
      };
    }
  }
  
  /**
   * Get performance analytics
   */
  static getPerformanceAnalytics(): any {
    return sessionPool.getPerformanceAnalytics();
  }
  
  /**
   * Batch update sessions for better performance
   */
  static async batchUpdateSessions(sessionUpdates: Array<{ sessionId: string; updates: any }>): Promise<number> {
    try {
      return await sessionPool.batchUpdateSessions(sessionUpdates);
    } catch (error) {
      console.error('❌ Batch update failed:', error);
      return 0;
    }
  }

  /**
   * Get enhanced security statistics
   */
  static async getSecurityStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      return await SecurityLogging.getSecurityStatistics(startDate, endDate);
    } catch (error) {
      console.error('❌ Failed to get security statistics:', error);
      return null;
    }
  }

  /**
   * Get enhanced cleanup statistics
   */
  static async getCleanupStatistics(): Promise<any> {
    try {
      return await SessionCleanup.getCleanupStats();
    } catch (error) {
      console.error('❌ Failed to get cleanup statistics:', error);
      return null;
    }
  }

  /**
   * Schedule automatic cleanup
   */
  static scheduleAutomaticCleanup(intervalHours: number = 24): void {
    SessionCleanup.scheduleAutomaticCleanup(intervalHours);
  }
}
