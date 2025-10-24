/**
 * SendGrid Webhook Endpoint
 * 
 * This endpoint handles delivery status updates from SendGrid
 * for emails sent through the communication system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';import NotificationIntegrationService from '@/lib/communication/integrations/notification-integration';

// POST /api/webhooks/sendgrid - Handle SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // SendGrid sends an array of events
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log(`SendGrid webhook received ${body.length} events`);

    // Process each event
    for (const eventData of body as any[]) {
      const eventType = eventData.event;
      const email = eventData.email;
      const timestamp = eventData.timestamp;
      const sg_message_id = eventData.sg_message_id;
      const sg_event_id = eventData.sg_event_id;
      const reason = eventData.reason;
      const status = eventData.status;
      const response = eventData.response;
      const attempt = eventData.attempt;
      const type = eventData.type;
      const url = eventData.url;
      const useragent = eventData.useragent;
      const ip = eventData.ip;
      const url_offset = eventData.url_offset;
      const category = eventData.category;
      const unique_args = eventData.unique_args;
      const marketing_campaign_id = eventData.marketing_campaign_id;
      const marketing_campaign_name = eventData.marketing_campaign_name;
      const marketing_campaign_version = eventData.marketing_campaign_version;
      const marketing_campaign_split_id = eventData.marketing_campaign_split_id;
      const marketing_campaign_alias = eventData.marketing_campaign_alias;

      console.log('SendGrid event:', {
        eventType,
        email,
        sg_message_id,
        timestamp,
        reason,
        status,
      });

      // Map SendGrid event to our communication status
      let communicationStatus: string;
      switch (eventType) {
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
      switch (eventType) {
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

    return NextResponse.json({
      success: true,
      data: {
      message: 'Webhook processed successfully',
      eventsProcessed: body.length,
    
      }
    });

  } catch (error) {
    console.error('SendGrid webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process SendGrid webhook', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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

    return NextResponse.json({
      success: true,
      data: {
        message: 'SendGrid webhook endpoint is active',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('SendGrid webhook GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process SendGrid webhook GET request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
