/**
 * Transfer Approval API
 * 
 * This endpoint handles transfer approval by admin users.
 * Can be accessed via email link or direct API call.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
// Removed AdminService - using simple manager role check instead
import TransferNotificationService from '@/lib/communication/integrations/transfer-notification-service';
import TimelineService from '@/lib/services/timeline-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('admin');
    const reason = searchParams.get('reason') || 'Approved by administrator';

    if (!transferId) {
      const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent('Transfer ID is required')}&type=invalid_request`;
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email phone userType')

    if (!transfer) {
      const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent('Transfer not found')}&transferId=${transferId}&type=not_found`;
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    if (transfer.status !== 'pending') {
      const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent(`Transfer is already ${transfer.status}`)}&transferId=${transferId}&type=already_processed`;
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    // Find the admin user - try specific email first, then fall back to any manager
    let admin;
    if (adminEmail) {
      admin = await User.findOne({ email: adminEmail, userType: 'manager' });
    }
    
    // If no specific admin found or no email provided, use any available manager
    if (!admin) {
      admin = await User.findOne({ userType: 'manager' }).sort({ createdAt: 1 }); // Get the first manager
      console.log(`⚠️ Admin email ${adminEmail || 'not provided'} not found, using fallback manager: ${admin?.email}`);
    }

    if (!admin) {
      const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent('No manager found in the system. Please ensure at least one manager account exists.')}&transferId=${transferId}&type=not_found`;
      return NextResponse.redirect(new URL(errorUrl, request.url));
    }

    // Verify user is a manager (should be true from query above, but double-check)
    if (admin.userType !== 'manager') {
      const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent('Unauthorized: Manager privileges required')}&transferId=${transferId}&type=unauthorized`;
      return NextResponse.redirect(new URL(errorUrl, request.url));
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

    await transfer.save();

    // Send notifications to manager and employees
    try {
      // Send email/SMS notifications
      await TransferNotificationService.sendTransferApprovedNotification(transfer, admin);
      
      // Note: Real-time notifications are now handled by the global SSE system
      console.log('✅ Transfer approved - real-time notifications handled by global SSE system');
      
    } catch (notificationError) {
      console.error('Error sending approval notifications:', notificationError);
      // Don't fail the approval if notifications fail
    }

    // Return success response with redirect to public success page
    const redirectUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-success?message=transfer-approved&transferId=${transferId}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('Error approving transfer:', error);
    const errorUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-error?error=${encodeURIComponent('Internal server error')}&type=server_error`;
    return NextResponse.redirect(new URL(errorUrl, request.url));
  }
}

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

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email phone userType')

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
    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Check if user is a manager (admin role)
    if (admin.userType !== 'manager') {
      return NextResponse.json(
        { error: 'Unauthorized: Manager privileges required' },
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

    await transfer.save();

    // Send notifications to manager and employees
    try {
      // Send email/SMS notifications
      await TransferNotificationService.sendTransferApprovedNotification(transfer, admin);
      
      // Note: Real-time notifications are now handled by the global SSE system
      console.log('✅ Transfer approved - real-time notifications handled by global SSE system');
      
    } catch (notificationError) {
      console.error('Error sending approval notifications:', notificationError);
      // Don't fail the approval if notifications fail
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
    console.error('Error approving transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}