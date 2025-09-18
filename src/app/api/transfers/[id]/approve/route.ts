import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireAdmin, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateStatusTransition } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';
import TransferSMSService from '@/lib/communication/transfer-sms-service';

// PUT /api/transfers/[id]/approve - Approve a transfer request (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user - only admins can approve transfers
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const transferId = params.id;
    const body = await request.json();
    const { notes, approvedBy } = body;

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return createErrorResponse('Transfer request not found', 'TRANSFER_NOT_FOUND', 404);
    }

    // Validate status transition
    if (!validateStatusTransition(transfer.status, 'accepted')) {
      return createErrorResponse(
        'Invalid status transition', 
        'INVALID_STATUS_TRANSITION', 
        400,
        { 
          currentStatus: transfer.status, 
          requestedStatus: 'accepted',
          allowedTransitions: ['pending']
        }
      );
    }

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status to approved (accepted)
    transfer.status = 'accepted';
    transfer.lastModifiedBy = authResult.user._id;
    transfer.approvedBy = authResult.user._id;
    transfer.approvedAt = new Date();
    
    if (notes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\nApproved: ${notes}` : `Approved: ${notes}`;
    }

    // Add status history entry
    transfer.statusHistory.push({
      status: 'accepted',
      changedBy: authResult.user._id,
      changedAt: new Date(),
      reason: 'Transfer approved by admin'
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType phone')
      .populate('approvedBy', 'firstName lastName email userType');

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      if (notificationService) {
        await notificationService.sendTransferStatusChange(
          populatedTransfer,
          oldStatus,
          'accepted',
          authResult.user
        );
      }
    } catch (notificationError) {
      console.error('Error sending real-time notification:', notificationError);
    }

    // Send SMS notification to manager and employees
    try {
      await TransferSMSService.sendTransferApprovedSMS(populatedTransfer, authResult.user);
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError);
    }

    return createSuccessResponse(
      populatedTransfer, 
      'Transfer request approved successfully', 
      200
    );

  } catch (error) {
    console.error('Error approving transfer:', error);
    return createErrorResponse(
      'Failed to approve transfer request',
      'APPROVAL_ERROR',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

// DELETE /api/transfers/[id]/approve - Reject a transfer request (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user - only admins can reject transfers
    const authResult = await requireAdmin(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    const transferId = params.id;
    const body = await request.json();
    const { notes, rejectionReason } = body;

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return createErrorResponse('Transfer request not found', 'TRANSFER_NOT_FOUND', 404);
    }

    // Validate status transition
    if (!validateStatusTransition(transfer.status, 'cancelled')) {
      return createErrorResponse(
        'Invalid status transition', 
        'INVALID_STATUS_TRANSITION', 
        400,
        { 
          currentStatus: transfer.status, 
          requestedStatus: 'cancelled',
          allowedTransitions: ['pending']
        }
      );
    }

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status to rejected (cancelled)
    transfer.status = 'cancelled';
    transfer.lastModifiedBy = authResult.user._id;
    transfer.rejectedBy = authResult.user._id;
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = rejectionReason || 'Rejected by administrator';
    
    if (notes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\nRejected: ${notes}` : `Rejected: ${notes}`;
    }

    // Add status history entry
    transfer.statusHistory.push({
      status: 'cancelled',
      changedBy: authResult.user._id,
      changedAt: new Date(),
      reason: 'Transfer rejected by admin'
    });

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType phone')
      .populate('rejectedBy', 'firstName lastName email userType');

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
    } catch (notificationError) {
      console.error('Error sending real-time notification:', notificationError);
    }

    // TODO: Send SMS notification to manager about rejection
    // This would require a new SMS template for rejections

    return createSuccessResponse(
      populatedTransfer, 
      'Transfer request rejected successfully', 
      200
    );

  } catch (error) {
    console.error('Error rejecting transfer:', error);
    return createErrorResponse(
      'Failed to reject transfer request',
      'REJECTION_ERROR',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}
