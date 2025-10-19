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
    const eventType = url.searchParams.get('eventType');
    const severity = url.searchParams.get('severity');
    const userId = url.searchParams.get('userId');
    const ipAddress = url.searchParams.get('ipAddress');
    const resolved = url.searchParams.get('resolved');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    console.log('📊 Getting security events...');
    
    // Get security events with filters
    const result = await SecurityLogging.getSecurityEvents({
      eventType: eventType as any,
      severity: severity as any,
      userId: userId || undefined,
      ipAddress: ipAddress || undefined,
      resolved: resolved ? resolved === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset
    });
    
    console.log('✅ Security events retrieved:', {
      total: result.total,
      returned: result.events.length,
      hasMore: result.hasMore
    });
    
    return NextResponse.json({
      success: true,
      events: result.events,
      total: result.total,
      hasMore: result.hasMore,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('❌ Failed to get security events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get security events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    const { eventId, resolvedBy, resolution } = await request.json();
    
    if (!eventId || !resolvedBy || !resolution) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: eventId, resolvedBy, resolution' 
        },
        { status: 400 }
      );
    }
    
    console.log(`🔧 Resolving security event ${eventId}...`);
    
    // Resolve the security event
    const success = await SecurityLogging.resolveEvent(eventId, resolvedBy, resolution);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to resolve security event' 
        },
        { status: 404 }
      );
    }
    
    console.log('✅ Security event resolved successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Security event resolved successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to resolve security event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to resolve security event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

