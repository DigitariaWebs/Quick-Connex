/**
 * Notifications API Route
 * 
 * Handles CRUD operations for notifications and Web Push subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/realtime/core';
import { PushProvider } from '@/lib/realtime/providers';
import { AuthService } from '@/lib/auth';
import { log } from '@/lib/logging';
import { 
  toStringId, 
  toStringIds, 
  toObjectId, 
  toObjectIds,
  getIdString,
  toStringIdRequired
} from '@/lib/utils/object-id';
import { 
  CreateNotificationData,
  GetNotificationsOptions
} from '@/lib/realtime/core/NotificationService';
import { 
  NotificationType,
  NotificationPriority,
  NotificationAPIResponse,
  RealtimeNotification
} from '@/lib/realtime/core/types';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  sanitizeString,
  sanitizeQueryInput 
} from '@/lib/utils/request-validation';

// ===== CONVERSION FUNCTIONS =====

/**
 * Convert RealtimeNotification to API response format
 */
function toAPIResponse(notification: RealtimeNotification): NotificationAPIResponse {
  return {
    id: toStringIdRequired(notification.id),
    type: notification.type,
    priority: notification.priority,
    title: notification.title,
    message: notification.message,
    targetUsers: toStringIds(notification.targetUsers),
    targetRoles: notification.targetRoles,
    excludeUsers: toStringIds(notification.excludeUsers),
    transferId: notification.transferId,
    data: notification.data,
    deliveries: notification.deliveries.map(delivery => ({
      userId: toStringIdRequired(delivery.userId),
      deliveredAt: delivery.deliveredAt,
      readAt: delivery.readAt,
      dismissedAt: delivery.dismissedAt,
      deliveryMethod: delivery.deliveryMethod
    })),
    settings: notification.settings,
    status: notification.status,
    deliveryAttempts: notification.deliveryAttempts,
    lastDeliveryAttempt: notification.lastDeliveryAttempt,
    createdBy: toStringId(notification.createdBy),
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt
  };
}

// ===== NOTIFICATION SERVICE =====

const notificationService = NotificationService.getInstance();
const pushProvider = PushProvider.getInstance();

// ===== GET NOTIFICATIONS =====

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await AuthService.requireAuth(request);
    
    if (!authResult.isValid || !authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = authResult.user._id;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const options: GetNotificationsOptions = {
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      type: searchParams.get('type') as any,
      priority: searchParams.get('priority') as any,
      limit: parseInt(searchParams.get('limit') || '50'),
      skip: parseInt(searchParams.get('skip') || '0')
    };

    // Get notifications
    const result = await notificationService.getUserNotifications(userId, options);

    // Convert to API format
    const apiNotifications = result.notifications.map(toAPIResponse);

    return NextResponse.json({
      success: true,
      data: {
        notifications: apiNotifications,
        total: result.total,
        unread: result.unread
      },
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to get notifications:', error);
    
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

// ===== CREATE NOTIFICATION =====

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await AuthService.requireAuth(request);
    
    if (!authResult.isValid || !authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        return await handleCreateNotification(data, authResult.user._id, request);
      
      case 'mark_read':
        return await handleMarkAsRead(data, authResult.user._id);
      
      case 'mark_dismissed':
        return await handleMarkAsDismissed(data, authResult.user._id);
      
      case 'delete':
        return await handleDeleteNotification(data, authResult.user._id, request);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    log.error('Failed to handle notification request:', error);
    
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

async function handleCreateNotification(data: CreateNotificationData, userId: string, request: NextRequest) {
  // Validate user permissions (only admins can create notifications)
  const authResult = await AuthService.requireAuth(request);
  
  if (!authResult.isValid || !authResult.user || !['admin', 'super_admin'].includes(authResult.user.userType)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Validate and sanitize data
  const notificationData: CreateNotificationData = {
    type: sanitizeString(data.type || 'system') as NotificationType,
    priority: sanitizeString(data.priority || 'medium') as NotificationPriority,
    title: sanitizeString(data.title),
    message: sanitizeString(data.message),
    targetUsers: data.targetUsers || [],
    targetRoles: data.targetRoles || [],
    excludeUsers: data.excludeUsers || [],
    transferId: data.transferId ? sanitizeString(data.transferId) : undefined,
    data: data.data || {},
    settings: data.settings || {}
  };

  // Create notification
  const notification = await notificationService.createNotification(
    notificationData,
    userId
  );

  return NextResponse.json({
    success: true,
    data: { notification },
    timestamp: new Date()
  });
}

async function handleMarkAsRead(data: { notificationId: string }, userId: string) {
  const { notificationId } = data;
  
  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  await notificationService.markAsRead(notificationId, userId);

  return NextResponse.json({
    success: true,
    message: 'Notification marked as read',
    timestamp: new Date()
  });
}

async function handleMarkAsDismissed(data: { notificationId: string }, userId: string) {
  const { notificationId } = data;
  
  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  await notificationService.markAsDismissed(notificationId, userId);

  return NextResponse.json({
    success: true,
    message: 'Notification dismissed',
    timestamp: new Date()
  });
}

async function handleDeleteNotification(data: { notificationId: string }, userId: string, request: NextRequest) {
  const { notificationId } = data;
  
  if (!notificationId) {
    return NextResponse.json(
      { success: false, error: 'Notification ID is required' },
      { status: 400 }
    );
  }

  // Check permissions (only admins can delete notifications)
  const authResult = await AuthService.requireAuth(request);
  
  if (!authResult.isValid || !authResult.user || !['admin', 'super_admin'].includes(authResult.user.userType)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  await notificationService.deleteNotification(notificationId, userId);

  return NextResponse.json({
    success: true,
    message: 'Notification deleted',
    timestamp: new Date()
  });
}
