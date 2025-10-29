/**
 * Provider Manager
 * 
 * Real implementation for managing communication providers.
 * Supports Nodemailer (primary), SendGrid (backup), and Twilio (SMS).
 */

import { CommunicationConfig } from '../../../types/communication';
import { BaseEmailProvider } from './email/EmailProvider';
import { BaseSMSProvider } from './sms/SMSProvider';
import { NodemailerProvider } from './email/NodemailerProvider';
import { SendGridProvider } from './email/SendGridProvider';
import { TwilioProvider } from './sms/TwilioProvider';
import { log } from '../../logging';

export interface IProviderManager {
  initializeProviders(): Promise<void>;
  getEmailProvider(): BaseEmailProvider | null;
  getSMSProvider(): BaseSMSProvider | null;
  checkProviderHealth(): Promise<Record<string, boolean>>;
  getProviderStats(): Record<string, any>;
  testProviderConnection(provider: string): Promise<boolean>;
  getProviderCostEstimate(provider: string, messageCount: number): Promise<number>;
  getProviderStatus(provider: string): Promise<string>;
  reloadProviders(): Promise<void>;
}

export class ProviderManager implements IProviderManager {
  private emailProvider: BaseEmailProvider | null = null;
  private smsProvider: BaseSMSProvider | null = null;
  private config: CommunicationConfig;
  private initialized = false;

  constructor(config: CommunicationConfig) {
    this.config = config;
  }

  async initializeProviders(): Promise<void> {
    if (this.initialized) {
      return;
    }

    log.info('Initializing communication providers', {
      category: 'communication',
      operation: 'provider_init_start',
      emailProvider: this.config.providers.email.provider,
      smsProvider: this.config.providers.sms.provider
    });

    try {
      // Initialize email provider
      if (this.config.providers.email.provider === 'sendgrid') {
        this.emailProvider = new SendGridProvider(this.config.providers.email);
      } else {
        this.emailProvider = new NodemailerProvider(this.config.providers.email);
      }

      // Initialize SMS provider
      this.smsProvider = new TwilioProvider(this.config.providers.sms);

      // Test connections
      await this.testConnections();

      this.initialized = true;

      log.info('Communication providers initialized successfully', {
        category: 'communication',
        operation: 'provider_init_complete',
        emailProvider: this.emailProvider.providerType,
        smsProvider: this.smsProvider.providerType
      });
    } catch (error) {
      log.error('Failed to initialize communication providers', {
        category: 'communication',
        operation: 'provider_init_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  getEmailProvider(): BaseEmailProvider | null {
    return this.emailProvider;
  }

  getSMSProvider(): BaseSMSProvider | null {
    return this.smsProvider;
  }

  async checkProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    if (this.emailProvider) {
      try {
        health['email'] = await this.emailProvider.validateConfiguration();
      } catch {
        health['email'] = false;
      }
    }

    if (this.smsProvider) {
      try {
        health['sms'] = await this.smsProvider.validateConfiguration();
      } catch {
        health['sms'] = false;
      }
    }

    return health;
  }

  getProviderStats(): Record<string, any> {
    return {
      email: {
        provider: this.emailProvider?.providerType || 'none',
        initialized: !!this.emailProvider
      },
      sms: {
        provider: this.smsProvider?.providerType || 'none',
        initialized: !!this.smsProvider
      }
    };
  }

  async testProviderConnection(provider: string): Promise<boolean> {
    switch (provider) {
      case 'email':
        return this.emailProvider ? await this.emailProvider.validateConfiguration() : false;
      case 'sms':
        return this.smsProvider ? await this.smsProvider.validateConfiguration() : false;
      default:
        return false;
    }
  }

  async getProviderCostEstimate(provider: string, messageCount: number): Promise<number> {
    // Simplified cost estimation
    switch (provider) {
      case 'email':
        return 0; // Nodemailer/SMTP is free
      case 'sms':
        return messageCount * 0.0075; // Twilio pricing
      default:
        return 0;
    }
  }

  async getProviderStatus(provider: string): Promise<string> {
    const health = await this.checkProviderHealth();
    return health[provider] ? 'active' : 'inactive';
  }

  async reloadProviders(): Promise<void> {
    this.initialized = false;
    this.emailProvider = null;
    this.smsProvider = null;
    await this.initializeProviders();
  }

  private async testConnections(): Promise<void> {
    if (this.emailProvider) {
      const emailValid = await this.emailProvider.validateConfiguration();
      if (!emailValid) {
        throw new Error('Email provider configuration is invalid');
      }
    }

    if (this.smsProvider) {
      const smsValid = await this.smsProvider.validateConfiguration();
      if (!smsValid) {
        throw new Error('SMS provider configuration is invalid');
      }
    }
  }
}

export function createProviderManager(config: CommunicationConfig): IProviderManager {
  return new ProviderManager(config);
}