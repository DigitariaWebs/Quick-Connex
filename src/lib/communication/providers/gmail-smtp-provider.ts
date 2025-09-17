/**
 * Gmail SMTP Provider Implementation
 * 
 * This file provides a real implementation of the Gmail SMTP provider
 * for sending emails through Gmail's SMTP server using app passwords.
 */

import nodemailer from 'nodemailer';
import {
  EmailMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  EmailProvider,
} from '@/types/communication-types';

/**
 * Gmail SMTP Provider Implementation
 */
export class GmailSMTPProvider implements ICommunicationProvider {
  providerType: EmailProvider = 'gmail-smtp';
  private email: string;
  private appPassword: string;
  private fromEmail: string;
  private fromName?: string;
  private transporter: nodemailer.Transporter;

  constructor(config: any) {
    this.email = config.email;
    this.appPassword = config.appPassword;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    
    // Create Nodemailer transporter
    this.transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.email,
        pass: this.appPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send email via Gmail SMTP
   */
  async send(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      if (!this.email || !this.appPassword) {
        throw new Error('Gmail email and app password are required');
      }

      // Prepare SMTP message
      const smtpMessage = this.prepareSMTPMessage(message);

      // Send via SMTP
      const response = await this.sendViaSMTP(smtpMessage);

      return {
        success: true,
        messageId: message.id,
        providerId: `smtp_${Date.now()}`,
        status: 'sent',
        cost: 0, // Gmail SMTP is free
        currency: 'USD',
      };

    } catch (error) {
      console.error('Gmail SMTP send error:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message status from Gmail SMTP
   */
  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // SMTP doesn't provide delivery status
    return 'sent';
  }

  /**
   * Validate Gmail SMTP configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.email || !this.appPassword) {
        return false;
      }

      // Test SMTP connection
      const testMessage = {
        from: this.fromEmail,
        to: this.email, // Send test to self
        subject: 'Test Connection',
        text: 'This is a test message to validate SMTP configuration.',
      };

      await this.sendViaSMTP(testMessage);
      return true;
    } catch (error) {
      console.error('Gmail SMTP validation error:', error);
      return false;
    }
  }

  /**
   * Get cost estimate for sending email
   */
  async getCostEstimate(message: EmailMessage): Promise<number> {
    // Gmail SMTP is free
    return 0;
  }

  /**
   * Prepare SMTP message format
   */
  private prepareSMTPMessage(message: EmailMessage): any {
    return {
      from: `${this.fromName || 'Patient Management'} <${this.fromEmail}>`,
      to: message.recipient.email,
      subject: message.content.subject,
      text: message.content.text,
      html: message.content.html,
      // Add custom headers
      headers: {
        'X-Message-ID': message.id,
        'X-Source': message.metadata?.source || 'api',
        'X-Category': message.metadata?.category || 'general',
      },
    };
  }

  /**
   * Send message via Gmail SMTP using Nodemailer
   */
  private async sendViaSMTP(message: any): Promise<any> {
    try {
      // Verify connection configuration
      await this.transporter.verify();
      
      // Send the email
      const info = await this.transporter.sendMail(message);
      
      console.log('Email sent via Gmail SMTP:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });

      return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      console.error('Gmail SMTP send error:', error);
      throw error;
    }
  }
}

export default GmailSMTPProvider;
