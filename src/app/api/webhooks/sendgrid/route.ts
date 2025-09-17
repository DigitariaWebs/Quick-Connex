/**
 * SendGrid Webhook Endpoint
 * 
 * This endpoint handles delivery status updates from SendGrid
 * for emails sent through the communication system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import NotificationIntegrationService from '@/lib/communication/notification-integration';

// POST /api/webhooks/sendgrid - Handle SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // SendGrid sends an array of events
    if (!Array.isArray(body)) {
      return createErrorResponse('Invalid webhook payload', 400);
    }

    console.log(`SendGrid webhook received ${body.length} events`);

    // Process each event
    for (const event of body) {
      const {
        event,
        email,
        timestamp,
        sg_message_id,
        sg_event_id,
        reason,
        status,
        response,
        attempt,
        type,
        url,
        useragent,
        ip,
        url_offset,
        category,
        unique_args,
        marketing_campaign_id,
        marketing_campaign_name,
        marketing_campaign_version,
        marketing_campaign_split_id,
        marketing_campaign_alias,
      } = event;

      console.log('SendGrid event:', {
        event,
        email,
        sg_message_id,
        timestamp,
        reason,
        status,
      });

      // Map SendGrid event to our communication status
      let communicationStatus: string;
      switch (event) {
        case 'processed':
          communicationStatus = 'sent';
          break;
        case 'delivered':
          communicationStatus = 'delivered';
          break;
        case 'bounce':
        case 'dropped':
        case 'blocked':
          communicationStatus = 'failed';
          break;
        case 'spam_report':
          communicationStatus = 'failed';
          break;
        case 'unsubscribe':
          communicationStatus = 'delivered';
          break;
        case 'group_unsubscribe':
          communicationStatus = 'delivered';
          break;
        case 'group_resubscribe':
          communicationStatus = 'delivered';
          break;
        default:
          communicationStatus = 'pending';
      }

      // Update notification delivery status if this is a notification email
      // You would typically look up the notification by sg_message_id or custom_args
      // For now, we'll just log the status update
      console.log(`Email ${sg_message_id} status updated to: ${communicationStatus}`);

      // In a real implementation, you would:
      // 1. Look up the notification/message by sg_message_id or custom_args.message_id
      // 2. Update the delivery status in your database
      // 3. Handle bounces, spam reports, and unsubscribes appropriately
      // 4. Trigger any follow-up actions if needed

      // Handle specific event types
      switch (event) {
        case 'bounce':
          console.log(`Email bounced for ${email}: ${reason}`);
          // Add email to bounce list
          break;
        case 'spam_report':
          console.log(`Spam report for ${email}`);
          // Add email to suppression list
          break;
        case 'unsubscribe':
          console.log(`Unsubscribe for ${email}`);
          // Add email to unsubscribe list
          break;
        case 'dropped':
          console.log(`Email dropped for ${email}: ${reason}`);
          // Handle dropped emails (invalid addresses, etc.)
          break;
      }
    }

    return createSuccessResponse({
      message: 'Webhook processed successfully',
      eventsProcessed: body.length,
    });

  } catch (error) {
    console.error('SendGrid webhook error:', error);
    return createErrorResponse(
      'Failed to process SendGrid webhook',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// GET /api/webhooks/sendgrid - Handle SendGrid webhook verification (if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    
    if (challenge) {
      // SendGrid webhook verification
      return new NextResponse(challenge, { status: 200 });
    }

    return createSuccessResponse({
      message: 'SendGrid webhook endpoint is active',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('SendGrid webhook GET error:', error);
    return createErrorResponse(
      'Failed to process SendGrid webhook GET request',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
