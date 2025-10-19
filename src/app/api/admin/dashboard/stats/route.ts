import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';
import { getDatabaseHealth, getDatabaseMetrics } from '@/lib/monitoring/database-monitoring-service';
import { DashboardStats } from '@/types/dashboard';

/**
 * Admin Dashboard Statistics API Endpoint
 * 
 * Provides comprehensive dashboard statistics including:
 * - Active users (SSE connections)
 * - Transfer statistics
 * - Notification counts
 * - System health
 * - Recent activity
 * - Trend data
 * 
 * This endpoint aggregates data from multiple sources to provide
 * a complete overview of the system status.
 */

// Cache dashboard data to reduce database load
let cachedData: {
  data: DashboardStats;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 10000; // 10 seconds cache

export async function GET(request: NextRequest) {
  try {
    // Use unified session validator for admin access
    const { sessionValidator } = await import('@/lib/auth/unified-session-validator');
    const validationResult = await sessionValidator.validateForAdmin(request);
    
    if (!validationResult.success) {
      return validationResult.response || NextResponse.json(
        { 
          success: false,
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        },
        { status: 403 }
      );
    }

    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        cached: true
      });
    }

    await dbConnect();

    // Calculate date ranges for trends
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Fetch all data in parallel for better performance
    const [
      sseMetrics,
      totalUsers,
      approvedUsers,
      pendingUsers,
      transfersToday,
      transfersYesterday,
      transfersTotal,
      notificationsToday,
      notificationsYesterday,
      recentActivity,
      dbHealth,
      dbMetrics
    ] = await Promise.all([
      // SSE Metrics
      Promise.resolve(unifiedSSEServer.getStats()),
      
      // User statistics
      User.countDocuments(),
      User.countDocuments({ isApproved: true }),
      User.countDocuments({ isApproved: false }),
      
      // Transfer statistics
      Transfer.countDocuments({ 
        createdAt: { $gte: today } 
      }),
      Transfer.countDocuments({ 
        createdAt: { $gte: yesterday, $lt: today } 
      }),
      Transfer.countDocuments(),
      
      // Notification statistics
      Notification.countDocuments({ 
        createdAt: { $gte: today } 
      }),
      Notification.countDocuments({ 
        createdAt: { $gte: yesterday, $lt: today } 
      }),
      
      // Recent activity from audit logs
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
      
      // Database health
      getDatabaseHealth(),
      
      // Database metrics (for connection count and latency)
      getDatabaseMetrics()
    ]);

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return { change: current > 0 ? '+100%' : '0%', trend: current > 0 ? 'up' : 'stable' as const };
      }
      const percentChange = ((current - previous) / previous) * 100;
      const sign = percentChange >= 0 ? '+' : '';
      return {
        change: `${sign}${percentChange.toFixed(1)}%`,
        trend: percentChange > 0 ? 'up' as const : percentChange < 0 ? 'down' as const : 'stable' as const
      };
    };

    const transfersTrend = calculateTrend(transfersToday, transfersYesterday);
    const notificationsTrend = calculateTrend(notificationsToday, notificationsYesterday);

    // Map database health status to service status
    const dbServiceStatus = dbHealth.status === 'healthy' ? 'operational' as const :
                            dbHealth.status === 'degraded' ? 'degraded' as const :
                            'down' as const;

    // Calculate system health score
    const dbHealthScore = dbHealth.status === 'healthy' ? 100 :
                          dbHealth.status === 'degraded' ? 75 : 25;
    const sseHealthScore = sseMetrics.totalConnections > 0 ? 100 : 95;
    const systemHealthScore = (dbHealthScore + sseHealthScore) / 2;
    
    const systemHealth = {
      status: systemHealthScore >= 95 ? 'healthy' as const :
              systemHealthScore >= 70 ? 'degraded' as const : 'down' as const,
      uptime: process.uptime(),
      services: {
        database: {
          name: 'Database',
          status: dbServiceStatus,
          latency: Math.round(dbMetrics.averageQueryTime),
          uptime: dbMetrics.uptime,
          lastCheck: new Date().toISOString(),
          metadata: {
            connections: dbMetrics.connectionPoolSize || 0,
            activeConnections: dbMetrics.activeConnections || 0,
            issues: dbHealth.issues.length > 0 ? dbHealth.issues : undefined
          }
        },
        api: {
          name: 'API Server',
          status: 'operational' as const,
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        },
        sse: {
          name: 'SSE Connections',
          status: sseMetrics.totalConnections > 0 ? 'operational' as const : 'degraded' as const,
          uptime: process.uptime(),
          lastCheck: new Date().toISOString(),
          metadata: {
            connections: sseMetrics.totalConnections,
            activeConnections: sseMetrics.totalConnections,
            quality: 'excellent'
          }
        },
        email: {
          name: 'Email Service',
          status: 'operational' as const,
          lastCheck: new Date().toISOString()
        }
      },
      overallScore: systemHealthScore
    };

    // Format recent activity
    const formattedActivity = recentActivity.map((log: any) => ({
      id: log._id.toString(),
      type: mapActivityType(log.category),
      action: log.action,
      description: log.description,
      timestamp: log.timestamp.toISOString(),
      actor: {
        id: log.adminId,
        name: log.adminName,
        email: log.adminEmail,
        userType: log.adminRole
      },
      metadata: log.metadata
    }));

    // Construct dashboard stats
    const dashboardStats: DashboardStats = {
      activeUsers: sseMetrics.totalConnections,
      totalUsers: approvedUsers,
      transfersToday: transfersToday,
      transfersTotal: transfersTotal,
      notificationsSent: notificationsToday,
      pendingApprovals: pendingUsers,
      systemHealth,
      recentActivity: formattedActivity,
      trends: {
        activeUsers: {
          current: sseMetrics.totalConnections,
          previous: 0, // Would need historical data
          change: '0%',
          trend: 'stable'
        },
        transfers: {
          current: transfersToday,
          previous: transfersYesterday,
          change: transfersTrend.change,
          trend: transfersTrend.trend as 'up' | 'down' | 'stable'
        },
        notifications: {
          current: notificationsToday,
          previous: notificationsYesterday,
          change: notificationsTrend.change,
          trend: notificationsTrend.trend as 'up' | 'down' | 'stable'
        },
        systemHealth: {
          current: systemHealthScore,
          previous: systemHealthScore, // Would need historical data
          change: '0%',
          trend: 'stable'
        }
      },
      timestamp: new Date().toISOString()
    };

    // Cache the data
    cachedData = {
      data: dashboardStats,
      timestamp: now
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats,
      cached: false
    });

  } catch (error) {
    console.error('❌ Dashboard stats API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Map audit log category to activity type
 */
function mapActivityType(category: string): 'user' | 'transfer' | 'system' | 'notification' | 'security' {
  const mapping: Record<string, 'user' | 'transfer' | 'system' | 'notification' | 'security'> = {
    'user_management': 'user',
    'transfer_management': 'transfer',
    'system_configuration': 'system',
    'data_access': 'system',
    'notification': 'notification',
    'security': 'security',
    'authentication': 'security'
  };
  
  return mapping[category] || 'system';
}

