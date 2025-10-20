import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { SessionManager } from '@/lib/session/SessionManager';

/**
 * Session Performance Monitoring API
 * 
 * Provides performance analytics and monitoring for the session system.
 * Admin-only endpoint for system monitoring.
 */

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload || !['admin', 'super_admin'].includes(tokenPayload.userType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Admin access required',
          code: 'FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // Get session pool statistics
    const poolStats = await SessionManager.getSessionPoolStats();
    
    // Get performance analytics
    const performanceAnalytics = SessionManager.getPerformanceAnalytics();
    
    // Get session cleanup performance
    const cleanupResult = await SessionManager.cleanupExpiredSessions();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      sessionPool: {
        totalSessions: poolStats.totalSessions,
        activeSessions: poolStats.activeSessions,
        expiredSessions: poolStats.expiredSessions,
        highRiskSessions: poolStats.highRiskSessions,
        averageSessionAge: poolStats.averageSessionAge,
        sessionDistribution: poolStats.sessionDistribution || {},
        performanceMetrics: poolStats.performanceMetrics
      },
      performance: {
        averageQueryTime: performanceAnalytics.averageQueryTime,
        cacheHitRate: performanceAnalytics.cacheHitRate,
        totalQueries: performanceAnalytics.totalQueries,
        slowQueries: performanceAnalytics.slowQueries,
        cacheSize: performanceAnalytics.cacheSize,
        memoryUsage: performanceAnalytics.memoryUsage,
        queryDistribution: Object.fromEntries(performanceAnalytics.queryDistribution)
      },
      cleanup: {
        sessionsCleaned: cleanupResult.cleaned,
        cleanupTime: cleanupResult.performance,
        efficiency: cleanupResult.cleaned > 0 ? Math.round(cleanupResult.cleaned / (cleanupResult.performance / 1000)) : 0
      },
      recommendations: generatePerformanceRecommendations(poolStats, performanceAnalytics)
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get performance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate performance recommendations based on metrics
 */
function generatePerformanceRecommendations(poolStats: any, analytics: any): string[] {
  const recommendations: string[] = [];
  
  // Cache performance recommendations
  if (analytics.cacheHitRate < 50) {
    recommendations.push('Consider increasing cache size or TTL for better performance');
  }
  
  if (analytics.slowQueries > analytics.totalQueries * 0.1) {
    recommendations.push('High number of slow queries detected - consider database optimization');
  }
  
  // Memory usage recommendations
  if (analytics.memoryUsage > 100) {
    recommendations.push('High memory usage detected - consider reducing cache size');
  }
  
  // Session distribution recommendations
  if (poolStats.highRiskSessions > poolStats.activeSessions * 0.2) {
    recommendations.push('High number of risky sessions - review security policies');
  }
  
  // Cleanup recommendations
  if (poolStats.expiredSessions > poolStats.totalSessions * 0.3) {
    recommendations.push('Many expired sessions - consider more frequent cleanup');
  }
  
  // Performance recommendations
  if (analytics.averageQueryTime > 500) {
    recommendations.push('Average query time is high - consider database indexing optimization');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System performance is optimal');
  }
  
  return recommendations;
}
