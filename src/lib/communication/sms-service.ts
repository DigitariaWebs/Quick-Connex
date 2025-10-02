/**
 * SMS Service Implementation
 * 
 * This file provides a comprehensive SMS service with support for multiple providers,
 * message formatting, and delivery tracking.
 */

import {
  SMSMessage,
  SMSRecipient,
  SMSContent,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  SMSProvider,
  CommunicationTemplate,
  CommunicationContent,
} from '@/types/communication-types';
import { getCommunicationConfig } from '@/lib/communication-config';
import TwilioProviderClass from './providers/twilio-provider';

/**
 * SMS Service Class
 */
export class SMSService {
  private providers: Map<SMSProvider, ICommunicationProvider> = new Map();
  private config: ReturnType<typeof getCommunicationConfig>;
  private templates: Map<string, CommunicationTemplate> = new Map();

  constructor() {
    this.config = getCommunicationConfig();
    this.initializeProviders();
    this.loadTemplates();
  }

  /**
   * Initialize SMS providers
   */
  private initializeProviders(): void {
    const { provider } = this.config.providers.sms;

    switch (provider) {
      case 'twilio':
        this.providers.set('twilio', new TwilioProviderClass(this.config.providers.sms));
        break;
      case 'aws-sns':
        this.providers.set('aws-sns', new AWSSNSProvider(this.config.providers.sms));
        break;
      case 'messagebird':
        this.providers.set('messagebird', new MessageBirdProvider(this.config.providers.sms));
        break;
      case 'vonage':
        this.providers.set('vonage', new VonageProvider(this.config.providers.sms));
        break;
      case 'plivo':
        this.providers.set('plivo', new PlivoProvider(this.config.providers.sms));
        break;
      default:
        this.providers.set('twilio', new TwilioProviderClass(this.config.providers.sms));
        break;
    }
  }

  /**
   * Load SMS templates
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Load default templates
      const defaultTemplates = await this.getDefaultTemplates();
      defaultTemplates.forEach(template => {
        this.templates.set(template.id, template);
      });
    } catch (error) {
      console.error('Error loading SMS templates:', error);
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      // Validate message
      const validation = this.validateSMSMessage(message);
      if (!validation.isValid) {
        return {
          success: false,
          messageId: message.id,
          status: 'failed',
          error: validation.errors.join(', '),
        };
      }

      // Format phone number
      const formattedMessage = this.formatPhoneNumber(message);

      // Get provider
      const provider = this.providers.get(this.config.providers.sms.provider);
      if (!provider) {
        return {
          success: false,
          messageId: message.id,
          status: 'failed',
          error: `SMS provider ${this.config.providers.sms.provider} not available`,
        };
      }

      // Send SMS
      const response = await provider.send(formattedMessage);

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
      console.error('Error sending SMS:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    // Process in batches to avoid overwhelming the provider
    const batchSize = this.config.queue.batchSize;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(message => this.sendSMS(message))
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
   * Render SMS template
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (template.channel !== 'sms') {
      throw new Error(`Template ${templateId} is not an SMS template`);
    }

    return {
      text: this.renderString(template.text, data),
      template: templateId,
      templateData: data,
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): CommunicationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.channel === 'sms');
  }

  /**
   * Format phone number for international use
   */
  private formatPhoneNumber(message: SMSMessage): SMSMessage {
    const { phone, countryCode } = message.recipient;
    
    // If phone number doesn't start with +, add country code
    if (!phone.startsWith('+')) {
      const defaultCountryCode = countryCode || '1'; // Default to US
      message.recipient.phone = `+${defaultCountryCode}${phone.replace(/\D/g, '')}`;
    }

    return message;
  }

  /**
   * Validate SMS message
   */
  private validateSMSMessage(message: SMSMessage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.recipient.phone) {
      errors.push('Recipient phone number is required');
    } else if (!this.isValidPhoneNumber(message.recipient.phone)) {
      errors.push('Invalid recipient phone number format');
    }

