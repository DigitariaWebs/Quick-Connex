/**
 * Timeline Controller
 * 
 * Handles timeline operations for transfers including events, stats, and recent activity.
 */

import { Response } from 'express';
import { TimelineService } from '@/lib/transfers';
import { ResponseBuilder } from '@/utils/response.util';
import { TimelineQueryOptions } from '@/types/transfers/timeline.types';
import { AuthenticatedRequest } from '@/types';

/**
 * GET /transfers/:transferId/timeline - Get timeline for a specific transfer
 */
export async function getTimeline(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    const {
      page = '1',
      limit = '50',
      startDate,
      endDate,
      eventType,
      actorType
    } = req.query;

    // Build query options
    const queryOptions: TimelineQueryOptions = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      filters: {
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(eventType && { eventType: eventType as string }),
        ...(actorType && { actorType: actorType as string })
      }
    };

    const result = await TimelineService.getTimelineForTransfer(transferId, queryOptions);

    if (result.success && result.data) {
      return ResponseBuilder.paginated(
        res,
        result.data.items,
        {
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          total: result.data.pagination.total,
          totalPages: result.data.pagination.totalPages,
          hasNext: result.data.pagination.hasNext,
          hasPrev: result.data.pagination.hasPrev
        },
        {
          transferId,
          filters: queryOptions.filters
        }
      );
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch timeline');
    }
  } catch (error) {
    console.error('Error in getTimeline controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /timeline/transfer/:transferId - Alternative endpoint for timeline
 */
export async function getTransferTimeline(req: AuthenticatedRequest, res: Response): Promise<Response> {
  // Delegate to the main getTimeline function
  return getTimeline(req, res);
}

/**
 * GET /timeline/transfer/:transferId/stats - Get timeline statistics
 */
export async function getTimelineStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    const result = await TimelineService.getTimelineStats(transferId);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, {
        transferId,
        stats: result.data.stats,
        generatedAt: new Date()
      });
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch timeline statistics');
    }
  } catch (error) {
    console.error('Error in getTimelineStats controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /timeline/recent - Get recent activity across all transfers
 */
export async function getRecentActivity(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const {
      page = '1',
      limit = '20',
      days = '7'
      // eventType,
      // actorType
    } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string, 10));

    // Build query options for recent activity
    // const queryOptions: TimelineQueryOptions = {
    //   page: parseInt(page as string, 10),
    //   limit: parseInt(limit as string, 10),
    //   filters: {
    //     startDate,
    //     endDate,
    //     ...(eventType && { eventType: eventType as string }),
    //     ...(actorType && { actorType: actorType as string })
    //   }
    // };

    // This would require a new method in TimelineService for recent activity
    // For now, we'll return a placeholder response
    return ResponseBuilder.success(res, {
      activities: [],
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      period: {
        startDate,
        endDate,
        days: parseInt(days as string, 10)
      },
      message: 'Recent activity endpoint not fully implemented yet'
    });
  } catch (error) {
    console.error('Error in getRecentActivity controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}
