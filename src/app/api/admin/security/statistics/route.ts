import { NextRequest, NextResponse } from 'next/server';
import { SecurityLogging } from '@/lib/auth/security-logging';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const userType = request.headers.get('x-user-type');
    if (userType !== 'admin' && userType !== 'super_admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Admin access required' 
        },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    console.log('📊 Getting security statistics...');
    
    // Get security statistics
    const stats = await SecurityLogging.getSecurityStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    console.log('✅ Security statistics retrieved:', {
      totalEvents: stats.totalEvents,
      unresolvedEvents: stats.unresolvedEvents,
      criticalEvents: stats.criticalEvents
    });
    
    return NextResponse.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to get security statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get security statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

