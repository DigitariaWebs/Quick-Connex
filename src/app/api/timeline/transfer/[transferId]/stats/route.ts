import { NextRequest, NextResponse } from 'next/server';
import { TimelineService } from '@/lib/timeline/TimelineService';

/**
 * GET /api/timeline/transfer/[transferId]/stats
 * 
 * Get timeline statistics for a specific transfer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const transferId = params.transferId;
    
    // Validate transferId
    if (!transferId) {
      return NextResponse.json(
        { success: false, error: 'Transfer ID is required' },
        { status: 400 }
      );
    }
    
    // Get timeline statistics
    const stats = await TimelineService.getTimelineStats(transferId);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching transfer timeline stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer timeline stats' },
      { status: 500 }
    );
  }
}
