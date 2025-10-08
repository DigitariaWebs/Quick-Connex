/**
 * Transfer Rejection API
 * 
 * This endpoint handles transfer rejection by admin users.
 * Can be accessed via email link or direct API call.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
import AdminService from '@/lib/services/admin-service';
import { CommunicationService } from '@/lib/communication/communication-service';
import { EmailMessage } from '@/types/communication-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    console.log('Rejection endpoint called');
    const { transferId } = await params;
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('admin') || 'system@admin.com';
    const reason = searchParams.get('reason') || 'Rejected by administrator';

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
    const isAdmin = await AdminService.isAdmin((admin._id as any).toString());
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Update transfer status to cancelled (rejected)
    transfer.status = 'cancelled';
    transfer.lastModifiedBy = admin._id as any;
    transfer.statusHistory.push({
      status: 'cancelled',
      changedBy: admin._id as any,
      changedAt: new Date(),
      reason: reason
    });

    await transfer.save();

    // Send rejection notification to manager
    try {
      // await sendTransferRejectionNotification(transfer, admin, reason);
    } catch (notificationError) {
      console.error('Error sending rejection notification:', notificationError);
      // Don't fail the rejection if notifications fail
    }

    // Return success response with redirect
    const redirectUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/approval-success?message=transfer-rejected&transferId=${transferId}`;
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));

  } catch (error) {
    console.error('Error rejecting transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const { transferId } = await params;
    const body = await request.json();
    const { adminEmail, reason = 'Rejected by administrator' } = body;

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

    // Check if user is admin
    const isAdmin = await AdminService.isAdmin((admin._id as any).toString());
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Update transfer status to cancelled (rejected)
    transfer.status = 'cancelled';
    transfer.lastModifiedBy = admin._id as any;
    transfer.statusHistory.push({
      status: 'cancelled',
      changedBy: admin._id as any,
      changedAt: new Date(),
      reason: reason
    });

    await transfer.save();

    // Send rejection notification to manager
    try {
      // await sendTransferRejectionNotification(transfer, admin, reason);
    } catch (notificationError) {
      console.error('Error sending rejection notification:', notificationError);
      // Don't fail the rejection if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer rejected successfully',
      transfer: {
        id: transfer._id,
        transferId: transfer.transferId,
        status: transfer.status,
        rejectedBy: admin.email,
        rejectedAt: new Date(),
        reason: reason
      }
    });

  } catch (error) {
    console.error('Error rejecting transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send transfer rejection notification to manager
 */
async function sendTransferRejectionNotification(transfer: any, admin: any, reason: string): Promise<void> {
  try {
    const communicationService = new CommunicationService();
    
    const transferData = {
      transferId: transfer.transferId,
      patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
      fromHospital: transfer.fromHospitalName,
      toHospital: transfer.toHospitalName,
      priority: transfer.priority.toUpperCase(),
      rejectedBy: `${admin.firstName} ${admin.lastName}`,
      rejectedAt: new Date().toLocaleString(),
      reason: reason
    };

    // Send email notification to manager
    const emailMessage: EmailMessage = {
      id: `transfer_rejected_email_${Date.now()}`,
      channel: 'email',
      priority: 'medium',
      status: 'pending',
      recipient: {
        email: transfer.requestedBy.email,
        name: `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`
      },
      content: {
        subject: `❌ Transfer Rejected - ${transferData.transferId}`,
        text: generateTransferRejectionEmailText(transferData),
        html: generateTransferRejectionEmailHTML(transferData)
      },
      metadata: {
        source: 'transfer_workflow',
        category: 'transfer_rejected',
        transferId: transferData.transferId
      },
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await communicationService.sendEmail(emailMessage);
    if (result.success) {
      console.log(`📧 Transfer rejection email sent to manager: ${transfer.requestedBy.email}`);
    } else {
      console.error(`❌ Failed to send transfer rejection email:`, result.error);
    }
  } catch (error) {
    console.error('❌ Error sending transfer rejection notification:', error);
  }
}

/**
 * Generate email text for transfer rejection
 */
function generateTransferRejectionEmailText(transferData: any): string {
  return `
❌ TRANSFER REJECTED

Your transfer request has been rejected by the administrator.

Transfer Details:
- Transfer ID: ${transferData.transferId}
- Patient: ${transferData.patientName}
- From: ${transferData.fromHospital}
- To: ${transferData.toHospital}
- Priority: ${transferData.priority}

Rejection Details:
- Rejected by: ${transferData.rejectedBy}
- Rejected at: ${transferData.rejectedAt}
- Reason: ${transferData.reason}

If you have any questions about this rejection, please contact the administrator.

You can create a new transfer request if needed.
  `.trim();
}

/**
 * Generate email HTML for transfer rejection
 */
function generateTransferRejectionEmailHTML(transferData: any): string {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <title>Transfer Rejected - ${transferData.transferId}</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .transfer-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
          .rejection-info { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>❌ TRANSFER REJECTED</h1>
              <p>Transfer ID: ${transferData.transferId}</p>
          </div>
          
          <div class="content">
              <p>Your transfer request has been rejected by the administrator.</p>
              
              <div class="transfer-info">
                  <h3>Transfer Details</h3>
                  <p><strong>Patient:</strong> ${transferData.patientName}</p>
                  <p><strong>From:</strong> ${transferData.fromHospital}</p>
                  <p><strong>To:</strong> ${transferData.toHospital}</p>
                  <p><strong>Priority:</strong> ${transferData.priority}</p>
              </div>
              
              <div class="rejection-info">
                  <h3>Rejection Details</h3>
                  <p><strong>Rejected by:</strong> ${transferData.rejectedBy}</p>
                  <p><strong>Rejected at:</strong> ${transferData.rejectedAt}</p>
                  <p><strong>Reason:</strong> ${transferData.reason}</p>
              </div>
              
              <p>If you have any questions about this rejection, please contact the administrator.</p>
              <p><strong>You can create a new transfer request if needed.</strong></p>
          </div>
          
          <div class="footer">
              <p>This is an automated notification from the Patient Management System.</p>
          </div>
      </div>
  </body>
  </html>
  `;
}
