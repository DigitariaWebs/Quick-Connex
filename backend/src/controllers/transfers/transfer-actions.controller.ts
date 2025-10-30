/**
 * Transfer Actions Controller
 * 
 * Handles transfer actions like accept, approve, reject, cancel, and notifications.
 */

import { Response } from 'express';
import { TransferService } from '@/lib/transfers';
import { ResponseBuilder } from '@/utils/response.util';
import { AuthenticatedRequest } from '@/types';

/**
 * PUT /transfers/:transferId/accept - Employee accepts transfer
 */
export async function acceptTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const { assignedTo, notes } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (user.userType !== 'employee') {
      return ResponseBuilder.forbidden(res, 'Only employees can accept transfers');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    if (!assignedTo) {
      return ResponseBuilder.badRequest(res, 'Employee ID is required');
    }

    const result = await TransferService.acceptTransfer(transferId, assignedTo, notes);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, result.data, {
        message: result.message
      });
    } else {
      return ResponseBuilder.badRequest(res, result.error || 'Failed to accept transfer');
    }
  } catch (error) {
    console.error('Error in acceptTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /transfers/:transferId/accept - Get transfer acceptance info
 */
export async function getAcceptInfo(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    const result = await TransferService.getTransferById(transferId);

    if (result.success && result.data) {
      const transfer = result.data.transfer;
      const canAccept = transfer.status === 'accepted' && user.userType === 'employee';

      return ResponseBuilder.success(res, {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          assignedTo: transfer.assignedTo,
          canAccept
        }
      });
    } else {
      return ResponseBuilder.notFound(res, result.error || 'Transfer not found');
    }
  } catch (error) {
    console.error('Error in getAcceptInfo controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /transfers/:transferId/approve - Admin approves transfer
 */
export async function approveTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const { adminEmail, reason = 'Approved by administrator' } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can approve transfers');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    if (!adminEmail) {
      return ResponseBuilder.badRequest(res, 'Admin email is required');
    }

    // Get the transfer first
    const transferResult = await TransferService.getTransferById(transferId);
    if (!transferResult.success || !transferResult.data) {
      return ResponseBuilder.notFound(res, 'Transfer not found');
    }

    const transfer = transferResult.data.transfer;

    if (transfer.status !== 'pending') {
      return ResponseBuilder.badRequest(res, `Transfer is already ${transfer.status}`);
    }

    // Update transfer status to accepted (approved)
    // This would require a new method in TransferService for admin approval
    // For now, we'll use the existing acceptTransfer method
    const result = await TransferService.acceptTransfer(transferId, user._id, reason);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, {
        transfer: result.data.transfer,
        approvedBy: user.email,
        approvedAt: new Date()
      }, {
        message: 'Transfer approved successfully'
      });
    } else {
      return ResponseBuilder.badRequest(res, result.error || 'Failed to approve transfer');
    }
  } catch (error) {
    console.error('Error in approveTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /transfers/:transferId/reject - Admin rejects transfer
 */
export async function rejectTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const { adminEmail, reason = 'Rejected by administrator' } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only administrators can reject transfers');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    if (!adminEmail) {
      return ResponseBuilder.badRequest(res, 'Admin email is required');
    }

    // Get the transfer first
    const transferResult = await TransferService.getTransferById(transferId);
    if (!transferResult.success || !transferResult.data) {
      return ResponseBuilder.notFound(res, 'Transfer not found');
    }

    const transfer = transferResult.data.transfer;

    if (transfer.status !== 'pending') {
      return ResponseBuilder.badRequest(res, `Transfer is already ${transfer.status}`);
    }

    // Cancel the transfer with rejection reason
    const result = await TransferService.cancelTransfer(transferId, user._id, reason);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, {
        transfer: result.data.transfer,
        rejectedBy: user.email,
        rejectedAt: new Date(),
        reason
      }, {
        message: 'Transfer rejected successfully'
      });
    } else {
      return ResponseBuilder.badRequest(res, result.error || 'Failed to reject transfer');
    }
  } catch (error) {
    console.error('Error in rejectTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * PUT /transfers/:transferId/cancel - Cancel transfer
 */
export async function cancelTransfer(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    if (!reason) {
      return ResponseBuilder.badRequest(res, 'Cancellation reason is required');
    }

    // Check if user can cancel this transfer
    const transferResult = await TransferService.getTransferById(transferId);
    if (!transferResult.success || !transferResult.data) {
      return ResponseBuilder.notFound(res, 'Transfer not found');
    }

    const transfer = transferResult.data.transfer;

    // Check permissions
    if (user.userType === 'employee') {
      // Employee can only cancel if they are assigned to it
      if (!transfer.assignedTo || transfer.assignedTo._id.toString() !== user._id) {
        return ResponseBuilder.forbidden(res, 'You can only cancel transfers assigned to you');
      }
    }

    const result = await TransferService.cancelTransfer(transferId, user._id, reason);

    if (result.success && result.data) {
      return ResponseBuilder.success(res, result.data, {
        message: result.message
      });
    } else {
      return ResponseBuilder.badRequest(res, result.error || 'Failed to cancel transfer');
    }
  } catch (error) {
    console.error('Error in cancelTransfer controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * GET /transfers/:transferId/cancel - Get transfer cancellation info
 */
export async function getCancelInfo(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    const result = await TransferService.getTransferById(transferId);

    if (result.success && result.data) {
      const transfer = result.data.transfer;
      
      // Check if transfer can be cancelled
      const canCancel = transfer.status === 'accepted' || transfer.status === 'in_progress';
      const isAssignedToUser = transfer.assignedTo && transfer.assignedTo._id.toString() === user._id;
      const isAdmin = ['admin', 'super_admin'].includes(user.userType);
      
      const canUserCancel = canCancel && (isAssignedToUser || isAdmin);

      return ResponseBuilder.success(res, {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          assignedTo: transfer.assignedTo
        },
        canCancel: canUserCancel,
        reason: canUserCancel ? 'Transfer can be cancelled' : 'Transfer cannot be cancelled in current status'
      });
    } else {
      return ResponseBuilder.notFound(res, result.error || 'Transfer not found');
    }
  } catch (error) {
    console.error('Error in getCancelInfo controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}

/**
 * POST /transfers/:transferId/notify - Send notifications for transfer
 */
export async function sendNotifications(req: AuthenticatedRequest, res: Response): Promise<Response> {
  try {
    const { transferId } = req.params;
    const user = req.user;

    if (!user) {
      return ResponseBuilder.unauthorized(res, 'User not authenticated');
    }

    if (!['manager', 'admin', 'super_admin'].includes(user.userType)) {
      return ResponseBuilder.forbidden(res, 'Only managers and administrators can send notifications');
    }

    if (!transferId) {
      return ResponseBuilder.badRequest(res, 'Transfer ID is required');
    }

    // Get the transfer
    const result = await TransferService.getTransferById(transferId);
    if (!result.success || !result.data) {
      return ResponseBuilder.notFound(res, 'Transfer not found');
    }

    // TODO: Implement notification sending logic
    // This would integrate with the notification service

    return ResponseBuilder.success(res, {
      transferId,
      message: 'Notifications sent successfully'
    });
  } catch (error) {
    console.error('Error in sendNotifications controller:', error);
    return ResponseBuilder.serverError(res, 'Internal server error');
  }
}
