/**
 * Transfer Rejection API
 * 
 * This endpoint handles transfer rejection by admin users.
 * Can only be accessed via admin dashboard (POST requests).
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import Hospital from '@/models/Hospital';
// Removed AdminService - using simple manager role check instead
import { CommunicationService } from '@/lib/communication';
import { EmailMessage } from '@/lib/communication';
import { TransferStatus, TransferUpdateService, ActorInfo, TimelineService } from '@/lib/transfers';
import { extractRequestInfo } from '@/lib/audit/utils/request';
import { log } from '@/lib/logging';
import { TemplateLoader } from '@/lib/communication/templates/core/TemplateLoader';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  const { transferId } = await params;
  
  try {
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
    // Pass 'rejected' as customEventType to create a "rejected" event instead of "status_changed"
    await TransferUpdateService.updateStatus(
      transfer,
      TransferStatus.CANCELLED,
      actor,
      reason,
      requestInfo,
      'rejected' // Use 'rejected' event type instead of 'status_changed'
    );

    // Note: Notifications are disabled for in-app rejections
    // Only the transfer state is updated, no email/SMS notifications are sent
    log.info('Transfer rejected - state updated without notifications', {
      category: 'transfer',
      operation: 'reject_transfer',
      transferId: transfer.transferId || transferId,
      adminId: admin._id?.toString()
    });

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
    log.error('Error rejecting transfer', error, {
      category: 'transfer',
      operation: 'reject_transfer',
      transferId
    });
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
    const communicationService = CommunicationService.getInstance();
    
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
        html: (() => {
          const templateLoader = TemplateLoader.getInstance();
          return templateLoader.renderTemplate('email/transfer/rejected.html', transferData);
        })()
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
      log.info('Transfer rejection email sent to manager', {
        category: 'transfer',
        operation: 'reject_notification',
        recipientEmail: transfer.requestedBy.email,
        transferId: transfer.transferId
      });
    } else {
      log.error('Failed to send transfer rejection email', result.error, {
        category: 'transfer',
        operation: 'reject_notification',
        recipientEmail: transfer.requestedBy.email,
        transferId: transfer.transferId
      });
    }
  } catch (error) {
    log.error('Error sending transfer rejection notification', error, {
      category: 'transfer',
      operation: 'reject_notification',
      transferId: transfer.transferId
    });
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
