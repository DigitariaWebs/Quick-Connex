/**
 * Communication Provider Types
 * 
 * Provider-specific types and configurations for email and SMS services.
 */

import { CommunicationServiceResponse, CommunicationStatus, ICommunicationProvider } from './core.types';

/**
 * Email Provider Types
 */
export type EmailProvider = 'nodemailer' | 'sendgrid';

/**
 * SMS Provider Types
 */
export type SMSProvider = 'twilio';

/**
 * Communication Provider Configuration
 */
export interface CommunicationProviderConfig {
  email: EmailProviderConfig;
  sms: SMSProviderConfig;
}

/**
 * Email Provider Configuration
 */
export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey?: string;
  apiSecret?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  // SMTP specific (for Nodemailer)
  host?: string;
  port?: number;
  secure?: boolean;
  tls?: {
    rejectUnauthorized?: boolean;
  };
}

/**
 * SMS Provider Configuration
 */
export interface SMSProviderConfig {
  provider: SMSProvider;
  accountSid: string; // For Twilio
  authToken: string; // For Twilio
  fromNumber: string;
}

/**
 * Base Email Provider Interface
 */
export interface IEmailProvider extends ICommunicationProvider {
  providerType: EmailProvider;
  send(message: any): Promise<CommunicationServiceResponse>;
  getStatus(messageId: string): Promise<CommunicationStatus>;
  validateConfiguration(): Promise<boolean>;
  getCostEstimate(message: any): Promise<number>;
}

/**
 * Base SMS Provider Interface
 */
export interface ISMSProvider extends ICommunicationProvider {
  providerType: SMSProvider;
  send(message: any): Promise<CommunicationServiceResponse>;
  getStatus(messageId: string): Promise<CommunicationStatus>;
  validateConfiguration(): Promise<boolean>;
  getCostEstimate(message: any): Promise<number>;
}

/**
 * Provider Health Status
 */
export interface ProviderHealthStatus {
  provider: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: Date;
  error?: string;
  responseTime?: number;
}

/**
 * Provider Manager Interface
 */
export interface IProviderManager {
  initializeProviders(): Promise<void>;
  getEmailProvider(): IEmailProvider | null;
  getSMSProvider(): ISMSProvider | null;
  checkProviderHealth(): Promise<Record<string, boolean>>;
  getProviderStats(): Record<string, any>;
  testProviderConnection(provider: string): Promise<boolean>;
  getProviderCostEstimate(provider: string, messageCount: number): Promise<number>;
  getProviderStatus(provider: string): Promise<string>;
  reloadProviders(): Promise<void>;
}

/**
 * Provider Statistics
 */
export interface ProviderStats {
  provider: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  lastUsed: Date;
  cost: number;
}

/**
 * Provider Error
 */
export interface ProviderError {
  code: string;
  message: string;
  provider: string;
  timestamp: Date;
  retryable: boolean;
}

