import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManagerWithSessionWithSession } from '@/lib/auth/session-auth-middleware';
import { unifiedSSEServer } from '@/lib/sse/unified-server-manager';

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  userType: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
  transferId?: string;
  data?: any;
  metadata?: any;
}
// Note: Real-time notifications are now handled by the global SSE system

// POST /api/test-notifications - Trigger test notifications for SSE testing
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManagerWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { notificationType = 'test' } = body;
    const userId = authResult.user._id;
    const userName = `${authResult.user.firstName} ${authResult.user.lastName}`;

    // Create test notification data based on type
    let notificationData: NotificationData;
    
    switch (notificationType) {
      case 'test':
        notificationData = {
          id: `test_${Date.now()}`,
          type: 'test_notification',
          priority: 'medium',
          title: 'SSE Test Notification',
          message: `Hello ${userName}! This is a test notification from the SSE system.`,
          userId: authResult.user._id,
          userType: authResult.user.userType,
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
          userId: authResult.user._id,
          userType: authResult.user.userType,
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
          userId: authResult.user._id,
          userType: authResult.user.userType,
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
          userId: authResult.user._id,
          userType: authResult.user.userType,
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

    // Broadcast the notification to all connected users using unified SSE server
    const broadcastCount = unifiedSSEServer.broadcastToAll(notificationData);
    
    console.log(`📡 Test Notification: Broadcasted ${notificationType} to ${broadcastCount} connected users`);

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${broadcastCount} connected users`,
      notificationType,
      notificationData,
      broadcastCount,
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

