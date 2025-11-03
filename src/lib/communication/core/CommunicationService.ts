/**
 * Centralized Communication Service
 * 
 * Single source of truth for all communication operations (email, SMS).
 * Provides clean, consistent API similar to AuthService and DatabaseService.
 * Integrates with all utility modules for comprehensive functionality.
 */

import { Types } from 'mongoose';
import { DatabaseService } from '@/lib/database';
import { AuditService } from '@/lib/audit';
import { log } from '@/lib/logging';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { AuditAction, ActorType } from '@/models/AuditLog';
import { 
  retry, 
  retryWithCondition,
  withTimeout, 
  batchProcess 
} from '@/lib/utils/async-helpers';
import { 
  AppError,
  ValidationError,
  NotFoundError,
  formatErrorForClient 
} from '@/lib/utils/error-handling';
import { 
  sanitizeString, 
  sanitizeQueryInput 
} from '@/lib/utils/request-validation';
import { 
  pickFields, 
  omitFields, 
  groupBy, 
  isEmpty 
} from '@/lib/utils/data-helpers';
import { 
  formatDate, 
  formatDateTimeForDisplay,
  getCurrentTimestamp,
  isValidDate 
} from '@/lib/utils/date-time';
import { 
  truncate, 
  capitalize, 
  maskSensitiveData 
} from '@/lib/utils/string-helpers';
// Removed problematic imports - using local utilities instead
import {
  EmailMessage,
  SMSMessage,
  BaseCommunicationMessage,
  CommunicationServiceResponse,
  CommunicationStatus,
  CommunicationAnalytics,
  CommunicationRecipient,
  CommunicationContent,
  CommunicationTemplate,
  CommunicationChannel,
  CommunicationEventType,
  CommunicationEventData,
  ICommunicationEventHandler,
  CommunicationConfig,
  EmailProvider,
  SMSProvider,
  CommunicationPriority,
  UserCommunicationPreferences
} from './types';
import { getCommunicationConfig, validateCommunicationConfig } from './config';
import {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
  calculateEmailCost,
  calculateSMSCost,
  generateMessageId,
  sanitizeRecipient,
  formatMessageContent,
  shouldRetryMessage,
  getRetryDelay
} from '../utils';
import { 
  COMMUNICATION_CHANNELS,
  COMMUNICATION_PRIORITY,
  COMMUNICATION_STATUS,
  EMAIL_PROVIDERS,
  SMS_PROVIDERS,
  COMMUNICATION_CONFIG
} from './constants';

// Import new utility modules
import {
  validateEmailMessage,
  validateSMSMessage,
  formatPhoneNumberForMessage,
  isChannelEnabledForUser,
  chunkArray,
  getDefaultUserPreferences,
  isValidChannel,
  getChannelDisplayName,
  isUrgentMessage,
  getPriorityDisplayName,
  sanitizeMessageForLogging as sanitizeMessageForLoggingHelper,
  generateMessageId as generateMessageIdHelper,
  isMessageExpired,
  getMessageAge,
  isMessageStale
} from '../utils/helpers';

import { 
  shouldRetryMessage as shouldRetryMessageHelper,
  getRetryDelay as getRetryDelayHelper
} from '../utils/rate-limiter';

import {
  createEmailFromNotification,
  createSMSFromNotification,
  generateEmailHTML,
  generateSMSText,
  getSMSTemplates,
  renderEmailTemplate,
  renderSMSTemplate,
  generateTransferRequestEmailHTML,
  generateTransferApprovedEmailHTML
} from '../templates';

import {
  handleCommunicationError,
  handleProviderError,
  shouldRetryError,
  getRetryDelayForError,
  formatErrorForLogging as formatErrorForLoggingHelper,
  createErrorResponse
} from '../errors';

import {
  ProviderManager,
  createProviderManager,
  initializeProviders
} from '../providers/manager';

import {
  EventHandlerRegistry,
  createEventHandlerRegistry,
  handleCommunicationEvent
} from '../events';

