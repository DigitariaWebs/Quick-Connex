import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import AuditLog, { AuditAction, AuditCategory } from '@/models/AuditLog';

/**
 * GET /api/admin/users/[id]/login-history
 * 
 * Get user login history from AuditLog
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    // Build query
    const query = {
      actorId: id,
      action: { $in: [AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED] },
      category: AuditCategory.AUTHENTICATION
    };
    
    // Query AuditLog for login history and total count in parallel
    const [loginHistory, total] = await Promise.all([
      DatabaseService.findMany(AuditLog, query, {
        sort: { timestamp: -1 },
        limit
      }),
      DatabaseService.count(AuditLog, query)
    ]);
    
    // Transform to match expected format
    const formatted = loginHistory.map(log => ({
      timestamp: log.timestamp,
      success: log.action === AuditAction.LOGIN_SUCCESS,
      ipAddress: log.requestInfo.ipAddress,
      userAgent: log.requestInfo.userAgent,
      description: log.description
    }));
    
    return NextResponse.json({
      success: true,
      loginHistory: formatted,
      total
    });
    
  } catch (error) {
    console.error('Error fetching login history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch login history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

