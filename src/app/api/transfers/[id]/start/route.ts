import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import { validateStatusTransition } from '@/lib/transfer-validation';
import { getNotificationService } from '@/lib/socket-server';

// PUT /api/transfers/[id]/start - Start a transfer (assigned employee only)
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

    await connectDB();

    const transferId = params.id;
    const body = await request.json();
    const { notes } = body;

    // Find the transfer request
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return createErrorResponse('Transfer request not found', 'TRANSFER_NOT_FOUND', 404);
    }

    // Validate status transition
    if (!validateStatusTransition(transfer.status, 'in_progress')) {
      return createErrorResponse(
        'Invalid status transition', 
        'INVALID_STATUS_TRANSITION', 
        400,
        { 
          currentStatus: transfer.status, 
          requestedStatus: 'in_progress',
          allowedTransitions: ['accepted', 'cancelled']
        }
      );
    }

    // Check if user is assigned to this transfer (employees only)
    if (authResult.user.userType === 'employee' && transfer.assignedTo?.toString() !== authResult.user._id) {
      return createErrorResponse(
        'You are not assigned to this transfer', 
        'UNAUTHORIZED', 
        403
      );
    }

    // Store old status for notification
    const oldStatus = transfer.status;

    // Update transfer status
    transfer.status = 'in_progress';
    transfer.lastModifiedBy = authResult.user._id;
    
    if (notes) {
      transfer.notes = transfer.notes ? `${transfer.notes}\nStarted: ${notes}` : `Started: ${notes}`;
    }

    await transfer.save();

    // Populate the response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate('patient', 'patientId firstName lastName dateOfBirth gender phone currentHospital currentDepartment')
      .populate('requestedBy', 'firstName lastName email userType')
      .populate('assignedTo', 'firstName lastName email');

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      if (notificationService) {
        await notificationService.sendTransferStatusChange(
          populatedTransfer,
          oldStatus,
          'in_progress',
          authResult.user
        );
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the request if notification fails
    }

    return createSuccessResponse(populatedTransfer, 'Transfer started successfully');

  } catch (error) {
    console.error('Error starting transfer:', error);
    return createErrorResponse('Failed to start transfer', 'START_ERROR', 500);
  }
}