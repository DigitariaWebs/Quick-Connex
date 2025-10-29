/**
 * Communication Service
 * 
 * Main communication service with dual-token system integration.
 * Handles email, SMS, and other communication channels.
 */

import { 
  CommunicationConfig,
  EmailMessage,
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationChannel,
  CommunicationEventType,
  CommunicationEventData,
  UserCommunicationPreferences,
  CommunicationTemplate,
  CommunicationContent,
  CommunicationAnalytics,
  CommunicationRecipient
} from '../../../types/communication';
import { getCommunicationConfig, validateCommunicationConfig } from './config';
import { log } from '../../logging';

// Import provider manager (will be created)
import { IProviderManager } from '../../communication/providers/manager';

// Import logging utilities
import {
  sanitizeRecipient,
  createCommunicationContext
} from '../../communication/utils/logger';

// Import utilities (will be created)
import {
  validateEmailMessage,
  validateSMSMessage,
  formatPhoneNumberForMessage,
  isChannelEnabledForUser,
  chunkArray
} from '../../communication/utils/helpers';

// Rate limiting utilities (imported but not used yet)
// import { 
//   shouldRetryMessage,
//   getRetryDelay,
//   applyRateLimit,
//   getRateLimitStatus
// } from '../../communication/utils/rate-limiter';

import {
  createEmailFromNotification,
  createSMSFromNotification,
  getSMSTemplates
} from '../../communication/templates';

import { TemplateService } from '../templates/core/TemplateService';

import {
  handleCommunicationError
} from '../../communication/errors';

import {
  handleCommunicationEvent
} from '../../communication/events';

/**
 * Communication Service Class
 * 
 * Singleton service for managing all communication operations.
 * Provides unified API for email and SMS communication.
 */
export class CommunicationService {
  private static instance: CommunicationService;
  private config: CommunicationConfig;
  private providerManager: IProviderManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = getCommunicationConfig();
    this.providerManager = null as any; // Will be initialized
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const timerId = 'service_init';
    log.startTimer(timerId);
    
