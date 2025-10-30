/**
 * Transfer Admin Controller
 * 
 * Administrative operations for transfer management including bulk operations and analytics.
 */

import { Response } from 'express';
import { TransferService, TimelineService } from '@/lib/transfers';
import { ResponseBuilder } from '@/utils/response.util';
import { TransferQueryOptions } from '@/types/transfers/transfer.types';
import { TransferStatus, TransferPriority } from '@/lib/transfers/core/constants';
import { AuthenticatedRequest } from '@/types';

/**
 * GET /admin/transfers - Get transfers with advanced filtering
 */
export async function getAdminTransfers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can access admin transfers');
    }

    const {
      status,
      priority,
      // category,
      fromHospital,
      toHospital,
      requestedBy,
      assignedTo,
      dateStart,
      dateEnd,
      search,
      page = '1',
      limit = '50',
      sortBy = 'requestedDate',
      sortOrder = 'desc'
    } = req.query;

    // Build advanced query options
    const queryOptions: TransferQueryOptions = {
      filter: {
        ...(status && { status: Array.isArray(status) ? status as TransferStatus[] : [status as TransferStatus] }),
        ...(priority && { priority: Array.isArray(priority) ? priority as TransferPriority[] : [priority as TransferPriority] }),
        ...(fromHospital && { fromHospital: Array.isArray(fromHospital) ? fromHospital as string[] : [fromHospital as string] }),
        ...(toHospital && { toHospital: Array.isArray(toHospital) ? toHospital as string[] : [toHospital as string] }),
        ...(requestedBy && { requestedBy: Array.isArray(requestedBy) ? requestedBy as string[] : [requestedBy as string] }),
        ...(assignedTo && { assignedTo: Array.isArray(assignedTo) ? assignedTo as string[] : [assignedTo as string] }),
        ...(search && { searchTerm: search as string }),
        ...(dateStart && { dateFrom: new Date(dateStart as string) }),
        ...(dateEnd && { dateTo: new Date(dateEnd as string) })
      },
      sort: {
        field: sortBy as 'status' | 'priority' | 'requestedDate' | 'scheduledDate' | 'patientName',
        direction: sortOrder as 'asc' | 'desc'
      },
      page: parseInt(page as string, 10),
      pageSize: parseInt(limit as string, 10)
    };

    const result = await TransferService.getTransfers(queryOptions);

    if (result.success && result.data) {
      return ResponseBuilder.paginated(
        res,
        result.data.transfers,
        {
          page: result.data.page,
          limit: result.data.pageSize,
          total: result.data.count,
          totalPages: result.data.totalPages,
          hasNext: result.data.hasNext,
          hasPrev: result.data.hasPrevious
        },
        {
          filters: queryOptions.filter,
          sort: queryOptions.sort
        }
      );
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch admin transfers');
    }
  } catch (error) {
    console.error('Error in getAdminTransfers controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /admin/transfers - Bulk operations
 */
export async function bulkOperations(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can perform bulk operations');
    }

    const { action, transferIds, reason, newStatus, newPriority, reassignTo } = req.body;

    if (!action || !transferIds || !Array.isArray(transferIds) || transferIds.length === 0) {
      return ResponseBuilder.badRequest(res, 'Action and transferIds are required');
    }

    const results = [];
    const errors = [];

    // Process each transfer
    for (const transferId of transferIds) {
      try {
        let result;
        
        switch (action) {
          case 'cancel':
            result = await TransferService.cancelTransfer(transferId, user._id, reason || 'Bulk cancellation');
            break;
          case 'update_status':
            if (!newStatus) {
              errors.push({ transferId, error: 'newStatus is required for update_status action' });
              continue;
            }
            // This would require a new method in TransferService
            errors.push({ transferId, error: 'Status update not implemented yet' });
            continue;
          case 'update_priority':
            if (!newPriority) {
              errors.push({ transferId, error: 'newPriority is required for update_priority action' });
              continue;
            }
            // This would require a new method in TransferService
            errors.push({ transferId, error: 'Priority update not implemented yet' });
            continue;
          case 'reassign':
            if (!reassignTo) {
              errors.push({ transferId, error: 'reassignTo is required for reassign action' });
              continue;
            }
            // This would require a new method in TransferService
            errors.push({ transferId, error: 'Reassignment not implemented yet' });
            continue;
          default:
            errors.push({ transferId, error: `Unknown action: ${action}` });
            continue;
        }

        if (result && result.success) {
          results.push({ transferId, success: true, data: result.data });
        } else {
          errors.push({ transferId, error: result?.error || 'Operation failed' });
        }
      } catch (error) {
        errors.push({ transferId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return ResponseBuilder.success(res, {
      action,
      totalProcessed: transferIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error in bulkOperations controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /admin/transfers/:id - Get detailed transfer information
 */
export async function getTransferDetails(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can access transfer details');
    }

    if (!id) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    const result = await TransferService.getTransferById(id);

    if (result.success && result.data) {
      const transfer = result.data.transfer;

      // Get related transfers (same patient, same hospitals, etc.)
      // This would require additional service methods
      const relatedTransfers: any[] = [];

      // Get admin-specific timeline events
      const timelineResult = await TimelineService.getTimelineForTransfer(id);
      const adminTimeline = timelineResult.success && timelineResult.data 
        ? timelineResult.data.items.filter((event: any) => 
            event.actor.userType === 'admin' || event.actor.userType === 'super_admin'
          )
        : [];

      // Get available actions based on transfer status
      const availableActions = getAvailableActions(user, transfer);

      return ResponseBuilder.success(res, {
        transfer,
        relatedTransfers,
        adminTimeline,
        availableActions,
        metadata: {
          lastViewedBy: user.email,
          lastViewedAt: new Date()
        }
      });
    } else {
      return ResponseBuilder.notFound(res, result.error || 'Transfer not found');
    }
  } catch (error) {
    console.error('Error in getTransferDetails controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * PUT /admin/transfers/:id - Update transfer with admin privileges
 */
export async function updateTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    // const { id } = req.params;
    // const updateData = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can update transfers');
    }

    // This would require a new method in TransferService for admin updates
    return ResponseBuilder.badRequest(res, 'Admin transfer update not implemented yet');
  } catch (error) {
    console.error('Error in updateTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * DELETE /admin/transfers/:id - Delete transfer
 */
export async function deleteTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    // const { id } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (user.userType !== 'super_admin') {
      return ResponseBuilder.forbidden(res, 'Only super administrators can delete transfers');
    }

    // This would require a new method in TransferService for deletion
    return ResponseBuilder.badRequest(res, 'Transfer deletion not implemented yet');
  } catch (error) {
    console.error('Error in deleteTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /admin/transfers/:id/reassign - Reassign transfer
 */
export async function reassignTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    // const { id } = req.params;
    // const { newEmployeeId, reason } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can reassign transfers');
    }

    // if (!newEmployeeId) {
    //   return ResponseBuilder.badRequest(res, 'newEmployeeId is required');
    // }

    // This would require a new method in TransferService for reassignment
    return ResponseBuilder.badRequest(res, 'Transfer reassignment not implemented yet');
  } catch (error) {
    console.error('Error in reassignTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /admin/transfers/:id/actions - Execute admin action
 */
export async function executeAdminAction(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    // const { id } = req.params;
    // const { action, ...actionData } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can execute admin actions');
    }

    // This would handle various admin actions
    return ResponseBuilder.badRequest(res, 'Admin actions not implemented yet');
  } catch (error) {
    console.error('Error in executeAdminAction controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /admin/transfers/analytics - Get transfer analytics
 */
export async function getAnalytics(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can access analytics');
    }

    const { dateFrom, dateTo } = req.query;
    
    const fromDate = dateFrom ? new Date(dateFrom as string) : undefined;
    const toDate = dateTo ? new Date(dateTo as string) : undefined;

    const result = await TransferService.getTransferStats(fromDate, toDate);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, {
        analytics: result.data.stats,
        period: {
          from: fromDate,
          to: toDate
        },
        generatedAt: new Date()
      });
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch analytics');
    }
  } catch (error) {
    console.error('Error in getAnalytics controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * Helper function to get available actions for a transfer
 */
function getAvailableActions(user: any, transfer: any): string[] {
  const actions = [];

  if (transfer.status === 'pending') {
    actions.push('approve', 'reject');
  }

  if (transfer.status === 'accepted' || transfer.status === 'in_progress') {
    actions.push('reassign', 'cancel');
  }

  if (transfer.status === 'in_progress') {
    actions.push('complete');
  }

  if (user.userType === 'super_admin') {
    actions.push('delete');
  }

  actions.push('update', 'notify');

  return actions;
}
