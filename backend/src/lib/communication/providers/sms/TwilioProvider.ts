/**
 * Twilio SMS Provider
 * 
 * Twilio implementation for SMS sending.
 */

const Twilio = require('twilio');
import { BaseSMSProvider } from './SMSProvider';
import { SMSMessage, CommunicationServiceResponse, CommunicationStatus } from '../../../../types/communication';
import { log } from '../../../logging';

export class TwilioProvider extends BaseSMSProvider {
  providerType = 'twilio' as const;
  private client: any;

  constructor(config: any) {
    super(config);
    
    if (config.accountSid && config.authToken) {
      this.client = new Twilio(config.accountSid, config.authToken);
    } else {
      throw new Error('Twilio credentials (accountSid, authToken) are required');
    }
  }

  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      log.debug('TwilioProvider sending SMS', {
        category: 'communication',
        operation: 'twilio_send_start',
        provider: 'twilio',
        messageId: message.id
      });

      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.isValid) {
        log.warn('TwilioProvider message validation failed', {
          category: 'communication',
          operation: 'twilio_validation_failed',
          provider: 'twilio',
          messageId: message.id,
          errors: validation.errors
        });
        return this.createErrorResponse(message.id, `Validation failed: ${validation.errors.join(', ')}`);
      }

      // Send SMS via Twilio
      const twilioMessage = await this.client.messages.create({
        body: message.content.text,
        from: this.config.fromNumber,
        to: message.recipient.phone
      });

      log.debug('TwilioProvider SMS sent successfully', {
        category: 'communication',
        operation: 'twilio_send_success',
        provider: 'twilio',
        messageId: message.id,
        twilioSid: twilioMessage.sid,
        status: twilioMessage.status
      });
      
      return this.createSuccessResponse(message.id, twilioMessage.sid, 0.0075);
    } catch (error) {
      log.error('TwilioProvider send error', error, {
        category: 'communication',
        operation: 'twilio_send_error',
        provider: 'twilio',
        messageId: message.id
      });
      return this.createErrorResponse(message.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getStatus(messageId: string): Promise<CommunicationStatus> {
    try {
      log.debug('TwilioProvider checking message status', {
        category: 'communication',
        operation: 'twilio_status_check',
        provider: 'twilio',
        messageId
      });
      
      // Get message status from Twilio
      const message = await this.client.messages(messageId).fetch();
      
      // Map Twilio status to our CommunicationStatus
      const status = this.mapTwilioStatus(message.status);
      
      log.debug('TwilioProvider status retrieved', {
        category: 'communication',
        operation: 'twilio_status_retrieved',
        provider: 'twilio',
        messageId,
        twilioStatus: message.status,
        mappedStatus: status
      });
      
      return status;
    } catch (error) {
      log.error('TwilioProvider status check error', error, {
        category: 'communication',
        operation: 'twilio_status_error',
        provider: 'twilio',
        messageId
      });
      return 'failed';
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      log.debug('TwilioProvider validating configuration', {
        category: 'communication',
        operation: 'twilio_config_validation',
        provider: 'twilio'
      });

      if (!this.config.accountSid || !this.config.authToken) {
        log.warn('TwilioProvider missing credentials', {
          category: 'communication',
          operation: 'twilio_config_missing_credentials',
          provider: 'twilio'
        });
        return false;
      }

      // Test Twilio API by fetching account info
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      
      log.debug('TwilioProvider configuration valid', {
        category: 'communication',
        operation: 'twilio_config_valid',
        provider: 'twilio',
        accountSid: account.sid,
        accountStatus: account.status
      });
      return true;
    } catch (error) {
      log.error('TwilioProvider configuration validation error', error, {
        category: 'communication',
        operation: 'twilio_config_error',
        provider: 'twilio'
      });
      return false;
    }
  }

  async getCostEstimate(message: SMSMessage): Promise<number> {
    return this.calculateSMSCost(message.content.text);
  }

  /**
   * Map Twilio message status to our CommunicationStatus
   */
  private mapTwilioStatus(twilioStatus: string): CommunicationStatus {
    switch (twilioStatus) {
      case 'queued':
      case 'sending':
        return 'pending';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'undelivered':
      case 'failed':
        return 'failed';
      default:
        return 'failed';
    }
  }
}

