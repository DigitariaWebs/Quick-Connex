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
import { getCommunicationConfig } from '@/lib/communication-config';
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
    this.loadTemplates();
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
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Load default templates
      const defaultTemplates = await this.getDefaultTemplates();
      defaultTemplates.forEach(template => {
        this.templates.set(template.id, template);
      });
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
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
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (template.channel !== 'email') {
      throw new Error(`Template ${templateId} is not an email template`);
    }

    return {
      subject: this.renderString(template.subject || '', data),
      text: this.renderString(template.text, data),
      html: template.html ? this.renderString(template.html, data) : undefined,
      template: templateId,
      templateData: data,
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): CommunicationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.channel === 'email');
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
   */
  private async getDefaultTemplates(): Promise<CommunicationTemplate[]> {
    return [
      {
        id: 'transfer_notification',
        name: 'Transfer Notification',
        channel: 'email',
        category: 'transfer',
        subject: 'Transfer Update: {{patientName}}',
        text: 'Transfer update for {{patientName}} from {{fromHospital}} to {{toHospital}}. Status: {{status}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Transfer Update</h2>
            <p><strong>Patient:</strong> {{patientName}}</p>
            <p><strong>From:</strong> {{fromHospital}}</p>
            <p><strong>To:</strong> {{toHospital}}</p>
            <p><strong>Status:</strong> {{status}}</p>
            <p><strong>Priority:</strong> {{priority}}</p>
            {{#if scheduledDate}}
            <p><strong>Scheduled Date:</strong> {{scheduledDate}}</p>
            {{/if}}
            <hr>
            <p><small>This is an automated message from the Patient Management System.</small></p>
          </div>
        `,
        variables: ['patientName', 'fromHospital', 'toHospital', 'status', 'priority', 'scheduledDate'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'urgent_alert',
        name: 'Urgent Transfer Alert',
        channel: 'email',
        category: 'urgent',
        subject: '🚨 URGENT: {{patientName}} Transfer Required',
        text: 'URGENT: {{patientName}} requires immediate transfer from {{fromHospital}} to {{toHospital}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ff0000; padding: 20px;">
            <h2 style="color: #ff0000;">🚨 URGENT TRANSFER ALERT</h2>
            <p><strong>Patient:</strong> {{patientName}}</p>
            <p><strong>From:</strong> {{fromHospital}}</p>
            <p><strong>To:</strong> {{toHospital}}</p>
            <p><strong>Priority:</strong> <span style="color: #ff0000; font-weight: bold;">{{priority}}</span></p>
            <p><strong>Reason:</strong> {{reason}}</p>
            <hr>
            <p style="color: #ff0000; font-weight: bold;">IMMEDIATE ACTION REQUIRED</p>
            <p><small>This is an automated urgent alert from the Patient Management System.</small></p>
          </div>
        `,
        variables: ['patientName', 'fromHospital', 'toHospital', 'priority', 'reason'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'system_notification',
        name: 'System Notification',
        channel: 'email',
        category: 'system',
        subject: 'System Notification: {{title}}',
        text: '{{message}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>{{title}}</h2>
            <p>{{message}}</p>
            {{#if actionUrl}}
            <p><a href="{{actionUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a></p>
            {{/if}}
            <hr>
            <p><small>This is an automated message from the Patient Management System.</small></p>
          </div>
        `,
        variables: ['title', 'message', 'actionUrl'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        channel: 'email',
        category: 'authentication',
        subject: 'Reset Your Password - Patient Management System',
        text: 'Hello {{firstName}}, you requested a password reset. Click the link to reset your password: {{resetUrl}}. This link expires in {{expiresIn}}.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello {{firstName}} {{lastName}},</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                We received a request to reset your password for your Patient Management System account.
              </p>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                Click the button below to reset your password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                <strong>Important:</strong> This link will expire in {{expiresIn}}. If you don't reset your password within this time, you'll need to request a new reset link.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                This is an automated message from the Patient Management System.<br>
                If you have any questions, please contact your system administrator.
              </p>
            </div>
          </div>
        `,
        variables: ['firstName', 'lastName', 'resetUrl', 'expiresIn'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
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