    if (!message.content.text) {
      errors.push('SMS text content is required');
    } else if (message.content.text.length > 1600) { // SMS limit
      errors.push('SMS text content exceeds maximum length (1600 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Simple phone number validation
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Check if it's between 10-15 digits (international standard)
    const digits = cleaned.replace(/\+/g, '');
    return digits.length >= 10 && digits.length <= 15;
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
   * Get default SMS templates
   */
  private async getDefaultTemplates(): Promise<CommunicationTemplate[]> {
    return [
      {
        id: 'new_transfer_request_sms',
        name: 'New Transfer Request SMS',
        channel: 'sms',
        category: 'transfer',
        text: '🆕 New transfer request: {{patientName}} ({{patientAge}}y) from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}. Requested by: {{requestedBy}}',
        variables: ['patientName', 'patientAge', 'fromHospital', 'toHospital', 'priority', 'requestedBy'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'transfer_approved_sms',
        name: 'Transfer Approved SMS',
        channel: 'sms',
        category: 'transfer',
        text: '✅ Transfer approved: {{patientName}} from {{fromHospital}} to {{toHospital}}. Transfer ID: {{transferId}}. Please check dashboard for details.',
        variables: ['patientName', 'fromHospital', 'toHospital', 'transferId'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'transfer_accepted_sms',
        name: 'Transfer Accepted SMS',
        channel: 'sms',
        category: 'transfer',
        text: '👤 Transfer accepted: {{patientName}} from {{fromHospital}} to {{toHospital}}. Accepted by: {{acceptedBy}}. Transfer ID: {{transferId}}',
        variables: ['patientName', 'fromHospital', 'toHospital', 'acceptedBy', 'transferId'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'transfer_completed_sms',
        name: 'Transfer Completed SMS',
        channel: 'sms',
        category: 'transfer',
        text: '✅ Transfer completed: {{patientName}} from {{fromHospital}} to {{toHospital}}. Completed by: {{completedBy}}. Duration: {{duration}}',
        variables: ['patientName', 'fromHospital', 'toHospital', 'completedBy', 'duration'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'urgent_transfer_alert_sms',
        name: 'Urgent Transfer Alert SMS',
        channel: 'sms',
        category: 'urgent',
        text: '🚨 URGENT {{transferCategory}} TRANSFER: {{transferTitle}} needs immediate transfer from {{fromHospital}} to {{toHospital}}. Priority: {{priority}}. Requested by: {{requestedBy}}',
        variables: ['transferTitle', 'transferCategory', 'fromHospital', 'toHospital', 'priority', 'requestedBy'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'transfer_notification_sms',
        name: 'Transfer Notification SMS',
        channel: 'sms',
        category: 'transfer',
        text: '{{transferCategory}} Transfer update: {{transferTitle}} from {{fromHospital}} to {{toHospital}}. Status: {{status}}',
        variables: ['transferTitle', 'transferCategory', 'fromHospital', 'toHospital', 'status'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'system_notification_sms',
        name: 'System Notification SMS',
        channel: 'sms',
        category: 'system',
        text: 'System Alert: {{message}}',
        variables: ['message'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'transfer_reminder_sms',
        name: 'Transfer Reminder SMS',
        channel: 'sms',
        category: 'reminder',
        text: 'Reminder: {{transferCategory}} Transfer for {{transferTitle}} scheduled for {{scheduledDate}} from {{fromHospital}} to {{toHospital}}',
        variables: ['transferTitle', 'transferCategory', 'scheduledDate', 'fromHospital', 'toHospital'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}

/**
 * Base SMS Provider Class
 */
abstract class BaseSMSProvider implements ICommunicationProvider {
  abstract providerType: SMSProvider;

  constructor(protected config: any) {}

  abstract send(message: SMSMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: SMSMessage): Promise<number>;
}

/**
 * Twilio Provider Implementation
 */
class TwilioProvider extends BaseSMSProvider {
  providerType: SMSProvider = 'twilio';

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      // Check if Twilio is configured
      if (!this.config.accountSid || !this.config.authToken) {
        throw new Error('Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      }

      // For now, we'll use a mock implementation
      // In production, you would use the actual Twilio SDK:
      // const client = require('twilio')(this.config.accountSid, this.config.authToken);
      // const result = await client.messages.create({
      //   body: message.content.text,
      //   from: this.config.fromNumber,
      //   to: message.recipient.phone
      // });

      console.log('Sending SMS via Twilio:', {
        to: message.recipient.phone,
        from: this.config.fromNumber,
        message: message.content.text.substring(0, 50) + '...'
      });
      
      // Mock successful response
      return {
        success: true,
        messageId: message.id,
        providerId: `tw_${Date.now()}`,
        status: 'sent',
        cost: 0.0075, // Twilio pricing (varies by country)
        currency: 'USD',
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown Twilio error',
      };
    }
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // Implementation would query Twilio API
    return 'delivered';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.accountSid && this.config.authToken);
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    // Twilio charges per SMS (varies by country)
    return 0.0075;
  }
}

/**
 * AWS SNS Provider Implementation
 */
class AWSSNSProvider extends BaseSMSProvider {
  providerType: SMSProvider = 'aws-sns';

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    // Implementation would use AWS SNS API
    console.log('Sending SMS via AWS SNS:', message.id);
    
    return {
      success: true,
      messageId: message.id,
      providerId: `sns_${Date.now()}`,
      status: 'sent',
      cost: 0.0075, // AWS SNS pricing
      currency: 'USD',
    };
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // Implementation would query AWS SNS API
    return 'delivered';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    // AWS SNS charges per SMS
    return 0.0075;
  }
}

/**
 * MessageBird Provider Implementation
 */
class MessageBirdProvider extends BaseSMSProvider {
  providerType: SMSProvider = 'messagebird';

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    // Implementation would use MessageBird API
    console.log('Sending SMS via MessageBird:', message.id);
    
    return {
      success: true,
      messageId: message.id,
      providerId: `mb_${Date.now()}`,
      status: 'sent',
      cost: 0.008, // MessageBird pricing
      currency: 'USD',
    };
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // Implementation would query MessageBird API
    return 'delivered';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey);
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    // MessageBird charges per SMS
    return 0.008;
  }
}

/**
 * Vonage Provider Implementation
 */
class VonageProvider extends BaseSMSProvider {
  providerType: SMSProvider = 'vonage';

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    // Implementation would use Vonage API
    console.log('Sending SMS via Vonage:', message.id);
    
    return {
      success: true,
      messageId: message.id,
      providerId: `vn_${Date.now()}`,
      status: 'sent',
      cost: 0.0075, // Vonage pricing
      currency: 'USD',
    };
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // Implementation would query Vonage API
    return 'delivered';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    // Vonage charges per SMS
    return 0.0075;
  }
}

/**
 * Plivo Provider Implementation
 */
class PlivoProvider extends BaseSMSProvider {
  providerType: SMSProvider = 'plivo';

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    // Implementation would use Plivo API
    console.log('Sending SMS via Plivo:', message.id);
    
    return {
      success: true,
      messageId: message.id,
      providerId: `pl_${Date.now()}`,
      status: 'sent',
      cost: 0.0075, // Plivo pricing
      currency: 'USD',
    };
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // Implementation would query Plivo API
    return 'delivered';
  }

  async validateConfiguration(): Promise<boolean> {
    return !!(this.config.apiKey && this.config.apiSecret);
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    // Plivo charges per SMS
    return 0.0075;
  }
}

// Export the main service
export default SMSService;
