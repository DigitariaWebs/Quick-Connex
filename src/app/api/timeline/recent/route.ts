import { NextRequest, NextResponse } from 'next/server';
import { TimelineService } from '@/lib/timeline/TimelineService';
import { RecentActivityOptions } from '@/types/timeline';
import { AuditCategory } from '@/models/UnifiedAuditLog';

/**
 * GET /api/timeline/recent
 * 
 * Get recent activity across all transfers
 * Query params: limit, actorId, category, isSensitive
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const actorId = searchParams.get('actorId') || undefined;
    const category = searchParams.get('category') as AuditCategory || undefined;
    const isSensitive = searchParams.get('isSensitive') === 'true' ? true : 
                       searchParams.get('isSensitive') === 'false' ? false : undefined;
    
    // Build query options
    const options: RecentActivityOptions = {
      limit,
      filters: {
        actorId,
        category,
        isSensitive
      }
    };
    
    // Get recent activity
    const activity = await TimelineService.getRecentActivity(options);
    
    return NextResponse.json({
      success: true,
      data: {
        items: activity,
        count: activity.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activity' },
      { status: 500 }
    );
  }
}
