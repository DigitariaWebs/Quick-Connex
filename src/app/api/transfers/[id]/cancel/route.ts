import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateStatusTransition, isTerminalStatus } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';

// PUT /api/transfers/[id]/cancel - Cancel a transfer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const transferId = params.id;
    const body = await request.json();
    const { reason, notes } = body;

    // Validate cancellation reason
    if (!reason || reason.trim().length === 0) {
      return createErrorResponse('Cancellation reason is required', 'VALIDATION_ERROR', 400);
    }

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return createErrorResponse('Transfer request not found', 'TRANSFER_NOT_FOUND', 404);
    }

    // Check if transfer can be cancelled
    if (isTerminalStatus(transfer.status)) {
      return createErrorResponse(
        'Cannot cancel a transfer that is already completed or cancelled', 
        'INVALID_STATUS', 
        400,
        { currentStatus: transfer.status }
      );
    }

    // Validate status transition
    if (!validateStatusTransition(transfer.status, 'cancelled')) {
      return createErrorResponse(
        'Invalid status transition', 
        'INVALID_STATUS_TRANSITION', 
        400,
        { 
          currentStatus: transfer.status, 
          requestedStatus: 'cancelled'
        }
      );
    }

    // Check authorization - only assigned employee, requesting manager, or any manager can cancel
    const canCancel = 
      authResult.user.userType === 'manager' || // Any manager can cancel
      transfer.requestedBy?.toString() === authResult.user._id; // Requesting manager

    if (!canCancel) {
      return createErrorResponse(
        'You are not authorized to cancel this transfer', 
        'UNAUTHORIZED', 
        403
      );
    }

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status
    transfer.status = 'cancelled';
    transfer.lastModifiedBy = authResult.user._id;
    
    // Add cancellation notes
    const cancellationNote = `Cancelled by ${authResult.user.firstName} ${authResult.user.lastName}: ${reason}`;
    transfer.notes = transfer.notes ? `${transfer.notes}\n${cancellationNote}` : cancellationNote;
    
    if (notes) {
      transfer.notes = `${transfer.notes}\nAdditional notes: ${notes}`;
    }

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType');

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      if (notificationService) {
        await notificationService.sendTransferStatusChange(
          populatedTransfer,
          oldStatus,
          'cancelled',
          authResult.user
        );
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the request if notification fails
    }

    return createSuccessResponse(populatedTransfer, 'Transfer cancelled successfully');

  } catch (error) {
    console.error('Error cancelling transfer:', error);
    return createErrorResponse('Failed to cancel transfer', 'CANCEL_ERROR', 500);
  }
}