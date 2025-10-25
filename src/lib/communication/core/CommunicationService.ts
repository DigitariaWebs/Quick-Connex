/**
 * Centralized Communication Service
 * 
 * Single source of truth for all communication operations (email, SMS).
 * Provides clean, consistent API similar to AuthService and DatabaseService.
 * Integrates with all utility modules for comprehensive functionality.
 */

import { Types } from 'mongoose';
import { DatabaseService } from '@/lib/database';
import { AuditService } from '@/lib/services/audit';
import { log } from '@/lib/services';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { AuditAction, ActorType } from '@/models/AuditLog';
import { 
  retry, 
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
    try {
      await this.providerManager.initializeProviders();
      log.info('Communication service initialized successfully');
    } catch (error) {
      log.error('Failed to initialize communication service:', error);
      throw error;
    }
  }

  /**
   * Send email message
   */
  public async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    try {
      // Validate message
      const validation = validateEmailMessage(message);
      if (!validation.isValid) {
        throw new ValidationError(`Email validation failed: ${validation.errors.join(', ')}`);
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
   * Send SMS message
   */
  public async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    try {
      // Validate message
      const validation = validateSMSMessage(message);
      if (!validation.isValid) {
        throw new ValidationError(`SMS validation failed: ${validation.errors.join(', ')}`);
      }

      // Format phone number
      const formattedMessage = formatPhoneNumberForMessage(message);

      // Get SMS provider
      const smsProvider = this.providerManager.getSMSProvider();
      
      // Send SMS
      const response = await smsProvider.send(formattedMessage);
      
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
      log.error('Error sending SMS:', error);
      
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