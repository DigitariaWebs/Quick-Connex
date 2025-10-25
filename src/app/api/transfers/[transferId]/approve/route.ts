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
import TransferNotificationService from '@/lib/communication/integrations/transfer-notification-service';
import TimelineService from '@/lib/services/timeline-service';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
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

    if (transfer.status !== 'pending') {
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

    // Create timeline events for approval
    const approvalEvent = TimelineService.createApprovalEvent(
      {
        id: admin._id as any as any,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        userType: 'manager'
      },
      reason
    );

    const statusChangeEvent = TimelineService.createStatusChangeEvent(
      {
        id: admin._id as any as any,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        userType: 'manager'
      },
      'pending',
      'accepted',
      reason
    );

    // Update transfer status to accepted (approved)
    transfer.status = 'accepted';
    transfer.lastModifiedBy = admin._id as any;
    transfer.statusHistory.push({
      status: 'accepted',
      changedBy: admin._id as any,
      changedAt: new Date(),
      reason: reason
    });
    
    // Add timeline events
    if (!transfer.timeline) {
      transfer.timeline = [];
    }
    transfer.timeline.push(approvalEvent, statusChangeEvent);

    await transfer;

    // Note: Notifications are disabled for in-app approvals
    // Only the transfer state is updated, no email/SMS notifications are sent
    console.log('✅ Transfer approved - state updated without notifications');

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
    console.error('Error approving transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}