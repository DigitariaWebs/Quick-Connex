/**
 * Enhanced Session Cleanup System
 * 
 * This file provides comprehensive session cleanup capabilities
 * integrated with the session management system.
 */

import dbConnect from '@/lib/database/mongoose';
import Session from '@/models/Session';
import User from '@/models/User';

export interface SessionCleanupResult {
  expired: number;
  revoked: number;
  suspicious: number;
  inactive: number;
  orphaned: number;
  total: number;
  errors: string[];
  warnings: string[];
  metrics: {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    revokedSessions: number;
    suspiciousSessions: number;
    cleanupDuration: number;
  };
}

export interface SessionCleanupConfig {
  // Cleanup thresholds
  maxSessionAge: number; // hours
  suspiciousSessionAge: number; // hours
  inactiveUserThreshold: number; // hours
  
  // Batch processing
  batchSize: number;
  maxProcessingTime: number; // milliseconds
  
  // Safety limits
  maxSessionsToDelete: number;
  dryRun: boolean;
}

const DEFAULT_CONFIG: SessionCleanupConfig = {
  maxSessionAge: 24 * 7, // 7 days
  suspiciousSessionAge: 24, // 1 day
  inactiveUserThreshold: 24 * 30, // 30 days
  batchSize: 100,
  maxProcessingTime: 30000, // 30 seconds
  maxSessionsToDelete: 1000,
  dryRun: false
};

/**
 * Session cleanup system with comprehensive monitoring and safety features
 */
export class SessionCleanup {
  
  /**
   * Perform comprehensive session cleanup
   */
  static async performCleanup(config: Partial<SessionCleanupConfig> = {}): Promise<SessionCleanupResult> {
    const startTime = Date.now();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    const result: SessionCleanupResult = {
      expired: 0,
      revoked: 0,
      suspicious: 0,
      inactive: 0,
      orphaned: 0,
      total: 0,
      errors: [],
      warnings: [],
      metrics: {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        revokedSessions: 0,
        suspiciousSessions: 0,
        cleanupDuration: 0
      }
    };
    
    try {
      await dbConnect();
      
      // Get initial metrics
      result.metrics.totalSessions = await Session.countDocuments();
      result.metrics.activeSessions = await Session.countDocuments({ 
        isActive: true, 
        revoked: false, 
        expiresAt: { $gt: new Date() } 
      });
      
      console.log('🧹 Starting enhanced session cleanup...');
      console.log('📊 Initial metrics:', {
        totalSessions: result.metrics.totalSessions,
        activeSessions: result.metrics.activeSessions
      });
      
      // 1. Clean up expired sessions
      const expiredResult = await this.cleanupExpiredSessions(finalConfig);
      result.expired = expiredResult.count;
      result.errors.push(...expiredResult.errors);
      result.warnings.push(...expiredResult.warnings);
      
      // 2. Clean up revoked sessions
      const revokedResult = await this.cleanupRevokedSessions(finalConfig);
      result.revoked = revokedResult.count;
      result.errors.push(...revokedResult.errors);
      result.warnings.push(...revokedResult.warnings);
      
      // 3. Clean up suspicious sessions
      const suspiciousResult = await this.cleanupSuspiciousSessions(finalConfig);
      result.suspicious = suspiciousResult.count;
      result.errors.push(...suspiciousResult.errors);
      result.warnings.push(...suspiciousResult.warnings);
      
      // 4. Clean up sessions for inactive users
      const inactiveResult = await this.cleanupInactiveUserSessions(finalConfig);
      result.inactive = inactiveResult.count;
      result.errors.push(...inactiveResult.errors);
      result.warnings.push(...inactiveResult.warnings);
      
      // 5. Clean up orphaned sessions
      const orphanedResult = await this.cleanupOrphanedSessions(finalConfig);
      result.orphaned = orphanedResult.count;
      result.errors.push(...orphanedResult.errors);
      result.warnings.push(...orphanedResult.warnings);
      
      // Calculate totals
      result.total = result.expired + result.revoked + result.suspicious + result.inactive + result.orphaned;
      
      // Update final metrics
      result.metrics.expiredSessions = await Session.countDocuments({ 
        expiresAt: { $lt: new Date() } 
      });
      result.metrics.revokedSessions = await Session.countDocuments({ 
        revoked: true 
      });
      result.metrics.suspiciousSessions = await Session.countDocuments({ 
        'securityContext.riskScore': { $gte: 70 },
        isActive: true
      });
      result.metrics.cleanupDuration = Date.now() - startTime;
      
      console.log('✅ Enhanced session cleanup completed:', {
        totalCleaned: result.total,
        duration: result.metrics.cleanupDuration,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced session cleanup failed:', error);
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.metrics.cleanupDuration = Date.now() - startTime;
      return result;
    }
  }
  
  /**
   * Clean up expired sessions
   */
  private static async cleanupExpiredSessions(config: SessionCleanupConfig): Promise<{
    count: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const expiredThreshold = new Date(Date.now() - config.maxSessionAge * 60 * 60 * 1000);
      
      const expiredSessions = await Session.find({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { createdAt: { $lt: expiredThreshold } }
        ],
        isActive: true
      }).limit(config.batchSize);
      
      if (expiredSessions.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      if (config.dryRun) {
        warnings.push(`DRY RUN: Would delete ${expiredSessions.length} expired sessions`);
        return { count: 0, errors, warnings };
      }
      
      // Delete expired sessions
      const deleteResult = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { createdAt: { $lt: expiredThreshold } }
        ],
        isActive: true
      });
      
