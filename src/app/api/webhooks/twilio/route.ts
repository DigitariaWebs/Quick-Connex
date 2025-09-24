/**
 * Twilio Webhook Endpoint
 * 
 * This endpoint handles delivery status updates from Twilio
 * for SMS messages sent through the communication system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import NotificationIntegrationService from '@/lib/communication/notification-integration';

// POST /api/webhooks/twilio - Handle Twilio webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    
    // Extract Twilio webhook data
    const messageSid = body.get('MessageSid') as string;
    const messageStatus = body.get('MessageStatus') as string;
    const to = body.get('To') as string;
    const from = body.get('From') as string;
    const errorCode = body.get('ErrorCode') as string;
    const errorMessage = body.get('ErrorMessage') as string;

    if (!messageSid) {
      return createErrorResponse('Missing MessageSid', 'MISSING_MESSAGE_SID', 400);
    }

    console.log('Twilio webhook received:', {
      messageSid,
      messageStatus,
      to,
      from,
      errorCode,
      errorMessage,
    });

    // Map Twilio status to our communication status
    let communicationStatus: string;
    switch (messageStatus) {
      case 'sent':
        communicationStatus = 'sent';
        break;
      case 'delivered':
        communicationStatus = 'delivered';
        break;
      case 'failed':
      case 'undelivered':
        communicationStatus = 'failed';
        break;
      default:
        communicationStatus = 'pending';
    }

    // Update notification delivery status if this is a notification SMS
    // You would typically look up the notification by messageSid or custom parameters
    // For now, we'll just log the status update
    console.log(`SMS ${messageSid} status updated to: ${communicationStatus}`);

    // In a real implementation, you would:
    // 1. Look up the notification/message by messageSid
    // 2. Update the delivery status in your database
    // 3. Trigger any follow-up actions if needed

    return createSuccessResponse({
      message: 'Webhook processed successfully',
      messageSid,
      status: communicationStatus,
    });

  } catch (error) {
    console.error('Twilio webhook error:', error);
    return createErrorResponse(
      'Failed to process Twilio webhook',
      'TWILIO_WEBHOOK_ERROR',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// GET /api/webhooks/twilio - Handle Twilio webhook verification (if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    
    if (challenge) {
      // Twilio webhook verification
      return new NextResponse(challenge, { status: 200 });
    }

    return createSuccessResponse({
      message: 'Twilio webhook endpoint is active',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Twilio webhook GET error:', error);
    return createErrorResponse(
      'Failed to process Twilio webhook GET request',
      'TWILIO_WEBHOOK_GET_ERROR',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
