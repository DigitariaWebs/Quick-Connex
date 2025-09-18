import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateStatusTransition } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';

// PUT /api/transfers/[id]/accept - Accept a transfer request
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
    const { notes } = body;

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
          allowedTransitions: ['pending', 'cancelled']
        }
      );
    }

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status
    transfer.status = 'accepted';
    transfer.lastModifiedBy = authResult.user._id;
    
    if (notes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\nAccepted: ${notes}` : `Accepted: ${notes}`;
    }

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('requestedBy', 'firstName lastName email userType phone');

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
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the request if notification fails
    }

    // Send SMS notification to manager
    try {
      const TransferSMSService = (await import('@/lib/communication/transfer-sms-service')).default;
      await TransferSMSService.sendTransferAcceptedSMS(populatedTransfer, authResult.user);
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError);
    }

    return createSuccessResponse(populatedTransfer, 'Transfer request accepted successfully');

  } catch (error) {
    console.error('Error accepting transfer:', error);
    return createErrorResponse('Failed to accept transfer request', 'ACCEPT_ERROR', 500);
  }
}
