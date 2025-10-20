import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple Admin Dashboard Statistics API Endpoint
 * 
 * Provides basic dashboard statistics for testing
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin Dashboard: Starting request');
    
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value;
    console.log('🔍 Admin Dashboard: Token present:', !!token);
    
    if (!token) {
      console.log('❌ Admin Dashboard: No token found');
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Verify token
    const { verifyToken } = await import('@/lib/auth/jwt');
    const payload = await verifyToken(token);
    console.log('🔍 Admin Dashboard: Token verified:', !!payload);
    
    if (!payload) {
      console.log('❌ Admin Dashboard: Invalid token');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      );
    }

    console.log('🔍 Admin Dashboard: User type:', payload.userType);

    // Check if user is admin or super_admin
    if (payload.userType !== 'admin' && payload.userType !== 'super_admin') {
      console.log('❌ Admin Dashboard: Not admin user');
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        },
        { status: 403 }
      );
    }

    console.log('✅ Admin Dashboard: Access granted');

    // Return simple dashboard data
    const dashboardStats = {
      activeUsers: 0,
      totalUsers: 0,
      transfersToday: 0,
      transfersTotal: 0,
      notificationsSent: 0,
      pendingApprovals: 0,
      systemHealth: {
        status: 'healthy',
        uptime: process.uptime(),
        services: {
          database: {
            name: 'Database',
            status: 'operational',
            uptime: process.uptime(),
            lastCheck: new Date().toISOString()
          },
          api: {
            name: 'API Server',
            status: 'operational',
            uptime: process.uptime(),
            lastCheck: new Date().toISOString()
          }
        },
        overallScore: 100
      },
      recentActivity: [],
      trends: {
        activeUsers: { current: 0, previous: 0, change: '0%', trend: 'stable' },
        transfers: { current: 0, previous: 0, change: '0%', trend: 'stable' },
        notifications: { current: 0, previous: 0, change: '0%', trend: 'stable' },
        systemHealth: { current: 100, previous: 100, change: '0%', trend: 'stable' }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Admin Dashboard: Returning stats');

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