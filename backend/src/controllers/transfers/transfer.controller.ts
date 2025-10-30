/**
 * Transfer Controller
 * 
 * Core transfer operations including CRUD and search functionality.
 */

import { Response } from 'express';
import { TransferService } from '@/lib/transfers';
import { ResponseBuilder } from '@/utils/response.util';
import { TransferQueryOptions } from '@/types/transfers/transfer.types';
import { TransferStatus, TransferPriority } from '@/lib/transfers/core/constants';
import { AuthenticatedRequest } from '@/types';

/**
 * GET /transfers - Get all transfers with filtering and pagination
 */
export async function getTransfers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const {
      status,
      priority,
      page = '1',
      limit = '20',
      sortBy = 'requestedDate',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build query options
    const queryOptions: TransferQueryOptions = {
      filter: {
        ...(status && { status: Array.isArray(status) ? status as TransferStatus[] : [status as TransferStatus] }),
        ...(priority && { priority: Array.isArray(priority) ? priority as TransferPriority[] : [priority as TransferPriority] }),
        ...(search && { searchTerm: search as string })
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
        }
      );
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch transfers');
    }
  } catch (error) {
    console.error('Error in getTransfers controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /transfers - Create a new transfer
 */
export async function createTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const transferData = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    const result = await TransferService.createTransfer(transferData, user);

    if (result.success && result.data) {
      return ResponseBuilder.created(res, result.data, {
        message: result.message
      });
    } else {
      return ResponseBuilder.badRequest(res, result.error || 'Failed to create transfer');
    }
  } catch (error) {
    console.error('Error in createTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /transfers/my-accepted - Get employee's accepted transfers
 */
export async function getMyAcceptedTransfers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (user.userType !== 'employee') {
      return ResponseBuilder.forbidden(res, 'Only employees can access their accepted transfers');
    }

    const { status } = req.query;
    const queryOptions: TransferQueryOptions = {
      filter: {
        ...(status && { status: Array.isArray(status) ? status as TransferStatus[] : [status as TransferStatus] })
      },
      page: 1,
      pageSize: 100 // Get all accepted transfers for the employee
    };

    // For my-accepted, we need to filter by assignedTo
    // This would require a custom method in TransferService
    // For now, we'll use the general getTransfers and filter in the service
    const result = await TransferService.getTransfers(queryOptions);

    if (result.success && result.data) {
      // Filter transfers where assignedTo matches the current user
      const myTransfers = result.data.transfers.filter(transfer => 
        transfer.assignedTo && transfer.assignedTo._id.toString() === user._id
      );

      return ResponseBuilder.success(res, {
        transfers: myTransfers,
        count: myTransfers.length,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          userType: user.userType
        }
      });
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to fetch my transfers');
    }
  } catch (error) {
    console.error('Error in getMyAcceptedTransfers controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /transfers/search - Search transfers
 */
export async function searchTransfers(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const {
      search,
      status,
      priority,
      page = '1',
      limit = '50'
    } = req.query;

    if (!search) {
      return ResponseBuilder.badRequest(res, 'Search query is required');
    }

    const queryOptions: TransferQueryOptions = {
      filter: {
        searchTerm: search as string,
        ...(status && { status: Array.isArray(status) ? status as TransferStatus[] : [status as TransferStatus] }),
        ...(priority && { priority: Array.isArray(priority) ? priority as TransferPriority[] : [priority as TransferPriority] })
      },
      page: parseInt(page as string, 10),
      pageSize: parseInt(limit as string, 10)
    };

    const result = await TransferService.getTransfers(queryOptions);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, {
        transfers: result.data.transfers,
        count: result.data.count,
        search: search as string
      });
    } else {
      return ResponseBuilder.serverError(res, result.error || 'Failed to search transfers');
    }
  } catch (error) {
    console.error('Error in searchTransfers controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}
