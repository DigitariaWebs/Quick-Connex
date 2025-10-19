import { NextRequest, NextResponse } from 'next/server';
import { VercelNotificationService } from '@/lib/sse/VercelNotificationService';

/**
 * Create Transfer Notification
 * 
 * API endpoint to create transfer notifications.
 * Called when a new transfer is created or status changes.
 */

export async function POST(request: NextRequest) {
  try {
    const {
      transferId,
      type,
      title,
      message,
      priority = 'medium',
      targetUserTypes = ['employee', 'manager', 'admin']
    } = await request.json();

    // Validate required fields
    if (!transferId || !type || !title || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: transferId, type, title, message' 
        },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes = ['new_transfer', 'transfer_status_change', 'urgent_transfer', 'transfer_reminder'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Create notification
    const result = await VercelNotificationService.createTransferNotification(
      transferId,
      type,
      title,
      message,
      priority,
      targetUserTypes
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to create notification' 
        },
        { status: 500 }
      );
    }

    console.log('✅ Transfer notification created:', {
      id: result.notificationId,
      transferId,
      type,
      priority
    });

    return NextResponse.json({
      success: true,
      notificationId: result.notificationId,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('❌ Create notification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
