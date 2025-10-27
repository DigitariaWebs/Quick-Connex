/**
 * Real-time Test API Route
 * 
 * Provides testing endpoints for the real-time notification system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/realtime/core';
import { SocketProvider } from '@/lib/realtime/providers';
import { AuthService } from '@/lib/auth';
import { log } from '@/lib/logging';
import { 
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_ROLES
} from '@/lib/realtime/core/constants';
import { 
  AppError,
  ValidationError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== SERVICES =====

const notificationService = NotificationService.getInstance();
const socketProvider = SocketProvider.getInstance();

// ===== TEST ENDPOINTS =====

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await AuthService.requireAuth(request);
    
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!['admin', 'super_admin'].includes(authResult.user.userType)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await getSystemStatus();
      
      case 'stats':
        return await getNotificationStats();
      
      case 'connections':
        return await getConnectionStats();
      
      default:
        return NextResponse.json({
          success: true,
          data: {
            message: 'Real-time notification system is running',
            timestamp: new Date(),
            availableActions: ['status', 'stats', 'connections']
          }
        });
    }

  } catch (error) {
    log.error('Failed to handle test request:', error);
    
    const errorInfo = formatErrorForClient(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorInfo.message,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await AuthService.requireAuth(request);
    
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!['admin', 'super_admin'].includes(authResult.user.userType)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'test_notification':
        return await sendTestNotification(data, authResult.user._id);
      
      case 'test_socket':
        return await testSocketConnection(data, authResult.user._id);
      
      case 'broadcast':
        return await broadcastTestMessage(data, authResult.user._id);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    log.error('Failed to handle test request:', error);
    
    const errorInfo = formatErrorForClient(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorInfo.message,
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

// ===== HANDLERS =====

async function getSystemStatus() {
  const status = {
    realtime: {
      status: 'running',
      timestamp: new Date()
    },
    socket: socketProvider.getConnectionStats(),
    notifications: await notificationService.getNotificationStats()
  };

  return NextResponse.json({
    success: true,
    data: status,
    timestamp: new Date()
  });
}

async function getNotificationStats() {
  const stats = await notificationService.getNotificationStats();
  
  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date()
  });
}

async function getConnectionStats() {
  const stats = socketProvider.getConnectionStats();
  
  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date()
  });
}

async function sendTestNotification(data: any, userId: string) {
  const { targetUsers, targetRoles, message } = data;
  
  const notificationData = {
    type: NOTIFICATION_TYPES.SYSTEM,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    title: 'Test Notification',
    message: message || 'This is a test notification from the admin panel',
    targetUsers: targetUsers || [],
    targetRoles: targetRoles || [USER_ROLES.ADMIN],
    data: {
      test: true,
      sentBy: userId,
      timestamp: new Date()
    }
  };

  const result = await notificationService.createAndSendNotification(
    notificationData,
    ['realtime'],
    userId
  );

  return NextResponse.json({
    success: true,
    data: {
      notification: result.notification,
      deliveries: result.results
    },
    timestamp: new Date()
  });
}

async function testSocketConnection(data: any, userId: string) {
  const { event, payload } = data;
  
  socketProvider.emitToUser(userId, event || 'test:message', {
    message: 'Test message from admin panel',
    timestamp: new Date(),
    ...payload
  });

  return NextResponse.json({
    success: true,
    message: 'Test message sent via Socket.io',
    timestamp: new Date()
  });
}

async function broadcastTestMessage(data: any, userId: string) {
  const { message, targetRole } = data;
  
  if (targetRole) {
    socketProvider.emitToRole(targetRole, 'test:broadcast', {
      message: message || 'Test broadcast from admin panel',
      timestamp: new Date(),
      sentBy: userId
    });
  } else {
    socketProvider.broadcast('test:broadcast', {
      message: message || 'Test broadcast from admin panel',
      timestamp: new Date(),
      sentBy: userId
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Test broadcast sent',
    timestamp: new Date()
  });
}
