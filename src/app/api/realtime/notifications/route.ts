/**
 * Notifications API Route
 * 
 * API boundary - handles conversion between client (strings) and service (ObjectIds)
 */

import { Types } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { ActorType } from '@/models/AuditLog';
import { NotificationService } from '@/lib/realtime/core';
import { toNotificationAPI, toNotificationAPIBatch } from '@/lib/realtime/utils/converters';

const notificationService = NotificationService.getInstance();

/**
 * GET /api/realtime/notifications
 * Get user's notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await AuthService.requireAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const options = {
      userId: authResult.user._id,  // Already a string from auth
      userRoles: [authResult.user.userType],
      type: searchParams.get('type') as any,
      priority: searchParams.get('priority') as any,
      status: searchParams.get('status') as any,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      skip: parseInt(searchParams.get('skip') || '0'),
    };

    // Service returns documents with ObjectIds
    const result = await notificationService.getUserNotifications(options);

    // Convert to API format at boundary
    const apiNotifications = toNotificationAPIBatch(result.notifications);

    return NextResponse.json({
      success: true,
      data: {
        notifications: apiNotifications,
        total: result.total,
        unread: result.unread,
      },
    });
  } catch (error) {
    console.error('GET /api/realtime/notifications error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/realtime/notifications
 * Create new notification
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await AuthService.requireAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Create input - strings will be converted to ObjectIds by service
    const input = {
      type: body.type,
      priority: body.priority,
      title: body.title,
      message: body.message,
      data: body.data,
      targetUsers: body.targetUsers,          // Can be strings
      targetRoles: body.targetRoles,
      excludeUsers: body.excludeUsers,        // Can be strings
      transferId: body.transferId,            // Can be string
      relatedResourceId: body.relatedResourceId,
      relatedResourceType: body.relatedResourceType,
      settings: body.settings,
      createdBy: authResult.user._id,         // String
      createdByType: ActorType.USER,
    };

    // Service handles conversion and returns document with ObjectIds
    const notification = await notificationService.createNotification(input);

    // Convert to API format
    return NextResponse.json({
      success: true,
      data: toNotificationAPI(notification),
    });
  } catch (error) {
    console.error('POST /api/realtime/notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}