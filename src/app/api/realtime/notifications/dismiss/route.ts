/**
 * Notification Dismiss API Route
 * 
 * Handles dismissing notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/realtime/core';
import { AuthService } from '@/lib/auth';
import { log } from '@/lib/logging';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';

// ===== NOTIFICATION SERVICE =====

const notificationService = NotificationService.getInstance();

// ===== DISMISS NOTIFICATION =====

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

    const body = await request.json();
    const { notificationId } = body;
    
    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    await notificationService.dismissNotification(notificationId, authResult.user._id);

    return NextResponse.json({
      success: true,
      message: 'Notification dismissed',
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to dismiss notification:', error);
    
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
