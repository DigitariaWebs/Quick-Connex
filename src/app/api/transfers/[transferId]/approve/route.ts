/**
 * Transfer Approval API
 * 
 * This endpoint handles transfer approval by admin users.
 * Can only be accessed via admin dashboard (POST requests).
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
// Removed AdminService - using simple manager role check instead
import TransferNotificationService from '@/lib/communication/integrations/TransferNotificationService';
import { TimelineService, TransferUpdateService, ActorInfo, TransferStatus } from '@/lib/transfers';
import { extractRequestInfo } from '@/lib/audit/utils/request';
import { log } from '@/lib/logging';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { transferId } = await params;
  
  try {
    const body = await request.json();
    const { adminEmail, reason = 'Approved by administrator' } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    // DatabaseService handles connection automatically
// Find the transfer
    const transfer = await DatabaseService.findById(Transfer, transferId, {
      populate: [
        { path: 'requestedBy', select: 'firstName lastName email phone userType' }
      ]
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json(
        { error: `Transfer is already ${transfer.status}` },
        { status: 400 }
      );
    }

    // Find the admin user
    const admin = await DatabaseService.findOne(User, { email: adminEmail });
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if user is an admin
    if (!['admin', 'super_admin'].includes(admin.userType)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Extract request info for audit logging
    const requestInfo = extractRequestInfo(request);

    const actor: ActorInfo = {
      id: admin._id as any,
      name: `${admin.firstName} ${admin.lastName}`,
      email: admin.email,
      userType: (admin.userType === 'super_admin' ? 'admin' : admin.userType) as 'admin' | 'manager' | 'employee'
    };

    // Update transfer status using centralized service
    // This handles validation, status update, status history, and audit logging
    // Pass 'approved' as customEventType to create an "approved" event instead of "status_changed"
    await TransferUpdateService.updateStatus(
      transfer,
      TransferStatus.ACCEPTED,
      actor,
      reason,
      requestInfo,
      'approved' // Use 'approved' event type instead of 'status_changed'
    );

    // Send notifications (email + SMS) to manager and all approved employees
    try {
      await TransferNotificationService.sendTransferApprovedNotification(transfer, admin);
      log.info('Transfer approved - notifications dispatched', {
        category: 'transfer',
        operation: 'approve_transfer',
        transferId,
        adminId: admin._id?.toString()
      });
    } catch (notifyError) {
      log.error('Failed to send transfer approved notifications', notifyError, {
        category: 'transfer',
        operation: 'approve_notifications',
        transferId,
        adminId: admin._id?.toString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer approved successfully',
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        status: transfer.status,
        approvedBy: admin.email,
        approvedAt: new Date()
      }
    });

  } catch (error) {
    log.error('Error approving transfer', error, {
      category: 'transfer',
      operation: 'approve_transfer',
      transferId
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}