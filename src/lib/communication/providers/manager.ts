/**
 * Provider Manager
 * 
 * Handles provider initialization, management, and health checking.
 * Extracted from CommunicationService for better provider management.
 */

import { log } from '@/lib/services';
import { CommunicationConfig, EmailProvider, SMSProvider } from '../core/types';

/**
 * Provider Manager Class
 */
export class ProviderManager {
  private emailProviders: Map<EmailProvider, any> = new Map();
  private smsProviders: Map<SMSProvider, any> = new Map();
  private config: CommunicationConfig;

  constructor(config: CommunicationConfig) {
    this.config = config;
  }

  /**
   * Initialize all providers
   */
  async initializeProviders(): Promise<void> {
    try {
      await this.initializeEmailProviders();
      await this.initializeSMSProviders();
      log.info('Communication providers initialized successfully');
    } catch (error) {
      log.error('Failed to initialize communication providers:', error);
      throw error;
    }
  }

  /**
   * Initialize email providers
   */
  private async initializeEmailProviders(): Promise<void> {
    const { provider } = this.config.providers.email;

    try {
      switch (provider) {
        case 'sendgrid':
          const { SendGridProvider } = await import('./email/SendGridProvider');
          this.emailProviders.set('sendgrid', new SendGridProvider(this.config.providers.email));
          break;
        case 'gmail-api':
          const { GmailAPIProvider } = await import('./email/GmailAPIProvider');
          this.emailProviders.set('gmail-api', new GmailAPIProvider(this.config.providers.email));
          break;
        case 'gmail-smtp':
          const { GmailSMTPProvider } = await import('./email/GmailSMTPProvider');
          this.emailProviders.set('gmail-smtp', new GmailSMTPProvider(this.config.providers.email));
          break;
        default:
          log.warn(`Email provider ${provider} not implemented yet`);
      }
    } catch (error) {
      log.error(`Failed to initialize email provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Initialize SMS providers
   */
  private async initializeSMSProviders(): Promise<void> {
    const { provider } = this.config.providers.sms;

    try {
      switch (provider) {
        case 'twilio':
          const { TwilioProvider } = await import('./sms/TwilioProvider');
          this.smsProviders.set('twilio', new TwilioProvider(this.config.providers.sms));
          break;
        default:
          log.warn(`SMS provider ${provider} not implemented yet`);
      }
    } catch (error) {
      log.error(`Failed to initialize SMS provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get email provider
   */
  getEmailProvider(): any {
    const provider = this.config.providers.email.provider;
    const emailProvider = this.emailProviders.get(provider);
    
    if (!emailProvider) {
      throw new Error(`Email provider ${provider} not available`);
    }
    
    return emailProvider;
  }

  /**
   * Get SMS provider
   */
  getSMSProvider(): any {
    const provider = this.config.providers.sms.provider;
    const smsProvider = this.smsProviders.get(provider);
    
    if (!smsProvider) {
      throw new Error(`SMS provider ${provider} not available`);
    }
    
    return smsProvider;
  }

  /**
   * Check provider health
   */
  async checkProviderHealth(): Promise<{
    email: { provider: string; status: 'healthy' | 'unhealthy'; error?: string };
    sms: { provider: string; status: 'healthy' | 'unhealthy'; error?: string };
  }> {
    const results: {
      email: { provider: string; status: 'healthy' | 'unhealthy'; error?: string };
      sms: { provider: string; status: 'healthy' | 'unhealthy'; error?: string };
    } = {
      email: { provider: this.config.providers.email.provider, status: 'healthy' },
      sms: { provider: this.config.providers.sms.provider, status: 'healthy' }
    };

    // Check email provider
    try {
      const emailProvider = this.getEmailProvider();
      if (emailProvider && typeof emailProvider.validateConfiguration === 'function') {
        const isValid = await emailProvider.validateConfiguration();
        if (!isValid) {
          results.email.status = 'unhealthy';
          results.email.error = 'Configuration validation failed';
        }
      }
    } catch (error) {
      results.email.status = 'unhealthy';
      results.email.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check SMS provider
    try {
      const smsProvider = this.getSMSProvider();
      if (smsProvider && typeof smsProvider.validateConfiguration === 'function') {
        const isValid = await smsProvider.validateConfiguration();
        if (!isValid) {
          results.sms.status = 'unhealthy';
          results.sms.error = 'Configuration validation failed';
        }
      }
    } catch (error) {
      results.sms.status = 'unhealthy';
      results.sms.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<{
    email: { provider: string; available: boolean };
    sms: { provider: string; available: boolean };
  }> {
    return {
      email: {
        provider: this.config.providers.email.provider,
        available: this.emailProviders.has(this.config.providers.email.provider)
      },
      sms: {
        provider: this.config.providers.sms.provider,
        available: this.smsProviders.has(this.config.providers.sms.provider)
      }
    };
  }

  /**
   * Reload provider configuration
   */
  async reloadProviders(newConfig: CommunicationConfig): Promise<void> {
    this.config = newConfig;
    this.emailProviders.clear();
    this.smsProviders.clear();
    await this.initializeProviders();
  }

  /**
   * Get available email providers
   */
  getAvailableEmailProviders(): EmailProvider[] {
    return Array.from(this.emailProviders.keys());
  }

  /**
   * Get available SMS providers
   */
  getAvailableSMSProviders(): SMSProvider[] {
    return Array.from(this.smsProviders.keys());
  }

  /**
   * Check if provider is available
   */
  isEmailProviderAvailable(provider: EmailProvider): boolean {
    return this.emailProviders.has(provider);
  }

  /**
   * Check if SMS provider is available
   */
  isSMSProviderAvailable(provider: SMSProvider): boolean {
    return this.smsProviders.has(provider);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: EmailProvider | SMSProvider): any {
    if (this.emailProviders.has(provider as EmailProvider)) {
      return this.config.providers.email;
    }
    
    if (this.smsProviders.has(provider as SMSProvider)) {
      return this.config.providers.sms;
    }
    
    throw new Error(`Provider ${provider} not found`);
  }

  /**
   * Test provider connection
   */
  async testProviderConnection(provider: EmailProvider | SMSProvider): Promise<boolean> {
    try {
      if (this.emailProviders.has(provider as EmailProvider)) {
        const emailProvider = this.emailProviders.get(provider as EmailProvider);
        return await emailProvider.validateConfiguration();
      }
      
      if (this.smsProviders.has(provider as SMSProvider)) {
        const smsProvider = this.smsProviders.get(provider as SMSProvider);
        return await smsProvider.validateConfiguration();
      }
      
      return false;
    } catch (error) {
      log.error(`Provider connection test failed for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get provider cost estimate
   */
  async getProviderCostEstimate(provider: EmailProvider | SMSProvider, message: any): Promise<number> {
    try {
      if (this.emailProviders.has(provider as EmailProvider)) {
        const emailProvider = this.emailProviders.get(provider as EmailProvider);
        return await emailProvider.getCostEstimate(message);
      }
      
      if (this.smsProviders.has(provider as SMSProvider)) {
        const smsProvider = this.smsProviders.get(provider as SMSProvider);
        return await smsProvider.getCostEstimate(message);
      }
      
      return 0;
    } catch (error) {
      log.error(`Cost estimate failed for ${provider}:`, error);
      return 0;
    }
  }

  /**
   * Get provider status
   */
  async getProviderStatus(provider: EmailProvider | SMSProvider, messageId: string): Promise<string> {
    try {
      if (this.emailProviders.has(provider as EmailProvider)) {
        const emailProvider = this.emailProviders.get(provider as EmailProvider);
        return await emailProvider.getStatus(messageId);
      }
      
      if (this.smsProviders.has(provider as SMSProvider)) {
        const smsProvider = this.smsProviders.get(provider as SMSProvider);
        return await smsProvider.getStatus(messageId);
      }
      
      return 'unknown';
    } catch (error) {
      log.error(`Status check failed for ${provider}:`, error);
      return 'unknown';
    }
  }
}

/**
 * Create provider manager instance
 */
export function createProviderManager(config: CommunicationConfig): ProviderManager {
  return new ProviderManager(config);
}

/**
 * Initialize providers with configuration
 */
export async function initializeProviders(config: CommunicationConfig): Promise<ProviderManager> {
  const manager = new ProviderManager(config);
  await manager.initializeProviders();
  return manager;
}
