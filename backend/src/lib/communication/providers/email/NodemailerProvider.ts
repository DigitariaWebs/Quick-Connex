/**
 * Nodemailer Email Provider
 * 
 * Nodemailer implementation for email sending using SMTP.
 */

import * as nodemailer from 'nodemailer';
import { BaseEmailProvider } from './EmailProvider';
import { EmailMessage, CommunicationServiceResponse, CommunicationStatus } from '../../../../types/communication';
import { log } from '../../../logging';

export class NodemailerProvider extends BaseEmailProvider {
  providerType = 'nodemailer' as const;
  private transporter: nodemailer.Transporter;

  constructor(config: any) {
    super(config);
    
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: config.host || 'localhost',
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.apiKey,
        pass: config.apiSecret
      },
      tls: config.tls || {
        rejectUnauthorized: true
      }
    });
  }

  async send(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      log.debug('NodemailerProvider sending email', {
        category: 'communication',
        operation: 'nodemailer_send_start',
        provider: 'nodemailer',
        messageId: message.id
      });

      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.isValid) {
        log.warn('NodemailerProvider message validation failed', {
          category: 'communication',
          operation: 'nodemailer_validation_failed',
          provider: 'nodemailer',
          messageId: message.id,
          errors: validation.errors
        });
        return this.createErrorResponse(message.id, `Validation failed: ${validation.errors.join(', ')}`);
      }

      // Format message for Nodemailer
      const mailOptions = this.formatMessage(message);

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      log.debug('NodemailerProvider email sent successfully', {
        category: 'communication',
        operation: 'nodemailer_send_success',
        provider: 'nodemailer',
        messageId: message.id,
        providerMessageId: info.messageId
      });
      
      return this.createSuccessResponse(message.id, info.messageId);
    } catch (error) {
      log.error('NodemailerProvider send error', error, {
        category: 'communication',
        operation: 'nodemailer_send_error',
        provider: 'nodemailer',
        messageId: message.id
      });
      return this.createErrorResponse(message.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    try {
      log.debug('NodemailerProvider checking message status', {
        category: 'communication',
        operation: 'nodemailer_status_check',
        provider: 'nodemailer',
        messageId
      });
      
      // Nodemailer doesn't provide a direct way to check message status
      // This would typically require tracking in a database
      return 'sent';
    } catch (error) {
      log.error('NodemailerProvider status check error', error, {
        category: 'communication',
        operation: 'nodemailer_status_error',
        provider: 'nodemailer',
        messageId
      });
      return 'failed';
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      log.debug('NodemailerProvider validating configuration', {
        category: 'communication',
        operation: 'nodemailer_config_validation',
        provider: 'nodemailer'
      });

      if (!this.config.apiKey || !this.config.apiSecret) {
        log.warn('NodemailerProvider missing credentials', {
          category: 'communication',
          operation: 'nodemailer_config_missing_credentials',
          provider: 'nodemailer'
        });
        return false;
      }

      // Test SMTP connection
      await this.transporter.verify();
      
      log.debug('NodemailerProvider configuration valid', {
        category: 'communication',
        operation: 'nodemailer_config_valid',
        provider: 'nodemailer'
      });
      return true;
    } catch (error) {
      log.error('NodemailerProvider configuration validation error', error, {
        category: 'communication',
        operation: 'nodemailer_config_error',
        provider: 'nodemailer'
      });
      return false;
    }
  }

  async getCostEstimate(_message: EmailMessage): Promise<number> {
    // Nodemailer is typically used with free SMTP services
    return 0;
  }

  /**
   * Format message for Nodemailer
   */
  protected override formatMessage(message: EmailMessage): any {
    return {
      from: {
        address: this.config.fromEmail,
        name: this.config.fromName
      },
      to: message.recipient.email,
      subject: message.content.subject,
      text: message.content.text,
      html: message.content.html,
      replyTo: message.content.replyTo || this.config.replyTo,
      cc: message.content.cc,
      bcc: message.content.bcc,
      attachments: message.content.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };
  }
}

