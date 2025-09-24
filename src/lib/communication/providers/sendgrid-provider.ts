/**
 * SendGrid Email Provider Implementation
 * 
 * This file provides a real implementation of the SendGrid email provider
 * using the SendGrid API for sending emails.
 */

import {
  EmailMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  EmailProvider,
} from '@/types/communication-types';

/**
 * SendGrid Provider Implementation
 */
export class SendGridProvider implements ICommunicationProvider {
  providerType: EmailProvider = 'sendgrid';
  private apiKey: string;
  private fromEmail: string;
  private fromName?: string;
  private replyTo?: string;

  constructor(config: any) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    this.replyTo = config.replyTo;
  }

  /**
   * Send email via SendGrid API
   */
  async send(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key is required');
      }

      // Prepare SendGrid message
      const sendGridMessage = this.prepareSendGridMessage(message);

      // Send via SendGrid API
      const response = await this.sendViaAPI(sendGridMessage);

      return {
        success: true,
        messageId: message.id,
        providerId: response.messageId,
        status: 'sent',
        cost: this.calculateCost(message),
        currency: 'USD',
      };

    } catch (error) {
      console.error('SendGrid send error:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message status from SendGrid
   */
  async getStatus(messageId: string): Promise<CommunicationStatus> {
    try {
      // SendGrid doesn't provide real-time status via API
      // Status updates come via webhooks
      // For now, return 'sent' as default
      return 'sent';
    } catch (error) {
      console.error('SendGrid status error:', error);
      return 'failed';
    }
  }

  /**
   * Validate SendGrid configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      // Test API key by making a simple request
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('SendGrid validation error:', error);
      return false;
    }
  }

  /**
   * Get cost estimate for sending email
   */
  async getCostEstimate(message: EmailMessage): Promise<number> {
    return this.calculateCost(message);
  }

  /**
   * Prepare SendGrid message format
   */
  private prepareSendGridMessage(message: EmailMessage): any {
    const sendGridMessage = {
      personalizations: [
        {
          to: [
            {
              email: message.recipient.email,
              name: message.recipient.name,
            },
          ],
          subject: message.content.subject,
        },
      ],
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      content: [],
      tracking_settings: {
        click_tracking: {
          enable: true,
          enable_text: true,
        },
        open_tracking: {
          enable: true,
        },
      },
      custom_args: {
        message_id: message.id,
        source: message.metadata?.source || 'api',
        category: message.metadata?.category || 'general',
      },
    };

    // Add reply-to if specified
    if (this.replyTo) {
      (sendGridMessage as any).reply_to = {
        email: this.replyTo,
      };
    }

    // Add content (text and HTML)
    if (message.content.text) {
      (sendGridMessage.content as any[]).push({
        type: 'text/plain',
        value: message.content.text,
      });
    }

    if (message.content.html) {
      (sendGridMessage.content as any[]).push({
        type: 'text/html',
        value: message.content.html,
      });
    }

    // Add CC if specified
    if (message.content.cc && message.content.cc.length > 0) {
      (sendGridMessage.personalizations[0] as any).cc = message.content.cc.map(email => ({
        email,
      }));
    }

    // Add BCC if specified
    if (message.content.bcc && message.content.bcc.length > 0) {
      (sendGridMessage.personalizations[0] as any).bcc = message.content.bcc.map(email => ({
        email,
      }));
    }

    // Add attachments if specified
    if (message.content.attachments && message.content.attachments.length > 0) {
      (sendGridMessage as any).attachments = message.content.attachments.map(attachment => ({
        content: Buffer.from(attachment.content).toString('base64'),
        filename: attachment.filename,
        type: attachment.contentType,
        disposition: 'attachment',
      }));
    }

    return sendGridMessage;
  }

  /**
   * Send message via SendGrid API
   */
  private async sendViaAPI(message: any): Promise<any> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    // SendGrid returns empty body on success
    // The message ID is in the X-Message-Id header
    const messageId = response.headers.get('X-Message-Id') || `sg_${Date.now()}`;

    return {
      messageId,
      status: response.status,
    };
  }

  /**
   * Calculate cost for sending email
   */
  private calculateCost(message: EmailMessage): number {
    // SendGrid pricing: $0.00075 per email
    // This is a simplified calculation
    return 0.00075;
  }
}

export default SendGridProvider;
