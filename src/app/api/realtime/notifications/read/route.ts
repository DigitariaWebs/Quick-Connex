/**
 * Notification Actions API Route
 * 
 * Handles specific notification actions like mark as read, dismiss, etc.
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
import { sanitizeString } from '@/lib/utils/request-validation';

// ===== NOTIFICATION SERVICE =====

const notificationService = NotificationService.getInstance();

// ===== MARK AS READ =====

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

    await notificationService.markAsRead(notificationId, authResult.user._id);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to mark notification as read:', error);
    
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
