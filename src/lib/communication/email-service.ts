/**
 * Email Service Implementation
 * 
 * This file provides a comprehensive email service with support for multiple providers,
 * template rendering, and delivery tracking.
 */

import {
  EmailMessage,
  EmailRecipient,
  EmailContent,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  EmailProvider,
  CommunicationTemplate,
  CommunicationContent,
} from '@/types/communication-types';
import { getCommunicationConfig } from '@/lib/communication/communication-config';
import SendGridProvider from './providers/sendgrid-provider';
import GmailAPIProvider from './providers/gmail-api-provider';
import GmailSMTPProvider from './providers/gmail-smtp-provider';

/**
 * Email Service Class
 */
export class EmailService {
  private providers: Map<EmailProvider, ICommunicationProvider> = new Map();
  private config: ReturnType<typeof getCommunicationConfig>;
  private templates: Map<string, CommunicationTemplate> = new Map();

  constructor() {
    this.config = getCommunicationConfig();
    this.initializeProviders();
    // Note: Templates are now generated dynamically by business logic services
    // No need to load static templates
  }

  /**
   * Initialize email providers
   */
  private initializeProviders(): void {
    const { provider } = this.config.providers.email;

    switch (provider) {
      case 'sendgrid':
        this.providers.set('sendgrid', new SendGridProvider(this.config.providers.email));
        break;
      case 'gmail-api':
        this.providers.set('gmail-api', new GmailAPIProvider(this.config.providers.email));
        break;
      case 'gmail-smtp':
        this.providers.set('gmail-smtp', new GmailSMTPProvider(this.config.providers.email));
        break;
      case 'ses':
        console.warn('SES provider not implemented yet');
        break;
      case 'mailgun':
        console.warn('Mailgun provider not implemented yet');
        break;
      case 'resend':
        console.warn('Resend provider not implemented yet');
        break;
      case 'nodemailer':
      default:
        console.warn('Nodemailer provider not implemented yet');
        break;
    }
  }

  /**
   * Load email templates
   * Note: This method is kept for compatibility but templates are now generated dynamically
   */
  private async loadTemplates(): Promise<void> {
    // Templates are now generated dynamically by business logic services
    // This method is kept for compatibility but does nothing
  }

  /**
   * Send email message
   */
  async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      // Validate message
      const validation = this.validateEmailMessage(message);
      if (!validation.isValid) {
        return {
          success: false,
          messageId: message.id,
          status: 'failed',
          error: validation.errors.join(', '),
        };
      }

      // Get provider
      const provider = this.providers.get(this.config.providers.email.provider);
      if (!provider) {
        return {
          success: false,
          messageId: message.id,
          status: 'failed',
          error: `Email provider ${this.config.providers.email.provider} not available`,
        };
      }

      // Send email
      const response = await provider.send(message);

      // Update message status
      message.status = response.status;
      message.tracking = {
        ...message.tracking,
        sentAt: new Date(),
        providerId: response.providerId,
        providerResponse: response,
        cost: response.cost,
        currency: response.currency,
      };

      return response;
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    // Process in batches to avoid overwhelming the provider
    const batchSize = this.config.queue.batchSize;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(message => this.sendEmail(message))
      );
      results.push(...batchResults);

      // Add delay between batches if configured
      if (i + batchSize < messages.length && this.config.queue.processingInterval > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.queue.processingInterval));
      }
    }

    return results;
  }

  /**
   * Render email template
   * Note: This method is kept for compatibility but templates are now generated dynamically
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
    // Templates are now generated dynamically by business logic services
    // This method is kept for compatibility but will throw an error
    throw new Error(`Template ${templateId} not found. Templates are now generated dynamically by business logic services.`);
  }

  /**
   * Get available templates
   * Note: Templates are now generated dynamically by business logic services
   */
  getTemplates(): CommunicationTemplate[] {
    // Templates are now generated dynamically by business logic services
    // Return empty array for compatibility
    return [];
  }

  /**
   * Validate email message
   */
  private validateEmailMessage(message: EmailMessage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.recipient.email) {
      errors.push('Recipient email is required');
    } else if (!this.isValidEmail(message.recipient.email)) {
      errors.push('Invalid recipient email format');
    }

    if (!message.content.subject) {
      errors.push('Email subject is required');
    }

    if (!message.content.text && !message.content.html) {
      errors.push('Email content (text or html) is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Render string with template variables
   */
  private renderString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Get default email templates
   * Note: Templates are now generated dynamically by TransferNotificationService
   */
  private async getDefaultTemplates(): Promise<CommunicationTemplate[]> {
    // Return empty array since templates are generated dynamically
    // by TransferNotificationService and other business logic services
    return [];
  }
}

/**
 * Base Email Provider Class
 */
abstract class BaseEmailProvider implements ICommunicationProvider {
  abstract providerType: EmailProvider;

  constructor(protected config: any) {}

  abstract send(message: EmailMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: EmailMessage): Promise<number>;
}

// SendGrid Provider is imported from './providers/sendgrid-provider'

// SES Provider would need to be implemented separately

// Mailgun Provider would need to be implemented separately

// Resend Provider would need to be implemented separately

// Nodemailer Provider would need to be implemented separately

// Export the main service
export default EmailService;
