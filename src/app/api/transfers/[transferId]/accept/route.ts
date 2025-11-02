/**
 * Transfer Acceptance API
 * 
 * This endpoint handles transfer acceptance by employees.
 * Employees can accept transfers that have been approved by admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';
import { TimelineService, TransferUpdateService, ActorInfo, TransferStatus } from '@/lib/transfers';
import TransferNotificationService from '@/lib/communication/integrations/TransferNotificationService';
import { extractRequestInfo } from '@/lib/audit/utils/request';
import { log } from '@/lib/logging';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { transferId } = await params;
  
  try {
    const body = await request.json();
    const { assignedTo, notes } = body;

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    if (!assignedTo) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // Only employees can accept transfers
    if (user.userType !== 'employee') {
      return NextResponse.json({ error: 'Only employees can accept transfers' }, { status: 403 });
    }

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

    // Check if transfer is in the correct status for acceptance
    if (transfer.status !== TransferStatus.ACCEPTED) {
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

    // Extract request info for audit logging
    const requestInfo = extractRequestInfo(request);

    const actor: ActorInfo = {
      id: user._id as any,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      userType: user.userType as 'admin' | 'manager' | 'employee'
    };

    const transferIdString = transfer.transferId || transferId;

    // Create acceptance event with audit logging
    await TimelineService.createEventWithAudit(
      {
        type: 'accepted',
        title: 'Transfer Accepted',
        description: `${actor.name} has accepted the transfer assignment`,
        actor,
        metadata: {
          details: 'Employee has accepted responsibility for this transfer',
          assignedTo: {
            id: employee._id,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email
          }
        }
      },
      transferIdString,
      requestInfo
    );

    // Assign transfer using centralized service
    await TransferUpdateService.assignTransfer(
      transfer,
      employee._id as any,
      {
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      },
      actor,
      notes || 'Transfer accepted by employee',
      requestInfo
    );

    // Update transfer status using centralized service
    await TransferUpdateService.updateStatus(
      transfer,
      TransferStatus.IN_PROGRESS,
      actor,
      'Transfer accepted and started by employee',
      requestInfo
    );

    // Track acceptance timestamp
    transfer.acceptedAt = new Date();
    await transfer.save();

    // Send notifications
    try {
      // Send email/SMS notifications
      await TransferNotificationService.sendTransferAcceptedNotification(transfer, user);
      
      // Note: Real-time notifications are now handled by the global SSE system
      log.info('Transfer accepted - real-time notifications handled by global SSE system', {
        category: 'transfer',
        operation: 'accept_transfer',
        transferId,
        userId: user._id?.toString()
      });
      
    } catch (notificationError) {
      log.error('Error sending acceptance notifications', notificationError, {
        category: 'transfer',
        operation: 'accept_notifications',
        transferId,
        userId: user._id?.toString()
      });
      // Don't fail the acceptance if notifications fail
    }

    return NextResponse.json({
      success: true,
      data: {
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
      }
    });

  } catch (error) {
    log.error('Error accepting transfer', error, {
      category: 'transfer',
      operation: 'accept_transfer',
      transferId
    });
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
  const { transferId } = await params;
  
  try {
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

    // Check if user has permission to view this transfer
    if (user.userType === 'employee' && transfer.status === TransferStatus.PENDING) {
      return NextResponse.json({ error: 'Access denied: Cannot view pending transfers' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
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
          canAccept: transfer.status === TransferStatus.ACCEPTED && user.userType === 'employee'
        }
      }
    });

  } catch (error) {
    log.error('Error fetching transfer acceptance info', error, {
      category: 'transfer',
      operation: 'get_accept_info',
      transferId
    });
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
