/**
 * Transfer Cancellation API
 * 
 * This endpoint handles transfer cancellation by employees within the 4-hour window.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';import TimelineService from '@/lib/services/timeline-service';
import TransferNotificationService from '@/lib/communication/integrations/transfer-notification-service';
import { canCancelTransfer } from '@/lib/transfers/transfer-cancellation-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find the transfer
    const transfer = await DatabaseService.findById(Transfer, transferId, {
      populate: [
        { path: 'requestedBy', select: 'firstName lastName email phone userType' },
        { path: 'assignedTo', select: 'firstName lastName email phone userType' }
      ]
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if transfer can be cancelled
    if (!canCancelTransfer(transfer)) {
      return NextResponse.json(
        { error: 'Transfer cannot be cancelled. Either the 4-hour window has expired or the transfer is not in a cancellable state.' },
        { status: 400 }
      );
    }

    // Only the assigned employee or a manager/admin can cancel
    if (user.userType === 'employee') {
      // Debug logging to help identify the issue
      console.log('Debug - User ID:', user._id);
      console.log('Debug - User ID type:', typeof user._id);
      console.log('Debug - Assigned To:', transfer.assignedTo);
      console.log('Debug - Assigned To type:', typeof transfer.assignedTo);
      
      // Since assignedTo is populated, we need to compare with the _id field
      const assignedToId = transfer.assignedTo?._id?.toString();
      const userId = user._id.toString();
      
      console.log('Debug - Assigned To ID:', assignedToId);
      console.log('Debug - User ID:', userId);
      console.log('Debug - IDs match:', assignedToId === userId);
      
      // Also try comparing without toString() in case of type issues
      const assignedToIdRaw = transfer.assignedTo?._id;
      const userIdRaw = user._id;
      console.log('Debug - Raw comparison:', assignedToIdRaw?.equals?.(userIdRaw) || (assignedToIdRaw && userIdRaw && assignedToIdRaw.toString() === userIdRaw.toString()));
      
      // Try multiple comparison methods
      const isAuthorized = assignedToId === userId || 
                          assignedToIdRaw?.equals?.(userIdRaw) || 
                          (assignedToIdRaw && userIdRaw && assignedToIdRaw.toString() === userIdRaw.toString());
      
      if (!isAuthorized) {
        return NextResponse.json(
          { error: `Only the assigned employee can cancel this transfer. Assigned to: ${assignedToId}, Current user: ${userId}` },
          { status: 403 }
        );
      }
    }

    // Store previous assignment info for timeline
    const previousAssignee = transfer.assignedTo as any;
    const previousAssigneeName = previousAssignee 
      ? `${previousAssignee.firstName} ${previousAssignee.lastName}` 
      : 'Unknown';

    // Create timeline events for unassignment (returning transfer to available pool)
    const unassignmentEvent = TimelineService.createUnassignmentEvent(
      {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType as 'admin' | 'employee' | 'manager'
      },
      {
        id: previousAssignee?._id || user._id,
        name: previousAssigneeName,
        email: previousAssignee?.email || user.email
      },
      reason || 'Employee cancelled transfer - returned to available pool'
    );

    const statusChangeEvent = TimelineService.createStatusChangeEvent(
      {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: user.userType as 'admin' | 'employee' | 'manager'
      },
      'in_progress',
      'accepted',
      reason || 'Transfer returned to available pool after employee cancellation'
    );

    // Update transfer - return to accepted status and clear assignment
    transfer.status = 'accepted';
    transfer.assignedTo = undefined; // Clear assignment so other employees can take it
    transfer.lastModifiedBy = user._id as any;
    
    // Add to status history
    transfer.statusHistory.push({
      status: 'accepted',
      changedBy: user._id as any,
      changedAt: new Date(),
      reason: reason || 'Transfer returned to available pool after employee cancellation'
    });

    // Add timeline events
    if (!transfer.timeline) {
      transfer.timeline = [];
    }
    transfer.timeline.push(unassignmentEvent, statusChangeEvent);

    await transfer;

    // Send notifications
    try {
      // Note: Real-time notifications are now handled by the global SSE system
      console.log('✅ Transfer returned to available pool - real-time notifications handled by global SSE system');
      
      // TODO: Implement email/SMS notification for transfer becoming available again
      console.log('Transfer returned to available pool - SSE notification sent, email/SMS notification would be sent here');
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError);
      // Don't fail the operation if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Transfer returned to available pool. Other employees can now accept it.',
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          assignedTo: null,
          unassignedAt: new Date(),
          unassignedBy: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          },
          availableForReassignment: true
        }
      }
    });

  } catch (error) {
    console.error('Error cancelling transfer:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
// Find the transfer
    const transfer = await DatabaseService.findById(Transfer, transferId, {
      populate: [
        { path: 'requestedBy', select: 'firstName lastName email phone userType' },
        { path: 'assignedTo', select: 'firstName lastName email phone userType' }
      ]
    }) as any;

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const canCancel = canCancelTransfer(transfer);

    return NextResponse.json({
      success: true,
      data: {
        transfer: {
          id: transfer._id,
          transferId: transfer.transferId,
          status: transfer.status,
          acceptedAt: transfer.acceptedAt,
          canCancel: canCancel,
          assignedTo: transfer.assignedTo ? {
            id: transfer.assignedTo._id,
            name: transfer.assignedTo.firstName && transfer.assignedTo.lastName 
              ? `${transfer.assignedTo.firstName} ${transfer.assignedTo.lastName}`
              : 'Unknown User',
            email: transfer.assignedTo.email || 'Unknown Email'
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching transfer cancellation info:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
