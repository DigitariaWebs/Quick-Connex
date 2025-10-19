/**
 * Session Pool
 * 
 * Clean session pooling with caching and performance monitoring.
 * Follows clean architecture principles.
 */

import { SessionCache } from './SessionCache';
import { SessionMetrics } from './SessionMetrics';
import { SessionRepository } from './SessionRepository';

export interface SessionPoolStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  highRiskSessions: number;
  averageSessionAge: number;
  sessionDistribution: Record<string, number>;
  performanceMetrics: {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    memoryUsage: number;
  };
}

export class SessionPool {
  private cache: SessionCache;
  private metrics: SessionMetrics;
  
  constructor() {
    this.cache = new SessionCache();
    this.metrics = new SessionMetrics();
  }
  
  /**
   * Get session with caching
   */
  async getSession(sessionId: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = this.cache.get(sessionId);
      if (cached) {
        this.metrics.recordCacheHit();
        this.metrics.recordQuery('cache_hit', Date.now() - startTime);
        return cached;
      }
      
      // Query database
      const session = await SessionRepository.findById(sessionId, {
        sessionId: 1,
        userId: 1,
        deviceInfo: 1,
        ipAddress: 1,
        expiresAt: 1,
        lastAccessedAt: 1,
        securityContext: 1,
        sessionType: 1,
        isPrimary: 1
      });
      
      if (session) {
        // Cache the result
        this.cache.set(sessionId, session);
        this.metrics.recordCacheMiss();
        this.metrics.recordQuery('db_query', Date.now() - startTime);
        return session;
      }
      
      return null;
      
    } catch (error) {
      console.error('Session pool query error:', error);
      this.metrics.recordQuery('error', Date.now() - startTime);
      return null;
    }
  }
  
  /**
   * Get multiple sessions efficiently
   */
  async getSessions(userId: string): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      const sessions = await SessionRepository.findByUserId(userId, {
        sessionId: 1,
        deviceInfo: 1,
        ipAddress: 1,
        createdAt: 1,
        lastAccessedAt: 1,
        expiresAt: 1,
        securityContext: 1,
        sessionType: 1,
        isPrimary: 1
      });
      
      this.metrics.recordQuery('bulk_query', Date.now() - startTime);
      return sessions;
      
    } catch (error) {
      console.error('Bulk session query error:', error);
      this.metrics.recordQuery('bulk_error', Date.now() - startTime);
      return [];
    }
  }
  
  /**
   * Get session pool statistics
   */
  async getPoolStats(): Promise<SessionPoolStats> {
    try {
      const [stats, distribution, averageAge, performanceMetrics] = await Promise.all([
        SessionRepository.getSessionStats(),
        SessionRepository.getSessionDistribution(),
        SessionRepository.getAverageSessionAge(),
        this.metrics.getMetrics()
      ]);
      
      return {
        totalSessions: stats.total,
        activeSessions: stats.active,
        expiredSessions: stats.expired,
        highRiskSessions: stats.highRisk,
        averageSessionAge: averageAge,
        sessionDistribution: distribution,
        performanceMetrics: {
          averageQueryTime: performanceMetrics.averageQueryTime,
          cacheHitRate: performanceMetrics.cacheHitRate,
          totalQueries: performanceMetrics.totalQueries,
          memoryUsage: performanceMetrics.memoryUsage
        }
      };
      
    } catch (error) {
      console.error('Error getting pool stats:', error);
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
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<{ cleaned: number; performance: number }> {
    const startTime = Date.now();
    
    try {
      const cleaned = await SessionRepository.deleteExpiredSessions();
      
      // Clear related cache entries
      this.cache.clearExpired();
      
      const performance = Date.now() - startTime;
      console.log(`🧹 Session cleanup: ${cleaned} sessions cleaned in ${performance}ms`);
      
      return { cleaned, performance };
      
    } catch (error) {
      console.error('Session cleanup error:', error);
      return { cleaned: 0, performance: Date.now() - startTime };
    }
  }
  
  /**
   * Batch update sessions for better performance
   */
  async batchUpdateSessions(sessionUpdates: Array<{ sessionId: string; updates: any }>): Promise<number> {
    const startTime = Date.now();
    
    try {
      const updated = await SessionRepository.batchUpdate(sessionUpdates);
      
      // Update cache
      sessionUpdates.forEach(({ sessionId }) => {
        this.cache.delete(sessionId);
      });
      
      this.metrics.recordQuery('batch_update', Date.now() - startTime);
      return updated;
      
    } catch (error) {
      console.error('Batch update error:', error);
      return 0;
    }
  }
  
  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): any {
    const metrics = this.metrics.getMetrics();
    const cacheStats = this.cache.getStats();
    
    return {
      ...metrics,
      cacheSize: cacheStats.size,
      cacheMaxSize: cacheStats.maxSize,
      queryDistribution: this.metrics.getQueryDistribution()
    };
  }
}

// Export singleton instance
export const sessionPool = new SessionPool();