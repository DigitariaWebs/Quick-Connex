import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateStatusTransition, calculateTransferDuration } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';

// PUT /api/transfers/[id]/complete - Complete a transfer (assigned employee only)
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
    const { notes, completionNotes } = body;

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return createErrorResponse('Transfer request not found', 'TRANSFER_NOT_FOUND', 404);
    }

    // Validate status transition
    if (!validateStatusTransition(transfer.status, 'completed')) {
      return createErrorResponse(
        'Invalid status transition', 
        'INVALID_STATUS_TRANSITION', 
        400,
        { 
          currentStatus: transfer.status, 
          requestedStatus: 'completed',
          allowedTransitions: ['in_progress', 'cancelled']
        }
      );
    }

    // Any employee can complete an in-progress transfer

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status
    transfer.status = 'completed';
    transfer.completedDate = new Date();
    transfer.lastModifiedBy = authResult.user._id;
    
    // Calculate actual duration
    const actualDuration = calculateTransferDuration(transfer.requestedDate, new Date());
    transfer.actualDuration = actualDuration;
    
    // Add completion notes
    if (completionNotes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\nCompleted: ${completionNotes}` : `Completed: ${completionNotes}`;
    }
    if (notes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\n${notes}` : notes;
    }

    await transfer.save();

    // Note: Patient information is embedded in transfer.patientInfo
    // No separate Patient model update needed

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
          'completed',
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
      await TransferSMSService.sendTransferCompletedSMS(populatedTransfer, authResult.user);
    } catch (smsError) {
      console.error('Error sending SMS notification:', smsError);
    }

    return createSuccessResponse({
      ...populatedTransfer.toObject(),
      actualDuration
    }, 'Transfer completed successfully');

  } catch (error) {
    console.error('Error completing transfer:', error);
    return createErrorResponse('Failed to complete transfer', 'COMPLETE_ERROR', 500);
  }
}