/**
 * Communication Service Class
 * 
 * Singleton service for managing all communication operations.
 * Provides unified API for email and SMS communication.
 */
export class CommunicationService {
  private static instance: CommunicationService;
  private config: CommunicationConfig;
  private providerManager: ProviderManager;
  private eventHandlerRegistry: EventHandlerRegistry;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.config = getCommunicationConfig();
    this.providerManager = createProviderManager(this.config);
    this.eventHandlerRegistry = createEventHandlerRegistry();
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
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization method
   */
  private async _initialize(): Promise<void> {
    try {
      await this.providerManager.initializeProviders();
      this.initialized = true;
      log.info('Communication service initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.warn('Failed to initialize communication service providers. Some features may be unavailable:', {
        error: errorMessage
      });
      // Don't throw - allow service to continue with limited functionality
      this.initialized = false;
    }
  }

  /**
   * Ensure providers are initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.initializationPromise) {
      await this.initialize();
    } else if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Send email message
   */
  public async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      // Ensure providers are initialized
      await this.ensureInitialized();

      // Validate message
      const validation = validateEmailMessage(message);
      if (!validation.isValid) {
        throw new ValidationError(`Email validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if email provider is available
      if (!this.providerManager.isEmailProviderAvailable(this.config.providers.email.provider)) {
        const errorMessage = `Email provider ${this.config.providers.email.provider} not available`;
        log.warn(errorMessage);
        
        return {
          success: false,
          status: 'failed',
          messageId: message.id,
          error: errorMessage
        };
      }

      // Get email provider
      const emailProvider = this.providerManager.getEmailProvider();
      
      // Send email
      const response = await emailProvider.send(message);
      
      // Handle communication event
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_SENT,
        messageId: message.id,
        channel: 'email',
        status: response.status,
        recipient: message.recipient,
        metadata: message.metadata,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      log.error('Error sending email:', error);
      
      // Handle communication event for failure
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'email',
        status: 'failed',
        recipient: message.recipient,
        metadata: message.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      return handleCommunicationError(error).response;
    }
  }

  /**
   * Send SMS message with retry logic for retriable errors
   */
  public async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      // Ensure providers are initialized
      await this.ensureInitialized();

      // Validate message - don't retry validation errors
      const validation = validateSMSMessage(message);
      if (!validation.isValid) {
        const error = new ValidationError(`SMS validation failed: ${validation.errors.join(', ')}`);
        log.warn('SMS validation failed (non-retriable):', {
          messageId: message.id,
          recipient: message.recipient,
          errors: validation.errors
        });
        
        // Handle communication event for failure
        await this.handleCommunicationEvent({
          eventType: CommunicationEventType.MESSAGE_FAILED,
          messageId: message.id,
          channel: 'sms',
          status: 'failed',
          recipient: message.recipient,
          metadata: message.metadata,
          error: error.message,
          timestamp: new Date()
        });

        return {
          success: false,
          status: 'failed',
          messageId: message.id,
          error: error.message
        };
      }

      // Format phone number
      const formattedMessage = formatPhoneNumberForMessage(message);

      // Check if SMS provider is available
      if (!this.providerManager.isSMSProviderAvailable(this.config.providers.sms.provider)) {
        const errorMessage = `SMS provider ${this.config.providers.sms.provider} not available`;
        log.warn(errorMessage);
        
        return {
          success: false,
          status: 'failed',
          messageId: message.id,
          error: errorMessage
        };
      }

      // Get SMS provider
      const smsProvider = this.providerManager.getSMSProvider();
      
      // Send SMS with retry logic (only for retriable errors like network issues or server errors)
      const response = await retryWithCondition(
        async () => {
          const result = await smsProvider.send(formattedMessage);
          
          // If result indicates failure, throw to trigger retry check
          if (!result.success && result.error) {
            throw new Error(result.error);
          }
          
          return result;
        },
        // Only retry for retriable errors (server errors 5xx, network issues)
        // Don't retry for client errors (4xx) or specific non-retriable errors
        (error: Error) => {
          const errorMessage = error.message.toLowerCase();
          
          // Check for HTTP status codes in error message (4xx = client errors, don't retry)
          // Match patterns like "error: 400", "error 400", "400 -", "status 400", etc.
          const statusCodeMatch = errorMessage.match(/(?:error|status|code)[:\s]+(\d{3})|\b(\d{3})\s*[-\s]/i);
          if (statusCodeMatch) {
            const statusCode = parseInt(statusCodeMatch[1] || statusCodeMatch[2]);
            // 4xx errors are client errors and shouldn't be retried
            if (statusCode >= 400 && statusCode < 500) {
              return false;
            }
            // 5xx errors are server errors and can be retried
            if (statusCode >= 500) {
              return true;
            }
          }
          
          // Check for specific non-retriable error keywords
          const nonRetriableKeywords = [
            'validation',
            'invalid',
            'unverified',
            'unauthorized',
            'forbidden',
            'not found',
            'bad request',
            'malformed',
            'format',
            'required'
          ];
          
          const isNonRetriable = nonRetriableKeywords.some(keyword => 
            errorMessage.includes(keyword)
          );
          
          if (isNonRetriable) {
            return false;
          }
          
          // Check for ValidationError type
          if (error instanceof ValidationError) {
            return false;
          }
          
          // For other errors (network issues, timeouts, etc.), allow retry
          return true;
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2,
          onRetry: (error, attempt) => {
            log.warn(`Retrying SMS send (attempt ${attempt}/3):`, {
              messageId: message.id,
              error: error.message
            });
          }
        }
      );
      
      // Handle communication event
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_SENT,
        messageId: message.id,
        channel: 'sms',
        status: response.status,
        recipient: message.recipient,
        metadata: message.metadata,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      log.error('Error sending SMS (after retries):', error);
      
      // Handle communication event for failure
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'sms',
        status: 'failed',
        recipient: message.recipient,
        metadata: message.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });

      return handleCommunicationError(error).response;
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
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const responses: CommunicationServiceResponse[] = [];
      const userPreferences = await this.getUserPreferences(userId);

      for (const channel of channels) {
        if (!isChannelEnabledForUser(userPreferences, channel, notification.type)) {
          continue;
        }

        let response: CommunicationServiceResponse;

        switch (channel) {
          case 'email':
            const emailMessage = createEmailFromNotification(notification, user);
            response = await this.sendEmail(emailMessage);
            break;
          case 'sms':
            const smsMessage = createSMSFromNotification(notification, user);
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

    // Process messages in batches
    const batches = chunkArray(messages, batchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (message) => {
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
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return responses;
  }

  /**
   * Get user communication preferences
   */
  public async getUserPreferences(userId: string): Promise<UserCommunicationPreferences> {
    // This would typically query a user preferences table
    // For now, return default preferences
    return getDefaultUserPreferences();
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
      return await renderEmailTemplate(templateId, data);
    } catch (error) {
      // Try SMS templates
      try {
        return await renderSMSTemplate(templateId, data);
      } catch (smsError) {
        throw new Error(`Template ${templateId} not found in any service`);
      }
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
  public async testProviderConnection(provider: EmailProvider | SMSProvider): Promise<boolean> {
    return await this.providerManager.testProviderConnection(provider);
  }

  /**
   * Get cost estimate for message
   */
  public async getCostEstimate(provider: EmailProvider | SMSProvider, message: any): Promise<number> {
    return await this.providerManager.getProviderCostEstimate(provider, message);
  }

  /**
   * Get message status
   */
  public async getMessageStatus(provider: EmailProvider | SMSProvider, messageId: string): Promise<string> {
    return await this.providerManager.getProviderStatus(provider, messageId);
  }

  /**
   * Handle communication event
   */
  private async handleCommunicationEvent(eventData: CommunicationEventData): Promise<void> {
    try {
      await handleCommunicationEvent(eventData, this.eventHandlerRegistry);
    } catch (error) {
      log.error('Error handling communication event:', error);
    }
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