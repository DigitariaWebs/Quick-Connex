/**
 * Twilio SMS Provider Implementation
 * 
 * This file provides a real implementation of the Twilio SMS provider
 * using the Twilio API for sending SMS messages.
 */

import {
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  SMSProvider,
} from '@/types/communication-types';

/**
 * Twilio Provider Implementation
 */
export class TwilioProvider implements ICommunicationProvider {
  providerType: SMSProvider = 'twilio';
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(config: any) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  /**
   * Send SMS via Twilio API
   */
  async send(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio Account SID and Auth Token are required');
      }

      // Prepare Twilio message
      const twilioMessage = this.prepareTwilioMessage(message);

      // Send via Twilio API
      const response = await this.sendViaAPI(twilioMessage);

      return {
        success: true,
        messageId: message.id,
        providerId: response.sid,
        status: 'sent',
        cost: this.calculateCost(message),
        currency: 'USD',
      };

    } catch (error) {
      console.error('Twilio send error:', error);
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getStatus(messageId: string): Promise<CommunicationStatus> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      // Get message status from Twilio API
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      const data = await response.json();
      return this.mapTwilioStatus(data.status);

    } catch (error) {
      console.error('Twilio status error:', error);
      return 'failed';
    }
  }

  /**
   * Validate Twilio configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.accountSid || !this.authToken) {
        return false;
      }

      // Test credentials by making a simple request
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Twilio validation error:', error);
      return false;
    }
  }

  /**
   * Get cost estimate for sending SMS
   */
  async getCostEstimate(message: SMSMessage): Promise<number> {
    return this.calculateCost(message);
  }

  /**
   * Prepare Twilio message format
   */
  private prepareTwilioMessage(message: SMSMessage): any {
    const twilioMessage = {
      From: this.fromNumber,
      To: message.recipient.phone,
      Body: message.content.text,
    };

    // Add optional parameters
    if (message.metadata?.notificationId) {
      twilioMessage.StatusCallback = `${process.env.TWILIO_WEBHOOK_URL || 'https://yourdomain.com/api/webhooks/twilio'}`;
    }

    // Add custom parameters
    if (message.metadata) {
      twilioMessage.StatusCallbackEvent = ['sent', 'delivered', 'failed', 'undelivered'];
    }

    return twilioMessage;
  }

  /**
   * Send message via Twilio API
   */
  private async sendViaAPI(message: any): Promise<any> {
    const formData = new URLSearchParams();
    Object.keys(message).forEach(key => {
      formData.append(key, message[key]);
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Map Twilio status to our communication status
   */
  private mapTwilioStatus(twilioStatus: string): CommunicationStatus {
    switch (twilioStatus.toLowerCase()) {
      case 'queued':
      case 'sending':
        return 'pending';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'undelivered':
        return 'failed';
      case 'receiving':
      case 'received':
        return 'delivered';
      default:
        return 'pending';
    }
  }

  /**
   * Calculate cost for sending SMS
   */
  private calculateCost(message: SMSMessage): number {
    // Twilio pricing varies by country
    // US: $0.0075 per SMS
    // This is a simplified calculation
    const phoneNumber = message.recipient.phone;
    
    // Check if it's a US number
    if (phoneNumber.startsWith('+1')) {
      return 0.0075; // US pricing
    }
    
    // Default to US pricing for simplicity
    // In production, you'd want to look up pricing by country
    return 0.0075;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<number> {
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Balance.json`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      const data = await response.json();
      return parseFloat(data.balance);

    } catch (error) {
      console.error('Twilio balance error:', error);
      return 0;
    }
  }

  /**
   * Get account usage statistics
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const start = startDate ? startDate.toISOString().split('T')[0] : 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate ? endDate.toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Usage/Records.json?StartDate=${start}&EndDate=${end}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      const data = await response.json();
      return data.usage_records;

    } catch (error) {
      console.error('Twilio usage stats error:', error);
      return [];
    }
  }
}

export default TwilioProvider;