      console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} expired sessions`);
      return { count: deleteResult.deletedCount || 0, errors, warnings };
      
    } catch (error) {
      errors.push(`Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { count: 0, errors, warnings };
    }
  }
  
  /**
   * Clean up revoked sessions
   */
  private static async cleanupRevokedSessions(config: SessionCleanupConfig): Promise<{
    count: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const revokedThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const revokedSessions = await Session.find({
        revoked: true,
        revokedAt: { $lt: revokedThreshold }
      }).limit(config.batchSize);
      
      if (revokedSessions.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      if (config.dryRun) {
        warnings.push(`DRY RUN: Would delete ${revokedSessions.length} revoked sessions`);
        return { count: 0, errors, warnings };
      }
      
      const deleteResult = await Session.deleteMany({
        revoked: true,
        revokedAt: { $lt: revokedThreshold }
      });
      
      console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} revoked sessions`);
      return { count: deleteResult.deletedCount || 0, errors, warnings };
      
    } catch (error) {
      errors.push(`Failed to cleanup revoked sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { count: 0, errors, warnings };
    }
  }
  
  /**
   * Clean up suspicious sessions
   */
  private static async cleanupSuspiciousSessions(config: SessionCleanupConfig): Promise<{
    count: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const suspiciousThreshold = new Date(Date.now() - config.suspiciousSessionAge * 60 * 60 * 1000);
      
      const suspiciousSessions = await Session.find({
        'securityContext.riskScore': { $gte: 70 },
        'securityContext.lastSecurityCheck': { $lt: suspiciousThreshold },
        isActive: true
      }).limit(config.batchSize);
      
      if (suspiciousSessions.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      if (config.dryRun) {
        warnings.push(`DRY RUN: Would revoke ${suspiciousSessions.length} suspicious sessions`);
        return { count: 0, errors, warnings };
      }
      
      // Revoke suspicious sessions instead of deleting
      let revokedCount = 0;
      for (const session of suspiciousSessions) {
        try {
          await session.revokeSession(undefined, 'Suspicious activity detected during cleanup');
          revokedCount++;
        } catch (error) {
          errors.push(`Failed to revoke suspicious session ${session.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log(`🔒 Revoked ${revokedCount} suspicious sessions`);
      return { count: revokedCount, errors, warnings };
      
    } catch (error) {
      errors.push(`Failed to cleanup suspicious sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { count: 0, errors, warnings };
    }
  }
  
  /**
   * Clean up sessions for inactive users
   */
  private static async cleanupInactiveUserSessions(config: SessionCleanupConfig): Promise<{
    count: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const inactiveThreshold = new Date(Date.now() - config.inactiveUserThreshold * 60 * 60 * 1000);
      
      // Find users who haven't been active recently
      const inactiveUsers = await User.find({
        status: { $ne: 'approved' },
        updatedAt: { $lt: inactiveThreshold }
      }).select('_id');
      
      if (inactiveUsers.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      const userIds = inactiveUsers.map(user => user._id);
      
      const inactiveSessions = await Session.find({
        userId: { $in: userIds },
        isActive: true
      }).limit(config.batchSize);
      
      if (inactiveSessions.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      if (config.dryRun) {
        warnings.push(`DRY RUN: Would revoke ${inactiveSessions.length} sessions for inactive users`);
        return { count: 0, errors, warnings };
      }
      
      // Revoke sessions for inactive users
      let revokedCount = 0;
      for (const session of inactiveSessions) {
        try {
          await session.revokeSession(undefined, 'User account inactive');
          revokedCount++;
        } catch (error) {
          errors.push(`Failed to revoke session for inactive user ${session.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log(`👤 Revoked ${revokedCount} sessions for inactive users`);
      return { count: revokedCount, errors, warnings };
      
    } catch (error) {
      errors.push(`Failed to cleanup inactive user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { count: 0, errors, warnings };
    }
  }
  
  /**
   * Clean up orphaned sessions (sessions without valid users)
   */
  private static async cleanupOrphanedSessions(config: SessionCleanupConfig): Promise<{
    count: number;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Find sessions with invalid user references
      const orphanedSessions = await Session.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $match: {
            user: { $size: 0 }
          }
        },
        {
          $limit: config.batchSize
        }
      ]);
      
      if (orphanedSessions.length === 0) {
        return { count: 0, errors, warnings };
      }
      
      if (config.dryRun) {
        warnings.push(`DRY RUN: Would delete ${orphanedSessions.length} orphaned sessions`);
        return { count: 0, errors, warnings };
      }
      
      const sessionIds = orphanedSessions.map(session => session._id);
      const deleteResult = await Session.deleteMany({
        _id: { $in: sessionIds }
      });
      
      console.log(`👻 Cleaned up ${deleteResult.deletedCount} orphaned sessions`);
      return { count: deleteResult.deletedCount || 0, errors, warnings };
      
    } catch (error) {
      errors.push(`Failed to cleanup orphaned sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { count: 0, errors, warnings };
    }
  }
  
  /**
   * Get session cleanup statistics
   */
  static async getCleanupStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    revokedSessions: number;
    suspiciousSessions: number;
    orphanedSessions: number;
    sessionsByRisk: Record<string, number>;
    sessionsByAge: Record<string, number>;
  }> {
    try {
      await dbConnect();
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        totalSessions,
        activeSessions,
        expiredSessions,
        revokedSessions,
        suspiciousSessions,
        orphanedSessions,
        sessionsByRisk,
        sessionsByAge
      ] = await Promise.all([
        Session.countDocuments(),
        Session.countDocuments({ isActive: true, revoked: false, expiresAt: { $gt: now } }),
        Session.countDocuments({ expiresAt: { $lt: now } }),
        Session.countDocuments({ revoked: true }),
        Session.countDocuments({ 'securityContext.riskScore': { $gte: 70 } }),
        Session.aggregate([
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
          { $match: { user: { $size: 0 } } },
          { $count: 'count' }
        ]).then(result => result[0]?.count || 0),
        
        // Sessions by risk level
        Session.aggregate([
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $gte: ['$securityContext.riskScore', 70] }, then: 'high' },
                    { case: { $gte: ['$securityContext.riskScore', 40] }, then: 'medium' },
                    { case: { $gte: ['$securityContext.riskScore', 0] }, then: 'low' }
                  ],
                  default: 'unknown'
                }
              },
              count: { $sum: 1 }
            }
          }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        
        // Sessions by age
        Session.aggregate([
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $gte: ['$createdAt', oneDayAgo] }, then: 'recent' },
                    { case: { $gte: ['$createdAt', oneWeekAgo] }, then: 'week' },
                    { case: { $gte: ['$createdAt', oneMonthAgo] }, then: 'month' },
                    { case: { $lt: ['$createdAt', oneMonthAgo] }, then: 'old' }
                  ],
                  default: 'unknown'
                }
              },
              count: { $sum: 1 }
            }
          }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        )
      ]);
      
      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        revokedSessions,
        suspiciousSessions,
        orphanedSessions,
        sessionsByRisk,
        sessionsByAge
      };
      
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      throw error;
    }
  }
  
  /**
   * Schedule automatic cleanup
   */
  static scheduleAutomaticCleanup(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        console.log('🕐 Running scheduled session cleanup...');
        const result = await this.performCleanup();
        console.log('✅ Scheduled cleanup completed:', result);
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
      }
    }, intervalMs);
    
    console.log(`⏰ Scheduled automatic cleanup every ${intervalHours} hours`);
  }
}

export default SessionCleanup;
