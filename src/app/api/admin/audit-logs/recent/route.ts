import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-middleware';
import dbConnect from '@/lib/database/mongoose';
import AuditLog from '@/models/AuditLog';
import { RecentActivity } from '@/types/dashboard';

/**
 * Recent Activity API Endpoint
 * 
 * Provides recent admin activity from audit logs:
 * - Latest admin actions
 * - Filtered by category
 * - Paginated results
 * - Formatted for dashboard display
 */

export async function GET(request: NextRequest) {
  try {
    // Check admin permissions
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const category = searchParams.get('category'); // Optional filter

    // Build query
    const query: any = {};
    if (category) {
      query.category = category;
    }

    // Get total count
    const total = await AuditLog.countDocuments(query);

    // Get recent audit logs
    const auditLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format activity for dashboard
    const activities: RecentActivity[] = auditLogs.map((log: any) => ({
      id: log._id.toString(),
      type: mapActivityType(log.category),
      action: formatAction(log.action),
      description: log.description,
      timestamp: log.timestamp.toISOString(),
      actor: {
        id: log.adminId,
        name: log.adminName,
        email: log.adminEmail,
        userType: log.adminRole
      },
      metadata: {
        targetId: log.targetResource?.id,
        targetType: log.targetResource?.type,
        outcome: log.outcome,
        changes: log.changes,
        ...log.metadata
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Recent activity API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve recent activity',
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

/**
 * Format action name for display
 */
function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

