/**
 * Communication Send API Endpoint
 * 
 * This endpoint handles sending emails and SMS messages through the communication system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';
import CommunicationService from '@/lib/communication/communication-service';
import {
  EmailMessage,
  SMSMessage,
  CommunicationChannel,
} from '@/types/communication-types';

// POST /api/communication/send - Send communication message
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { channel, recipient, content, metadata, priority = 'medium' } = body;

    // Validate required fields
    if (!channel || !recipient || !content) {
      return createErrorResponse('Missing required fields: channel, recipient, content', 400);
    }

    if (!['email', 'sms'].includes(channel)) {
      return createErrorResponse('Invalid channel. Must be "email" or "sms"', 400);
    }

    const communicationService = new CommunicationService();
    const messageId = `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let response;

    if (channel === 'email') {
      const emailMessage: EmailMessage = {
        id: messageId,
        channel: 'email',
        priority,
        status: 'pending',
        recipient: {
          id: recipient.id,
          email: recipient.email,
          name: recipient.name,
          userType: recipient.userType,
        },
        content: {
          subject: content.subject,
          text: content.text,
          html: content.html,
          template: content.template,
          templateData: content.templateData,
        },
        metadata: {
          source: 'api',
          category: metadata?.category || 'manual',
          userId: authResult.user._id,
          ...metadata,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      response = await communicationService.sendEmail(emailMessage);
    } else if (channel === 'sms') {
      const smsMessage: SMSMessage = {
        id: messageId,
        channel: 'sms',
        priority,
        status: 'pending',
        recipient: {
          id: recipient.id,
          phone: recipient.phone,
          countryCode: recipient.countryCode,
          name: recipient.name,
          userType: recipient.userType,
        },
        content: {
          text: content.text,
          template: content.template,
          templateData: content.templateData,
        },
        metadata: {
          source: 'api',
          category: metadata?.category || 'manual',
          userId: authResult.user._id,
          ...metadata,
        },
        tracking: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      response = await communicationService.sendSMS(smsMessage);
    }

    if (!response) {
      return createErrorResponse('Failed to create communication message', 500);
    }

    return createSuccessResponse({
      messageId: response.messageId,
      success: response.success,
      status: response.status,
      providerId: response.providerId,
      cost: response.cost,
      currency: response.currency,
    });

  } catch (error) {
    console.error('Error sending communication:', error);
    return createErrorResponse(
      'Failed to send communication message',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// GET /api/communication/send - Get communication templates and configuration
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as CommunicationChannel;

    const communicationService = new CommunicationService();
    const templates = await communicationService.getTemplates(channel);

    return createSuccessResponse({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
        subject: template.subject,
        variables: template.variables,
        isActive: template.isActive,
      })),
      channels: ['email', 'sms'],
      maxSMSLength: 160,
      supportedProviders: {
        email: ['sendgrid', 'ses', 'mailgun', 'resend', 'nodemailer'],
        sms: ['twilio', 'aws-sns', 'messagebird', 'vonage', 'plivo'],
      },
    });

  } catch (error) {
    console.error('Error getting communication configuration:', error);
    return createErrorResponse(
      'Failed to get communication configuration',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
