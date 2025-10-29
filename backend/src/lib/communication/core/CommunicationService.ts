/**
 * Communication Service
 * 
 * Simplified communication service for email and SMS.
 * Direct provider instantiation without complex abstractions.
 */

import { 
  CommunicationConfig,
  EmailMessage,
  SMSMessage,
  CommunicationServiceResponse,
  CommunicationEventType,
  CommunicationEventData
} from '../../../types/communication';
import { getCommunicationConfig, validateCommunicationConfig, isEmailEnabled, isSMSEnabled } from './config';
import { log } from '../../logging';
import { NodemailerProvider } from '../providers/email/NodemailerProvider';
import { TwilioProvider } from '../providers/sms/TwilioProvider';
import { validateEmail, validatePhoneNumber } from '../utils/validation';
import { handleCommunicationEvent } from '../events';

/**
 * Communication Service Class
 * 
 * Singleton service for managing all communication operations.
 * Provides unified API for email and SMS communication.
 */
export class CommunicationService {
  private static instance: CommunicationService;
  private config: CommunicationConfig;
  private emailProvider: NodemailerProvider | null = null;
  private smsProvider: TwilioProvider | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = getCommunicationConfig();
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
      log.info('Initializing communication service...', {
        category: 'communication',
        operation: 'service_init_start'
      });
      
      // Validate configuration
      const validation = validateCommunicationConfig(this.config);
      if (!validation.isValid) {
        log.error('Configuration validation failed', undefined, {
          category: 'communication',
          operation: 'config_validation_error',
          errors: validation.errors
        });
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      // Initialize email provider
      if (isEmailEnabled()) {
        this.emailProvider = new NodemailerProvider(this.config.providers.email);
        const emailValid = await this.emailProvider.validateConfiguration();
        if (!emailValid) {
          throw new Error('Email provider configuration is invalid');
        }
      }

      // Initialize SMS provider
      if (isSMSEnabled()) {
        this.smsProvider = new TwilioProvider(this.config.providers.sms);
        const smsValid = await this.smsProvider.validateConfiguration();
        if (!smsValid) {
          throw new Error('SMS provider configuration is invalid');
        }
      }

      this.isInitialized = true;
      
      const duration = log.endTimer(timerId);
      log.info('Communication service initialized successfully', {
        category: 'communication',
        operation: 'service_init_complete',
        emailProvider: this.config.providers.email.provider,
        smsProvider: this.config.providers.sms.provider,
        duration
      });
    } catch (error) {
      const duration = log.endTimer(timerId);
      log.error('Failed to initialize communication service', error, {
        category: 'communication',
        operation: 'service_init_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      throw error;
    }
  }

  /**
   * Send email message
   */
  public async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    const timerId = `email_${message.id}`;
    
    try {
      // Log send attempt
      log.info('Sending email', {
        category: 'communication',
        operation: 'email_send',
        messageId: message.id,
        priority: message.priority,
        recipient: message.recipient.email,
        subject: message.content.subject
      });
      
      // Validate message
      if (!this.validateEmailMessage(message)) {
        throw new Error('Email validation failed');
      }

      if (!this.emailProvider) {
        throw new Error('Email provider not available');
      }
      
      // Send email
      log.startTimer(timerId);
      const response = await this.emailProvider.send(message);
      const duration = log.endTimer(timerId);
      
      // Log result
      if (response.success) {
        log.info('Email sent successfully', {
          category: 'communication',
          operation: 'email_success',
          messageId: message.id,
          status: response.status,
          duration,
          cost: response.cost
        });
      } else {
        log.error('Email send failed', response.error, {
          category: 'communication',
          operation: 'email_failed',
          messageId: message.id,
          status: response.status,
          duration
        });
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
      
      // Log error
      log.error('Email send error', error, {
        category: 'communication',
        operation: 'email_error',
        messageId: message.id,
        duration
      });
      
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

      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send SMS message
   */
  public async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    const timerId = `sms_${message.id}`;
    
    try {
      // Log send attempt
      log.info('Sending SMS', {
        category: 'communication',
        operation: 'sms_send',
        messageId: message.id,
        priority: message.priority,
        recipient: message.recipient.phone,
        textLength: message.content.text.length
      });
      
      // Validate message
      if (!this.validateSMSMessage(message)) {
        throw new Error('SMS validation failed');
      }

      if (!this.smsProvider) {
        throw new Error('SMS provider not available');
      }
      
      // Send SMS
      log.startTimer(timerId);
      const response = await this.smsProvider.send(message);
      const duration = log.endTimer(timerId);
      
      // Log result
      if (response.success) {
        log.info('SMS sent successfully', {
          category: 'communication',
          operation: 'sms_success',
          messageId: message.id,
          status: response.status,
          duration,
          cost: response.cost
        });
      } else {
        log.error('SMS send failed', response.error, {
          category: 'communication',
          operation: 'sms_failed',
          messageId: message.id,
          status: response.status,
          duration
        });
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
      
      // Log error
      log.error('SMS send error', error, {
        category: 'communication',
        operation: 'sms_error',
        messageId: message.id,
        duration
      });
      
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

      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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

    log.info('Starting batch send', {
      category: 'communication',
      operation: 'batch_start',
      messageCount: messages.length,
      batchSize,
      totalBatches: Math.ceil(messages.length / batchSize)
    });

    try {
      log.startTimer(timerId);
      
      // Process messages in batches
      const batches = this.chunkArray(messages, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch) continue;
        
        log.debug(`Processing batch ${i + 1}/${batches.length}`, {
          category: 'communication',
          operation: 'batch_process',
          batchNumber: i + 1,
          batchSize: batch.length
        });

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

      log.info('Batch send completed', {
        category: 'communication',
        operation: 'batch_complete',
        messageCount: messages.length,
        duration,
        successCount,
        failureCount,
        successRate: (successCount / messages.length) * 100,
        batchCount: batches.length
      });

      return responses;
    } catch (error) {
      const duration = log.endTimer(timerId);
      log.error('Batch send failed', error, {
        category: 'communication',
        operation: 'batch_failed',
        messageCount: messages.length,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        processedCount: responses.length
      });
      throw error;
    }
  }

  /**
   * Validate email message
   */
  private validateEmailMessage(message: EmailMessage): boolean {
    if (!message.recipient.email || !validateEmail(message.recipient.email)) {
      return false;
    }
    if (!message.content.subject || message.content.subject.trim().length === 0) {
      return false;
    }
    if (!message.content.text && !message.content.html) {
      return false;
    }
    return true;
  }

  /**
   * Validate SMS message
   */
  private validateSMSMessage(message: SMSMessage): boolean {
    if (!message.recipient.phone || !validatePhoneNumber(message.recipient.phone)) {
      return false;
    }
    if (!message.content.text || message.content.text.trim().length === 0) {
      return false;
    }
    return true;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
   * Check if service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    this.isInitialized = false;
    this.emailProvider = null;
    this.smsProvider = null;
    log.info('Communication service shutdown', {
      category: 'communication',
      operation: 'service_shutdown'
    });
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