import { NextRequest, NextResponse } from 'next/server';
import { TimelineService } from '@/lib/timeline/TimelineService';
import { TimelineQueryOptions } from '@/types/timeline';

/**
 * GET /api/timeline/transfer/[transferId]
 * 
 * Get timeline for a specific transfer
 * Query params: page, limit, actorId, kind, startDate, endDate, isSensitive, requiresReview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const transferId = params.transferId;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const actorId = searchParams.get('actorId') || undefined;
    const kind = searchParams.get('kind') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const isSensitive = searchParams.get('isSensitive') === 'true' ? true : 
                       searchParams.get('isSensitive') === 'false' ? false : undefined;
    const requiresReview = searchParams.get('requiresReview') === 'true' ? true : 
                           searchParams.get('requiresReview') === 'false' ? false : undefined;
    
    // Validate transferId
    if (!transferId) {
      return NextResponse.json(
        { success: false, error: 'Transfer ID is required' },
        { status: 400 }
      );
    }
    
    // Build query options
    const options: TimelineQueryOptions = {
      page,
      limit,
      filters: {
        actorId,
        kind,
        startDate,
        endDate,
        isSensitive,
        requiresReview
      }
    };
    
    // Get timeline data
    const timeline = await TimelineService.getTransferTimeline(transferId, options);
    
    return NextResponse.json({
      success: true,
      data: timeline
    });
    
  } catch (error) {
    console.error('Error fetching transfer timeline:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer timeline' },
      { status: 500 }
    );
  }
}

