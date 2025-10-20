/**
 * Transfer Acceptance API
 * 
 * This endpoint handles transfer acceptance by employees.
 * Employees can accept transfers that have been approved by admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import TimelineService from '@/lib/services/timeline-service';
import TransferNotificationService from '@/lib/communication/integrations/transfer-notification-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
    const body = await request.json();
    const { assignedTo, notes } = body;

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    if (!assignedTo) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    // Only employees can accept transfers
    if (user.userType !== 'employee') {
      return NextResponse.json({ error: 'Only employees can accept transfers' }, { status: 403 });
    }

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email phone userType')
      .populate('assignedTo', 'firstName lastName email phone userType') as any;

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if transfer is in the correct status for acceptance
    if (transfer.status !== 'accepted') {
      return NextResponse.json(
        { error: `Transfer cannot be accepted. Current status: ${transfer.status}` },
        { status: 400 }
      );
    }

    // Check if transfer is already assigned to someone else
    if (transfer.assignedTo && transfer.assignedTo.toString() !== assignedTo) {
      return NextResponse.json(
        { error: 'Transfer is already assigned to another employee' },
        { status: 400 }
      );
    }

    // Verify the employee exists
    const employee = await User.findById(assignedTo);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Create timeline events for acceptance
    const acceptanceEvent = TimelineService.createAcceptanceEvent({
      id: user._id as any,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userType: 'employee'
    });

    const assignmentEvent = TimelineService.createAssignmentEvent(
      {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: 'employee'
      },
      {
        id: employee._id as any,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      },
      notes || 'Transfer accepted by employee'
    );

    const statusChangeEvent = TimelineService.createStatusChangeEvent(
      {
        id: user._id as any,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userType: 'employee'
      },
      'accepted',
      'in_progress',
      'Transfer accepted and started by employee'
    );

    // Update transfer
    transfer.assignedTo = employee._id as any;
    transfer.status = 'in_progress';
    transfer.acceptedAt = new Date(); // Track when transfer was accepted
    transfer.lastModifiedBy = user._id as any;
    
    // Add to status history
    transfer.statusHistory.push({
      status: 'in_progress',
      changedBy: user._id as any,
      changedAt: new Date(),
      reason: notes || 'Transfer accepted by employee'
    });

    // Add timeline events
    if (!transfer.timeline) {
      transfer.timeline = [];
    }
    transfer.timeline.push(acceptanceEvent, assignmentEvent, statusChangeEvent);

    await transfer.save();

    // Send notifications
    try {
      // Send email/SMS notifications
      await TransferNotificationService.sendTransferAcceptedNotification(transfer, user);
      
      // Note: Real-time notifications are now handled by the global SSE system
      console.log('✅ Transfer accepted - real-time notifications handled by global SSE system');
      
    } catch (notificationError) {
      console.error('Error sending acceptance notifications:', notificationError);
      // Don't fail the acceptance if notifications fail
    }

    return createSuccessResponse({
      success: true,
      message: 'Transfer accepted successfully',
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        status: transfer.status,
        assignedTo: {
          id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email
        },
        acceptedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error accepting transfer:', error);
    return handleAuthError(error);
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
    const { user } = await requireEmployeeOrManager();

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email phone userType')
      .populate('assignedTo', 'firstName lastName email phone userType') as any;

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // Check if user has permission to view this transfer
    if (user.userType === 'employee' && transfer.status === 'pending') {
      return NextResponse.json({ error: 'Access denied: Cannot view pending transfers' }, { status: 403 });
    }

    return createSuccessResponse({
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        status: transfer.status,
        assignedTo: transfer.assignedTo ? {
          id: transfer.assignedTo._id,
          name: transfer.assignedTo.firstName && transfer.assignedTo.lastName 
            ? `${transfer.assignedTo.firstName} ${transfer.assignedTo.lastName}`
            : 'Unknown User',
          email: transfer.assignedTo.email || 'Unknown Email'
        } : null,
        canAccept: transfer.status === 'accepted' && user.userType === 'employee'
      }
    });

  } catch (error) {
    console.error('Error fetching transfer acceptance info:', error);
    return handleAuthError(error);
  }
}
