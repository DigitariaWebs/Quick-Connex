/**
 * Web Push Subscription API Route
 * 
 * Handles Web Push subscription management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PushProvider } from '@/lib/realtime/providers';
import { AuthService } from '@/lib/auth';
import { log } from '@/lib/logging';
import { WebPushSubscription } from '@/lib/realtime/core/types';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { sanitizeString } from '@/lib/utils/request-validation';

// ===== PUSH PROVIDER =====

const pushProvider = PushProvider.getInstance();

// ===== SUBSCRIBE =====

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
    const { userId, subscription } = body;
    
    if (!userId || !subscription) {
      return NextResponse.json(
        { success: false, error: 'User ID and subscription are required' },
        { status: 400 }
      );
    }

    // Validate subscription
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    await pushProvider.subscribeUser(userId, subscription);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to subscribe user to push notifications:', error);
    
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

// ===== UNSUBSCRIBE =====

export async function DELETE(request: NextRequest) {
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
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await pushProvider.unsubscribeUser(userId);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to unsubscribe user from push notifications:', error);
    
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
