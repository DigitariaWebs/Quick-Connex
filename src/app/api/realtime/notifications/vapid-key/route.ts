/**
 * VAPID Key API Route
 * 
 * Provides VAPID public key for Web Push subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PushProvider } from '@/lib/realtime/providers';
import { log } from '@/lib/logging';

// ===== PUSH PROVIDER =====

const pushProvider = PushProvider.getInstance();

// ===== GET VAPID PUBLIC KEY =====

export async function GET(request: NextRequest) {
  try {
    const publicKey = pushProvider.getVAPIDPublicKey();
    
    if (!publicKey) {
      return NextResponse.json(
        { success: false, error: 'VAPID public key not available' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { publicKey },
      timestamp: new Date()
    });

  } catch (error) {
    log.error('Failed to get VAPID public key:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get VAPID public key',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}
