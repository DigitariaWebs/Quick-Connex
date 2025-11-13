import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { DatabaseService } from '@/lib/database';
import User from '@/models/User';
import Transfer from '@/models/Transfer';
import AuditLog from '@/models/AuditLog';
import { RecentActivity } from '@/types/dashboard/dashboard.types';

/**
 * Admin Dashboard Statistics API Endpoint
 * 
 * Provides real-time dashboard statistics from the database:
 * - User counts and pending approvals
 * - Transfer statistics
 * - System health monitoring
 * - Recent activity from audit logs
 */

// Helper function to map audit log to activity
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

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin Dashboard: Starting request');
    
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    console.log('🔍 Admin Dashboard: User type:', user.userType);
    console.log('✅ Admin Dashboard: Access granted');

    // Get current date for calculations
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch all statistics in parallel
    const [
      totalUsers,
      pendingApprovals,
      transfersToday,
      transfersTotal,
      recentAuditLogs
    ] = await Promise.all([
      // User counts
      DatabaseService.count(User, {}),
      DatabaseService.count(User, { status: 'pending' }),
      
      // Transfer counts
      DatabaseService.count(Transfer, { 
        requestedDate: { $gte: startOfToday }
      }),
      DatabaseService.count(Transfer, {}),
      
      // Recent activity (last 10 audit logs)
      DatabaseService.findMany(AuditLog, {}, {
        sort: { timestamp: -1 },
        limit: 10
      })
    ]);

    // Format recent activity
    const recentActivity: RecentActivity[] = recentAuditLogs.map((log: any) => ({
      id: log._id.toString(),
      type: mapActivityType(log.category || 'system'),
      action: formatAction(log.action || 'Unknown Action'),
      description: log.description || 'No description',
      timestamp: log.timestamp.toISOString(),
      actor: {
        id: log.adminId || log.actorId || 'unknown',
        name: log.adminName || log.actorName || 'System',
        email: log.adminEmail || log.actorEmail || 'system@example.com',
        userType: log.adminRole || log.actorType || 'system'
      },
      metadata: {
        targetId: log.targetResource?.id,
        targetType: log.targetResource?.type,
        outcome: log.outcome,
        changes: log.changes,
        ...log.metadata
      }
    }));

    // Check database health
    const dbHealthStart = Date.now();
    let dbHealth = 'operational';
    let dbLatency: number | undefined;
    try {
      await DatabaseService.count(User, { _id: { $exists: true } }, { limit: 1 });
      dbLatency = Date.now() - dbHealthStart;
    } catch (error) {
      dbHealth = 'degraded';
      dbLatency = Date.now() - dbHealthStart;
      console.warn('⚠️ Database health check failed:', error);
    }

    // Check API health (measure response time and verify we can process requests)
    const apiHealthStart = Date.now();
    let apiHealth = 'operational';
    let apiLatency: number | undefined;
    try {
      // Verify API can process requests by checking if we can access required services
      // Since we're already in the API route, we can verify by checking if auth worked
      // and if we can access the database service
      if (!user || !user.userType) {
        throw new Error('API authentication failed');
      }
      apiLatency = Date.now() - apiHealthStart;
      
      // If latency is too high, mark as degraded
      if (apiLatency > 1000) {
        apiHealth = 'degraded';
      }
    } catch (error) {
      apiHealth = 'degraded';
      apiLatency = Date.now() - apiHealthStart;
      console.warn('⚠️ API health check failed:', error);
    }

    // Calculate system health score based on both services
    const allServicesHealthy = dbHealth === 'operational' && apiHealth === 'operational';
    const systemHealthScore = allServicesHealthy ? 100 : (dbHealth === 'operational' || apiHealth === 'operational' ? 75 : 50);
    const systemHealthStatus = allServicesHealthy ? 'healthy' : (systemHealthScore >= 75 ? 'degraded' : 'down');

    // Build dashboard stats
    const dashboardStats = {
      activeUsers: 0, // Not used anymore, but keeping for compatibility
      totalUsers,
      transfersToday,
      transfersTotal,
      notificationsSent: 0, // Not used anymore, but keeping for compatibility
      pendingApprovals,
      systemHealth: {
        status: systemHealthStatus,
        uptime: process.uptime(),
        services: {
          database: {
            name: 'Database',
            status: dbHealth,
            latency: dbLatency,
            uptime: process.uptime(),
            lastCheck: new Date().toISOString()
          },
          api: {
            name: 'API Server',
            status: apiHealth,
            latency: apiLatency,
            uptime: process.uptime(),
            lastCheck: new Date().toISOString()
          }
        },
        overallScore: systemHealthScore
      },
      recentActivity,
      trends: {
        activeUsers: { current: 0, previous: 0, change: '0%', trend: 'stable' },
        transfers: { current: transfersToday, previous: 0, change: '0%', trend: 'stable' },
        notifications: { current: 0, previous: 0, change: '0%', trend: 'stable' },
        systemHealth: { current: systemHealthScore, previous: systemHealthScore, change: '0%', trend: 'stable' },
        totalUsers: { current: totalUsers, previous: 0, change: '0%', trend: 'stable' },
        pendingApprovals: { current: pendingApprovals, previous: 0, change: '0%', trend: 'stable' }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Admin Dashboard: Returning real stats', {
      totalUsers,
      pendingApprovals,
      transfersToday,
      transfersTotal
    });

    return NextResponse.json({
      success: true,
      data: dashboardStats,
      cached: false
    });

  } catch (error) {
    console.error('❌ Admin Dashboard: Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}