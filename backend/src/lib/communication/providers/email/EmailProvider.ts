/**
 * Base Email Provider Interface
 * 
 * Defines the contract for all email providers.
 */

import {
  EmailMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  IEmailProvider,
  EmailProvider,
  EmailProviderConfig
} from '../../../../types/communication';

/**
 * Base Email Provider Class
 */
export abstract class BaseEmailProvider implements IEmailProvider {
  abstract providerType: EmailProvider;

  constructor(protected config: EmailProviderConfig) {}

  abstract send(message: EmailMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: EmailMessage): Promise<number>;

  /**
   * Get provider configuration
   */
  protected getConfig(): EmailProviderConfig {
    return this.config;
  }

  /**
   * Create error response
   */
  protected createErrorResponse(messageId: string, error: string): CommunicationServiceResponse {
    return {
      success: false,
      messageId,
      status: 'failed',
      error
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse(messageId: string, providerId?: string, cost?: number): CommunicationServiceResponse {
    return {
      success: true,
      messageId,
      providerId: providerId || 'unknown',
      status: 'sent',
      cost: cost || 0,
      currency: 'USD'
    };
  }

  /**
   * Validate email message
   */
  protected validateMessage(message: EmailMessage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.recipient.email) {
      errors.push('Recipient email is required');
    }

    if (!message.content.subject) {
      errors.push('Email subject is required');
    }

    if (!message.content.text && !message.content.html) {
      errors.push('Email content (text or html) is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format email message for provider
   */
  protected formatMessage(message: EmailMessage): any {
    return {
      to: message.recipient.email,
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName
      },
      subject: message.content.subject,
      text: message.content.text,
      html: message.content.html,
      replyTo: message.content.replyTo || this.config.replyTo,
      cc: message.content.cc,
      bcc: message.content.bcc,
      attachments: message.content.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
        disposition: 'attachment'
      }))
    };
  }
}

