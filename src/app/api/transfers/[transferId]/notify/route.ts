import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer from '@/models/Transfer';
import User from '@/models/User';
import { TransferNotificationService } from '@/lib/communication/integrations/TransferNotificationService';

// POST /api/transfers/[transferId]/notify - Trigger notifications for a transfer
// This endpoint is designed for script usage and doesn't require authentication
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    // DatabaseService handles connection automatically
const { transferId } = await params;
    const body = await request.json();
    const { requestedBy } = body;
    
    // Find the transfer
    const transfer = await DatabaseService.findById(Transfer, transferId, {
      populate: [
        { path: 'requestedBy', select: 'firstName lastName email userType phone' },
        { path: 'fromHospital', select: 'name address organization' },
        { path: 'toHospital', select: 'name address organization' }
      ]
    });
    
    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }
    
    // Find the requesting user
    const requestingUser = await User.findById(requestedBy);
    if (!requestingUser) {
      return NextResponse.json(
        { error: 'Requesting user not found' },
        { status: 404 }
      );
    }
    
    console.log(`📧 Triggering notifications for transfer: ${transfer.transferId}`);
    console.log(`👤 Requested by: ${requestingUser.firstName} ${requestingUser.lastName}`);
    
    // Create notification service instance
    const notificationService = new TransferNotificationService();
    
    // Send notifications
    await notificationService.sendNewTransferRequestNotification(transfer, requestingUser);
    
    console.log('✅ Notifications sent successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      transferId: transfer.transferId,
      emailSent: true,
      smsSent: true
    });
    
  } catch (error) {
    console.error('Error triggering notifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
