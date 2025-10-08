import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager } from '@/lib/auth/auth-middleware';
// Note: Real-time notifications are now handled by the global SSE system

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

    // Create test notification data based on type
    let notificationData;
    
    switch (notificationType) {
      case 'test':
        notificationData = {
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
        };
        break;

      case 'transfer_status':
        notificationData = {
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
        };
        break;

      case 'urgent':
        notificationData = {
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
        };
        break;

      case 'count_update':
        notificationData = {
          id: `count_update_${Date.now()}`,
          type: 'notification_count_update',
          priority: 'low',
          title: 'Notification Count Updated',
          message: 'Your notification count has been updated',
          timestamp: new Date().toISOString(),
          read: false,
          data: {
            count: Math.floor(Math.random() * 10) + 1
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Test notification data created successfully`,
      notificationType,
      notificationData,
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

