/**
 * Gmail API Provider Implementation
 * 
 * This file provides a real implementation of the Gmail API provider
 * for sending emails directly through Gmail.
 */

import { google } from 'googleapis';
import {
  EmailMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  ICommunicationProvider,
  EmailProvider,
} from '@/types/communication-types';

/**
 * Gmail API Provider Implementation
 */
export class GmailAPIProvider implements ICommunicationProvider {
  providerType: EmailProvider = 'gmail-api';
  private oauth2Client: any;
  private gmail: any;
  private fromEmail: string;

  constructor(config: any) {
    this.fromEmail = config.fromEmail;
    
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri || 'http://localhost:3000/auth/gmail/callback'
    );

    // Set credentials if provided
    if (config.accessToken && config.refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
      });
    }

    // Initialize Gmail API
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Send email via Gmail API
   */
  async send(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      // Check if we have valid credentials
      if (!this.oauth2Client.credentials.access_token) {
        throw new Error('Gmail API access token is required. Please authenticate first.');
      }

      // Prepare Gmail API message
      const rawMessage = this.prepareGmailMessage(message);

      // Send via Gmail API
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      return {
        success: true,
        messageId: message.id,
        providerId: response.data.id,
        status: 'sent',
        cost: 0, // Gmail API is free
        currency: 'USD',
      };

    } catch (error) {
      console.error('Gmail API send error:', error);
      
      // Try to refresh token if it's expired
      if (error.message?.includes('invalid_grant') || error.message?.includes('expired')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry sending
          return this.send(message);
        }
      }
      
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message status from Gmail API
   */
  async getStatus(messageId: string): Promise<CommunicationStatus> {
    try {
      if (!this.oauth2Client.credentials.access_token) {
        throw new Error('Gmail API access token is required');
      }

      // Get message details from Gmail API
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      // Gmail API doesn't provide detailed delivery status
      // Messages in the API are considered delivered
      return 'delivered';

    } catch (error) {
      console.error('Gmail API status error:', error);
      return 'failed';
    }
  }

  /**
   * Validate Gmail API configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.oauth2Client.credentials.access_token) {
        return false;
      }

      // Test API access by getting user profile
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });

      return response.data.emailAddress === this.fromEmail;
    } catch (error) {
      console.error('Gmail API validation error:', error);
      return false;
    }
  }

  /**
   * Get cost estimate for sending email
   */
  async getCostEstimate(message: EmailMessage): Promise<number> {
    // Gmail API is free
    return 0;
  }

  /**
   * Prepare Gmail API message format
   */
  private prepareGmailMessage(message: EmailMessage): string {
    const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);
    
    let rawMessage = '';
    
    // Headers
    rawMessage += `From: ${this.fromEmail}\r\n`;
    rawMessage += `To: ${message.recipient.email}\r\n`;
    rawMessage += `Subject: ${message.content.subject}\r\n`;
    rawMessage += `MIME-Version: 1.0\r\n`;
    rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    rawMessage += `\r\n`;

    // Text part
    if (message.content.text) {
      rawMessage += `--${boundary}\r\n`;
      rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n`;
      rawMessage += `\r\n`;
      rawMessage += `${message.content.text}\r\n`;
    }

    // HTML part
    if (message.content.html) {
      rawMessage += `--${boundary}\r\n`;
      rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
      rawMessage += `\r\n`;
      rawMessage += `${message.content.html}\r\n`;
    }

    // Close boundary
    rawMessage += `--${boundary}--\r\n`;

    // Encode in base64url format
    return Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Set credentials manually
   */
  setCredentials(tokens: any): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Get current credentials
   */
  getCredentials(): any {
    return this.oauth2Client.credentials;
  }

  /**
   * Refresh access token if needed
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken || !this.clientId || !this.clientSecret) {
        return false;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      return true;
    } catch (error) {
      console.error('Gmail API token refresh error:', error);
      return false;
    }
  }
}

export default GmailAPIProvider;
