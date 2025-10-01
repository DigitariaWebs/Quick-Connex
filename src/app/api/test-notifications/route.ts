import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth-middleware';
import { NotificationSSEService } from '@/lib/notification-sse-service';

// POST /api/test-notifications - Trigger test notifications for SSE testing
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { notificationType = 'test' } = body;
    const userId = authResult.user._id;
    const userName = `${authResult.user.firstName} ${authResult.user.lastName}`;

    // Get the SSE service
    const sseService = NotificationSSEService.getInstance();

    if (!sseService) {
      return NextResponse.json(
        { error: 'SSE service not available' },
        { status: 503 }
      );
    }

    // Create test notifications based on type
    switch (notificationType) {
      case 'test':
        // Send a simple test notification
        sseService.sendToUser(userId, {
          id: `test_${Date.now()}`,
          type: 'test_notification',
          priority: 'medium',
          title: 'SSE Test Notification',
          message: `Hello ${userName}! This is a test notification from the SSE system.`,
          timestamp: new Date().toISOString(),
          read: false,
          data: {
            testType: 'sse_verification',
            triggeredBy: userName,
            timestamp: new Date().toISOString()
          }
        });
        break;

      case 'transfer_status':
        // Simulate a transfer status change
        sseService.sendToUser(userId, {
          id: `transfer_test_${Date.now()}`,
          type: 'transfer_status_change',
          priority: 'high',
          title: 'Transfer Status Updated',
          message: `Test transfer status changed to "in_progress" by ${userName}`,
          transferId: 'TEST-001',
          timestamp: new Date().toISOString(),
          read: false,
          data: {
            transfer: {
              id: 'test_transfer_123',
              transferId: 'TEST-001',
              patient: { firstName: 'Test', lastName: 'Patient' },
              fromHospital: 'Test Hospital A',
              toHospital: 'Test Hospital B',
              status: 'in_progress',
              oldStatus: 'pending'
            },
            changedBy: {
              id: userId,
              name: userName,
              userType: authResult.user.userType
            }
          }
        });
        break;

      case 'urgent':
        // Simulate an urgent notification
        sseService.sendToUser(userId, {
          id: `urgent_test_${Date.now()}`,
          type: 'urgent_transfer',
          priority: 'high',
          title: 'Urgent Transfer Alert',
          message: `URGENT: Test transfer requires immediate attention!`,
          transferId: 'URGENT-001',
          timestamp: new Date().toISOString(),
          read: false,
          data: {
            transfer: {
              id: 'urgent_transfer_123',
              transferId: 'URGENT-001',
              patient: { firstName: 'Urgent', lastName: 'Patient' },
              fromHospital: 'Emergency Hospital',
              toHospital: 'Trauma Center',
              priority: 'urgent'
            }
          }
        });
        break;

      case 'count_update':
        // Send notification count update
        await sseService.sendNotificationCountUpdate(userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Test notification sent successfully`,
      notificationType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

