import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';
import Transfer, { ITransfer } from '@/models/Transfer';
import User from '@/models/User';
import { TransferNotificationService } from '@/lib/communication/integrations/TransferNotificationService';
import { log } from '@/lib/logging';

// POST /api/transfers/[transferId]/notify - Trigger notifications for a transfer
// This endpoint is designed for script usage and doesn't require authentication
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  // Extract params outside try-catch so they're available for error logging
  const { transferId } = await params;
  
  try {
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
    
    log.info('Triggering notifications for transfer', {
      category: 'transfer',
      operation: 'trigger_notifications',
      transferId: transfer.transferId,
      requestedBy: `${requestingUser.firstName} ${requestingUser.lastName}`
    });
    
    // Create notification service instance
    const notificationService = new TransferNotificationService();
    
    // Send notifications
    await notificationService.sendNewTransferRequestNotification(transfer, requestingUser);
    
    log.info('Notifications sent successfully', {
      category: 'transfer',
      operation: 'trigger_notifications',
      transferId: transfer.transferId
    });
    
    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
      transferId: transfer.transferId,
      emailSent: true,
      smsSent: true
    });
    
  } catch (error) {
    log.error('Error triggering notifications', error, {
      category: 'transfer',
      operation: 'trigger_notifications',
      transferId
    });
    return NextResponse.json(
      { 
        error: 'Failed to send notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
