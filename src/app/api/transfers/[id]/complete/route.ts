import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Transfer from '@/models/Transfer';
import Patient from '@/models/Patient';
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

    await connectDB();

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

    // Update patient's current hospital
    if (transfer.patient) {
      await Patient.findByIdAndUpdate(transfer.patient, {
        currentHospital: transfer.toHospital,
        currentDepartment: transfer.toDepartment
      });
    }

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
          'completed',
          authResult.user
        );
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the request if notification fails
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