    try {
      log.info('Initializing communication service...', createCommunicationContext('service_init_start'));
      
      // Validate configuration
      const validation = validateCommunicationConfig(this.config);
      if (!validation.isValid) {
        log.error('Configuration validation failed', undefined, createCommunicationContext('config_validation_error', {
          errors: validation.errors
        }));
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize provider manager
      const { createProviderManager } = await import('../../communication/providers/manager');
      this.providerManager = createProviderManager(this.config);
      await this.providerManager.initializeProviders();

      // Initialize template system
      await this.initializeTemplateSystem();

      this.isInitialized = true;
      
      const duration = log.endTimer(timerId);
      log.info('Communication service initialized successfully', createCommunicationContext('service_init_complete', {
        emailProvider: this.config.providers.email.provider,
        smsProvider: this.config.providers.sms.provider,
        duration
      }));
    } catch (error) {
      const duration = log.endTimer(timerId);
      log.error('Failed to initialize communication service', error, createCommunicationContext('service_init_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }));
      throw error;
    }
  }

  /**
   * Send email message
   */
  public async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    const timerId = `email_${message.id}`;
    const provider = this.config.providers.email.provider;
    
    try {
      // Log send attempt
      log.info('Sending email', createCommunicationContext('email_send', {
        messageId: message.id,
        provider,
        priority: message.priority,
        recipient: sanitizeRecipient(message.recipient),
        subject: message.content.subject,
        hasAttachments: (message.content.attachments?.length || 0) > 0
      }));
      
      // Validate message
      const validation = validateEmailMessage(message);
      if (!validation.isValid) {
        log.error('Email validation failed', undefined, createCommunicationContext('email_validation_error', {
          messageId: message.id,
          errors: validation.errors
        }));
        throw new Error(`Email validation failed: ${validation.errors.join(', ')}`);
      }

      // Get email provider
      const emailProvider = this.providerManager.getEmailProvider();
      if (!emailProvider) {
        throw new Error('Email provider not available');
      }
      
      // Send email
      log.startTimer(timerId);
      const response = await emailProvider.send(message);
      const duration = log.endTimer(timerId);
      
      // Log result
      if (response.success) {
        log.info('Email sent successfully', createCommunicationContext('email_success', {
          messageId: message.id,
          provider,
          providerId: response.providerId,
          status: response.status,
          duration,
          cost: response.cost
        }));
      } else {
        log.error('Email send failed', response.error, createCommunicationContext('email_failed', {
          messageId: message.id,
          provider,
          status: response.status,
          duration
        }));
      }
      
      // Handle communication event
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_SENT,
        messageId: message.id,
        channel: 'email',
        status: response.status,
        recipient: message.recipient,
        metadata: message.metadata || {},
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      const duration = log.endTimer(timerId);
      const errorResponse = handleCommunicationError(error).response;
      
      // Log error
      log.error('Email send error', error, createCommunicationContext('email_error', {
        messageId: message.id,
        provider,
        duration
      }));
      
      // Handle communication event for failure
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'email',
        status: 'failed',
        recipient: message.recipient,
        metadata: message.metadata || {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      return errorResponse;
    }
  }

  /**
   * Send SMS message
   */
  public async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    const timerId = `sms_${message.id}`;
    const provider = this.config.providers.sms.provider;
    
    try {
      // Log send attempt
      log.info('Sending SMS', createCommunicationContext('sms_send', {
        messageId: message.id,
        provider,
        priority: message.priority,
        recipient: sanitizeRecipient(message.recipient),
        textLength: message.content.text.length,
        segments: Math.ceil(message.content.text.length / 160)
      }));
      
      // Validate message
      const validation = validateSMSMessage(message);
      if (!validation.isValid) {
        log.error('SMS validation failed', undefined, createCommunicationContext('sms_validation_error', {
          messageId: message.id,
          errors: validation.errors
        }));
        throw new Error(`SMS validation failed: ${validation.errors.join(', ')}`);
      }

      // Format phone number
      const formattedMessage = formatPhoneNumberForMessage(message);

      // Get SMS provider
      const smsProvider = this.providerManager.getSMSProvider();
      if (!smsProvider) {
        throw new Error('SMS provider not available');
      }
      
      // Send SMS
      log.startTimer(timerId);
      const response = await smsProvider.send(formattedMessage);
      const duration = log.endTimer(timerId);
      
      // Log result
      if (response.success) {
        log.info('SMS sent successfully', createCommunicationContext('sms_success', {
          messageId: message.id,
          provider,
          providerId: response.providerId,
          status: response.status,
          duration,
          cost: response.cost
        }));
      } else {
        log.error('SMS send failed', response.error, createCommunicationContext('sms_failed', {
          messageId: message.id,
          provider,
          status: response.status,
          duration
        }));
      }
      
      // Handle communication event
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_SENT,
        messageId: message.id,
        channel: 'sms',
        status: response.status,
        recipient: message.recipient,
        metadata: message.metadata || {},
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      const duration = log.endTimer(timerId);
      const errorResponse = handleCommunicationError(error).response;
      
      // Log error
      log.error('SMS send error', error, createCommunicationContext('sms_error', {
        messageId: message.id,
        provider,
        duration
      }));
      
      // Handle communication event for failure
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'sms',
        status: 'failed',
        recipient: message.recipient,
        metadata: message.metadata || {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      return errorResponse;
    }
  }

  /**
   * Send notification to user
   */
  public async sendNotificationToUser(
    notification: any,
    userId: string,
    channels: CommunicationChannel[] = ['email']
  ): Promise<CommunicationServiceResponse[]> {
    try {
      // This would typically query the database for user information
      // For now, we'll use a mock user object
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        phone: '+1234567890',
        firstName: 'User',
        lastName: 'Name',
        userType: 'employee'
      };

      const responses: CommunicationServiceResponse[] = [];
      const mockUserPreferences = await this.getUserPreferences(userId);

      // Use the mock data for actual processing
      console.log('Processing notification for user:', mockUser.firstName, mockUser.lastName);
      console.log('User preferences:', mockUserPreferences.email?.enabled);

      for (const channel of channels) {
        if (!isChannelEnabledForUser(userId, channel)) {
          continue;
        }

        let response: CommunicationServiceResponse;

        switch (channel) {
          case 'email':
            const emailMessage = createEmailFromNotification(notification, mockUser);
            response = await this.sendEmail(emailMessage);
            break;
          case 'sms':
            const smsMessage = createSMSFromNotification(notification, mockUser);
            response = await this.sendSMS(smsMessage);
            break;
          default:
            log.warn(`Channel ${channel} not supported for notifications`);
            continue;
        }

        responses.push(response);
      }

      return responses;
    } catch (error) {
      log.error('Error sending notification to user:', error);
      throw error;
    }
  }

  /**
   * Send batch messages
   */
  public async sendBatchMessages(
    messages: (EmailMessage | SMSMessage)[],
    options: { batchSize?: number; delay?: number } = {}
  ): Promise<CommunicationServiceResponse[]> {
    const { batchSize = 10, delay = 1000 } = options;
    const responses: CommunicationServiceResponse[] = [];
    const timerId = 'batch_send';

    const channels = messages.map(m => m.channel);
    const emailCount = channels.filter(c => c === 'email').length;
    const smsCount = channels.filter(c => c === 'sms').length;

    log.info('Starting batch send', createCommunicationContext('batch_start', {
      messageCount: messages.length,
      emailCount,
      smsCount,
      batchSize,
      totalBatches: Math.ceil(messages.length / batchSize)
    }));

    try {
      log.startTimer(timerId);
      
      // Process messages in batches
      const batches = chunkArray(messages, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;
        
        log.debug(`Processing batch ${i + 1}/${batches.length}`, createCommunicationContext('batch_process', {
          batchNumber: i + 1,
          batchSize: batch.length
        }));

        const batchPromises = batch.map(async (message: EmailMessage | SMSMessage) => {
          if (message.channel === 'email') {
            return await this.sendEmail(message as EmailMessage);
          } else if (message.channel === 'sms') {
            return await this.sendSMS(message as SMSMessage);
          }
          throw new Error(`Unsupported channel: ${(message as any).channel}`);
        });

        const batchResponses = await Promise.all(batchPromises);
        responses.push(...batchResponses);

        // Add delay between batches
        if (delay > 0 && i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const duration = log.endTimer(timerId);
      const successCount = responses.filter(r => r.success).length;
      const failureCount = responses.length - successCount;

      log.info('Batch send completed', createCommunicationContext('batch_complete', {
        messageCount: messages.length,
        duration,
        successCount,
        failureCount,
        successRate: (successCount / messages.length) * 100,
        batchCount: batches.length
      }));

      return responses;
    } catch (error) {
      const duration = log.endTimer(timerId);
      log.error('Batch send failed', error, createCommunicationContext('batch_failed', {
        messageCount: messages.length,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedCount: responses.length
      }));
      throw error;
    }
  }

  /**
   * Get user communication preferences
   */
  public async getUserPreferences(_userId: string): Promise<UserCommunicationPreferences> {
    // This would typically query a user preferences table
    // For now, return default preferences
    return {
      userId: _userId,
      email: {
        enabled: true,
        frequency: 'immediate',
        types: ['all'],
        format: 'html',
        language: 'en',
        timezone: 'UTC',
        filters: [],
        digest: {
          enabled: false,
          frequency: 'daily',
          time: '09:00',
          types: []
        }
      },
      sms: {
        enabled: true,
        frequency: 'immediate',
        types: ['urgent'],
        language: 'en',
        timezone: 'UTC',
        filters: [],
        emergency: {
          enabled: true,
          alwaysReceive: true,
          overrideQuietHours: true
        }
      },
      push: {
        enabled: true,
        frequency: 'immediate',
        types: ['all'],
        sound: true,
        vibration: true,
        badge: true,
        filters: [],
        channels: []
      },
      global: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        theme: 'light',
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false
        },
        privacy: {
          dataRetention: 365,
          analytics: true,
          personalization: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update user communication preferences
   */
  public async updateUserPreferences(userId: string, preferences: UserCommunicationPreferences): Promise<void> {
    // This would typically update a user preferences table
    log.info(`Updating communication preferences for user ${userId}:`, preferences);
  }

  /**
   * Get communication templates
   */
  public async getTemplates(channel?: CommunicationChannel): Promise<CommunicationTemplate[]> {
    if (channel === 'sms') {
      return getSMSTemplates();
    }
    
    // Email templates would be loaded from a template system
    return [];
  }

  /**
   * Render communication template
   */
  public async renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
    try {
      const templateService = TemplateService.getInstance();
      
      // Try to detect channel from templateId or data
      let channel: CommunicationChannel = 'email';
      if (templateId.includes('_sms') || data['channel'] === 'sms') {
        channel = 'sms';
      } else if (templateId.includes('_email') || data['channel'] === 'email') {
        channel = 'email';
      }
      
      const result = await templateService.renderTemplate({
        templateId,
        data,
        channel,
        useCache: true
      });
      
      if (!result.success || !result.content) {
        throw new Error(`Failed to render template: ${result.error}`);
      }
      
      return result.content;
    } catch (error) {
      log.error('Template rendering failed', 
        createCommunicationContext('communication_service_render_error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Initialize template system
   */
  private async initializeTemplateSystem(): Promise<void> {
    try {
      const { TemplateRepository } = await import('../templates/core/TemplateRepository');
      const { EMAIL_TEMPLATES } = await import('../templates/definitions/email-templates');
      const { SMS_TEMPLATES } = await import('../templates/definitions/sms-templates');
      
      const repository = TemplateRepository.getInstance();
      
      // Register all code templates
      repository.registerCodeTemplates([...EMAIL_TEMPLATES, ...SMS_TEMPLATES]);
      
      log.info('Template system initialized', 
        createCommunicationContext('template_init', {
          emailTemplates: EMAIL_TEMPLATES.length,
          smsTemplates: SMS_TEMPLATES.length
        })
      );
    } catch (error) {
      log.error('Failed to initialize template system', 
        createCommunicationContext('template_init_error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Get provider health status
   */
  public async getProviderHealth(): Promise<any> {
    return await this.providerManager.checkProviderHealth();
  }

  /**
   * Get provider statistics
   */
  public async getProviderStats(): Promise<any> {
    return await this.providerManager.getProviderStats();
  }

  /**
   * Test provider connection
   */
  public async testProviderConnection(provider: string): Promise<boolean> {
    return await this.providerManager.testProviderConnection(provider);
  }

  /**
   * Get cost estimate for message
   */
  public async getCostEstimate(provider: string, messageCount: number): Promise<number> {
    return await this.providerManager.getProviderCostEstimate(provider, messageCount);
  }

  /**
   * Get message status
   */
  public async getMessageStatus(_messageId: string): Promise<string> {
    // This would typically query the provider for message status
    return 'sent';
  }

  /**
   * Get communication analytics
   */
  public async getAnalytics(_timeRange?: { start: Date; end: Date }): Promise<CommunicationAnalytics> {
    // This would typically query analytics data from the database
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalBounced: 0,
      deliveryRate: 0,
      failureRate: 0,
      averageDeliveryTime: 0,
      costByChannel: {
        email: 0,
        sms: 0,
        push: 0,
        realtime: 0
      },
      volumeByChannel: {
        email: 0,
        sms: 0,
        push: 0,
        realtime: 0
      },
      volumeByTime: {},
      topFailureReasons: []
    };
  }

  /**
   * Validate recipient
   */
  public async validateRecipient(recipient: CommunicationRecipient): Promise<boolean> {
    // Basic validation logic
    if (!recipient.email && !recipient.phone) {
      return false;
    }
    
    if (recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
      return false;
    }
    
    if (recipient.phone && !/^\+?[1-9]\d{1,14}$/.test(recipient.phone)) {
      return false;
    }
    
    return true;
  }

  /**
   * Handle communication event
   */
  private async handleCommunicationEvent(eventData: CommunicationEventData): Promise<void> {
    try {
      await handleCommunicationEvent(eventData);
    } catch (error) {
      log.error('Error handling communication event:', error);
    }
  }

  /**
   * Get service configuration
   */
  public getConfig(): CommunicationConfig {
    return this.config;
  }

  /**
   * Update service configuration
   */
  public async updateConfig(newConfig: Partial<CommunicationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize providers if needed
    if (this.providerManager) {
      await this.providerManager.reloadProviders();
    }
  }

  /**
   * Check if service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    // Cleanup resources
    this.isInitialized = false;
    log.info('Communication service shutdown', createCommunicationContext('service_shutdown'));
  }
}

/**
 * Create CommunicationService instance
 */
export function createCommunicationService(): CommunicationService {
  return CommunicationService.getInstance();
}

/**
 * Initialize CommunicationService
 */
export async function initializeCommunicationService(): Promise<CommunicationService> {
  const service = CommunicationService.getInstance();
  await service.initialize();
  return service;
}
