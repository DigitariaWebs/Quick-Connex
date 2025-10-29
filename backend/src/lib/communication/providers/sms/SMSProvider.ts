/**
 * Base SMS Provider Interface
 * 
 * Defines the contract for all SMS providers.
 */

import {
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ISMSProvider,
  SMSProvider,
  SMSProviderConfig
} from '../../../../types/communication';

/**
 * Base SMS Provider Class
 */
export abstract class BaseSMSProvider implements ISMSProvider {
  abstract providerType: SMSProvider;

  constructor(protected config: SMSProviderConfig) {}

  abstract send(message: SMSMessage): Promise<CommunicationServiceResponse>;
  abstract getStatus(messageId: string): Promise<CommunicationStatus>;
  abstract validateConfiguration(): Promise<boolean>;
  abstract getCostEstimate(message: SMSMessage): Promise<number>;

  /**
   * Get provider configuration
   */
  protected getConfig(): SMSProviderConfig {
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
   * Validate SMS message
   */
  protected validateMessage(message: SMSMessage): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.recipient.phone) {
      errors.push('Recipient phone number is required');
    }

    if (!message.content.text) {
      errors.push('SMS text content is required');
    } else if (message.content.text.length > 1600) {
      errors.push('SMS text content exceeds maximum length (1600 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format phone number for international use
   */
  protected formatPhoneNumber(phone: string, countryCode?: string): string {
    if (phone.startsWith('+')) {
      return phone;
    }
    
    const defaultCountryCode = countryCode || '1';
    const cleaned = phone.replace(/\D/g, '');
    return `+${defaultCountryCode}${cleaned}`;
  }

  /**
   * Format SMS message for provider
   */
  protected formatMessage(message: SMSMessage): any {
    return {
      to: this.formatPhoneNumber(message.recipient.phone, message.recipient.countryCode),
      from: message.content.from || this.config.fromNumber,
      body: message.content.text
    };
  }

  /**
   * Calculate SMS cost based on length
   */
  protected calculateSMSCost(text: string): number {
    // Basic cost calculation - 1 SMS per 160 characters
    const smsCount = Math.ceil(text.length / 160);
    return smsCount * 0.01; // $0.01 per SMS
  }
}

