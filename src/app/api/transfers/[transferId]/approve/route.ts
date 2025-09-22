/**
 * Transfer Approval API
 * 
 * This endpoint handles transfer approval by admin users.
 * Can be accessed via email link or direct API call.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import AdminService from '@/lib/admin-service';
import TransferNotificationService from '@/lib/communication/transfer-notification-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const { transferId } = params;
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('admin') || 'system@admin.com';
    const reason = searchParams.get('reason') || 'Approved by administrator';

    if (!transferId) {
      return NextResponse.json(
        { error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the transfer
    const transfer = await Transfer.findById(transferId)
      .populate('requestedBy', 'firstName lastName email phone userType')
      .populate('fromHospital', 'name address')
      .populate('toHospital', 'name address');

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

    // Check if user is admin
    const isAdmin = await AdminService.isAdmin(admin._id.toString());
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Update transfer status to accepted (approved)
    transfer.status = 'accepted';
    transfer.lastModifiedBy = admin._id;
    transfer.statusHistory.push({
      status: 'accepted',
      changedBy: admin._id,
      changedAt: new Date(),
      reason: reason
    });

    await transfer.save();

    // Send notifications to manager and employees
    try {
      await TransferNotificationService.sendTransferApprovedNotification(transfer, admin);
    } catch (notificationError) {
      console.error('Error sending approval notifications:', notificationError);
      // Don't fail the approval if notifications fail
    }

    // Return success response with redirect
    const redirectUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?message=transfer-approved&transferId=${transferId}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('Error approving transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { transferId: string } }
) {
  try {
    const { transferId } = params;
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
      .populate('fromHospital', 'name address')
      .populate('toHospital', 'name address');

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

    // Check if user is admin
    const isAdmin = await AdminService.isAdmin(admin._id.toString());
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Update transfer status to accepted (approved)
    transfer.status = 'accepted';
    transfer.lastModifiedBy = admin._id;
    transfer.statusHistory.push({
      status: 'accepted',
      changedBy: admin._id,
      changedAt: new Date(),
      reason: reason
    });

    await transfer.save();

    // Send notifications to manager and employees
    try {
      await TransferNotificationService.sendTransferApprovedNotification(transfer, admin);
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
