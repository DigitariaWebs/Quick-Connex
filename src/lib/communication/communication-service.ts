/**
 * Main Communication Service

 * 
 * This file provides the main communication service that integrates email and SMS
 * with the existing notification system, handling delivery methods and user preferences.
 */

import {
  ICommunicationService,
  BaseCommunicationMessage,
  EmailMessage,
  SMSMessage,
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
} from '@/types/communication-types';
import EmailService from './email-service';
import SMSService from './sms-service';
import { getCommunicationConfig, isEmailEnabled, isSMSEnabled } from '@/lib/communication-config';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';

/**
 * Main Communication Service Class
 */
export class CommunicationService implements ICommunicationService {
  private emailService: EmailService;
  private smsService: SMSService;
  private config: ReturnType<typeof getCommunicationConfig>;
  private eventHandlers: Map<CommunicationEventType, ICommunicationEventHandler[]> = new Map();

  constructor() {
    this.config = getCommunicationConfig();
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.initializeEventHandlers();
  }

  /**
   * Send email message
   */
  async sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse> {
    if (!isEmailEnabled()) {
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: 'Email service is disabled',
      };
    }

    try {
      const response = await this.emailService.sendEmail(message);
      await this.handleCommunicationEvent({
        eventType: response.success ? CommunicationEventType.MESSAGE_SENT : CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'email',
        recipient: message.recipient,
        status: response.status,
        timestamp: new Date(),
        error: response.error,
      });
      return response;
    } catch (error) {
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'email',
        recipient: message.recipient,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse> {
    if (!isSMSEnabled()) {
      return {
        success: false,
        messageId: message.id,
        status: 'failed',
        error: 'SMS service is disabled',
      };
    }

    try {
      const response = await this.smsService.sendSMS(message);
      await this.handleCommunicationEvent({
        eventType: response.success ? CommunicationEventType.MESSAGE_SENT : CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'sms',
        recipient: message.recipient,
        timestamp: new Date(),
        status: response.status,
        error: response.error,
      });
      return response;
    } catch (error) {
      await this.handleCommunicationEvent({
        eventType: CommunicationEventType.MESSAGE_FAILED,
        messageId: message.id,
        channel: 'sms',
        recipient: message.recipient,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send bulk communications
   */
  async sendBulk(communications: BaseCommunicationMessage[]): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    // Separate by channel
    const emails = communications.filter(c => c.channel === 'email') as EmailMessage[];
    const smsMessages = communications.filter(c => c.channel === 'sms') as SMSMessage[];

    // Send emails in bulk
    if (emails.length > 0) {
      const emailResults = await this.emailService.sendBulkEmails(emails);
      results.push(...emailResults);
    }

    // Send SMS messages in bulk
    if (smsMessages.length > 0) {
      const smsResults = await this.smsService.sendBulkSMS(smsMessages);
      results.push(...smsResults);
    }

    // Handle events for all communications
    await Promise.all(
      results.map(result => 
        this.handleCommunicationEvent({
          eventType: result.success ? CommunicationEventType.MESSAGE_SENT : CommunicationEventType.MESSAGE_FAILED,
          messageId: result.messageId,
          channel: communications.find(c => c.id === result.messageId)?.channel || 'email',
          recipient: communications.find(c => c.id === result.messageId)?.recipient || {} as CommunicationRecipient,
          status: result.status,
          timestamp: new Date(),
          error: result.error,
        })
      )
    );

    return results;
  }

  /**
   * Get communication status
   */
  async getStatus(messageId: string): Promise<CommunicationStatus> {
    // This would typically query a database or provider API
    // For now, return a default status
    return 'delivered';
  }

  /**
   * Get communication analytics
   */
  async getAnalytics(timeRange?: { start: Date; end: Date }): Promise<CommunicationAnalytics> {
    // This would typically query analytics data from a database
    // For now, return mock data
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
        realtime: 0,
      },
      volumeByChannel: {
        email: 0,
        sms: 0,
        push: 0,
        realtime: 0,
      },
      volumeByTime: {},
      topFailureReasons: [],
    };
  }

  /**
   * Validate recipient
   */
  async validateRecipient(recipient: CommunicationRecipient): Promise<boolean> {
    if (recipient.email && !this.isValidEmail(recipient.email)) {
      return false;
    }
    if (recipient.phone && !this.isValidPhoneNumber(recipient.phone)) {
      return false;
    }
    return true;
  }

  /**
   * Get templates for a specific channel
   */
  async getTemplates(channel?: CommunicationChannel): Promise<CommunicationTemplate[]> {
    const templates: CommunicationTemplate[] = [];

    if (!channel || channel === 'email') {
      templates.push(...this.emailService.getTemplates());
    }

    if (!channel || channel === 'sms') {
      templates.push(...this.smsService.getTemplates());
    }

    return templates;
  }

  /**
   * Render template
   */
  async renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent> {
    // Try email templates first
    try {
      return await this.emailService.renderTemplate(templateId, data);
    } catch (error) {
      // Try SMS templates
      try {
        return await this.smsService.renderTemplate(templateId, data);
      } catch (smsError) {
        throw new Error(`Template ${templateId} not found in any service`);
      }
    }
  }

  /**
   * Send notification via multiple channels based on user preferences
   */
  async sendNotificationToUser(
    notification: any, // Notification from the existing system
    userId: string,
    channels: CommunicationChannel[] = ['email', 'sms']
  ): Promise<CommunicationServiceResponse[]> {
    const results: CommunicationServiceResponse[] = [];

    // Get user preferences (this would typically come from a database)
    const userPreferences = await this.getUserCommunicationPreferences(userId);

    for (const channel of channels) {
      if (!this.isChannelEnabledForUser(userPreferences, channel, notification.type)) {
        continue;
      }

      try {
        let response: CommunicationServiceResponse;

        switch (channel) {
          case 'email':
            response = await this.sendEmailFromNotification(notification, userId);
            break;
          case 'sms':
            response = await this.sendSMSFromNotification(notification, userId);
            break;
          default:
            continue;
        }

        results.push(response);

        // Update notification delivery tracking
        await this.updateNotificationDelivery(notification, userId, channel, response.success);

      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
        results.push({
          success: false,
          messageId: `${notification.id}_${channel}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Send email from notification
   */
  private async sendEmailFromNotification(notification: any, userId: string): Promise<CommunicationServiceResponse> {
    const user = await this.getUserById(userId);
    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    const emailMessage: EmailMessage = {
      id: `${notification.id}_email_${Date.now()}`,
      channel: 'email',
      priority: notification.priority,
      status: 'pending',
      recipient: {
        id: userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
      },
      content: {
        subject: notification.title,
        text: notification.message,
        html: this.generateEmailHTML(notification),
      },
      metadata: {
        source: 'notification_system',
        category: notification.type,
        notificationId: notification.id,
        transferId: notification.transferId,
        userId: notification.createdBy,
      },
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.sendEmail(emailMessage);
  }

  /**
   * Send SMS from notification
   */
  private async sendSMSFromNotification(notification: any, userId: string): Promise<CommunicationServiceResponse> {
    const user = await this.getUserById(userId);
    if (!user || !user.phone) {
      throw new Error('User phone number not found');
    }

    const smsMessage: SMSMessage = {
      id: `${notification.id}_sms_${Date.now()}`,
      channel: 'sms',
      priority: notification.priority,
      status: 'pending',
      recipient: {
        id: userId,
        phone: user.phone,
        name: `${user.firstName} ${user.lastName}`,
        userType: user.userType,
      },
      content: {
        text: this.generateSMSText(notification),
      },
      metadata: {
        source: 'notification_system',
        category: notification.type,
        notificationId: notification.id,
        transferId: notification.transferId,
        userId: notification.createdBy,
      },
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.sendSMS(smsMessage);
  }

  /**
   * Generate HTML content for email notifications
   */
  private generateEmailHTML(notification: any): string {
    const isUrgent = notification.priority === 'urgent';
    const borderColor = isUrgent ? '#ff0000' : '#007bff';
    const headerColor = isUrgent ? '#ff0000' : '#333333';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid ${borderColor}; padding: 20px;">
        <h2 style="color: ${headerColor};">${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data?.transfer ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>Transfer Details</h3>
            <p><strong>Patient:</strong> ${notification.data.transfer.patient?.firstName} ${notification.data.transfer.patient?.lastName}</p>
            <p><strong>From:</strong> ${notification.data.transfer.fromHospitalName || notification.data.transfer.fromHospital}</p>
            <p><strong>To:</strong> ${notification.data.transfer.toHospitalName || notification.data.transfer.toHospital}</p>
            <p><strong>Status:</strong> ${notification.data.transfer.status}</p>
            <p><strong>Priority:</strong> ${notification.data.transfer.priority}</p>
          </div>
        ` : ''}
        <hr>
        <p><small>This is an automated message from the Patient Management System.</small></p>
      </div>
    `;
  }

  /**
   * Generate SMS text for notifications
   */
  private generateSMSText(notification: any): string {
    let text = `${notification.title}: ${notification.message}`;
    
    if (notification.data?.transfer) {
      const transfer = notification.data.transfer;
      text += ` Patient: ${transfer.patient?.firstName} ${transfer.patient?.lastName}`;
      text += ` From: ${transfer.fromHospitalName || transfer.fromHospital} To: ${transfer.toHospitalName || transfer.toHospital}`;
    }

    // Truncate if too long
    if (text.length > 160) {
      text = text.substring(0, 157) + '...';
    }

    return text;
  }

  /**
   * Get user communication preferences
   */
  private async getUserCommunicationPreferences(userId: string): Promise<any> {
    // This would typically query a user preferences table
    // For now, return default preferences
    return {
      email: {
        enabled: true,
        frequency: 'immediate',
        types: ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'system'],
      },
      sms: {
        enabled: true,
        frequency: 'immediate',
        types: ['urgent_transfer', 'system'],
      },
      push: {
        enabled: true,
        frequency: 'immediate',
        types: ['transfer_status_change', 'new_transfer', 'urgent_transfer'],
      },
    };
  }

  /**
   * Check if channel is enabled for user
   */
  private isChannelEnabledForUser(
    preferences: any,
    channel: CommunicationChannel,
    notificationType: string
  ): boolean {
    const channelPrefs = preferences[channel];
    if (!channelPrefs || !channelPrefs.enabled) {
      return false;
    }

    return channelPrefs.types.includes(notificationType);
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<any> {
    // This would typically query the User model
    // For now, return mock data
    return {
      _id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      userType: 'employee',
    };
  }

  /**
   * Update notification delivery tracking
   */
  private async updateNotificationDelivery(
    notification: any,
    userId: string,
    channel: CommunicationChannel,
    success: boolean
  ): Promise<void> {
    try {
      // Update the notification's delivery tracking
      const deliveryMethod = channel === 'email' ? 'email' : 'sms';
      await notification.addDelivery(userId, deliveryMethod);
    } catch (error) {
      console.error('Error updating notification delivery:', error);
    }
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    // Register default event handlers
    this.registerEventHandler(new CommunicationAnalyticsHandler());
    this.registerEventHandler(new CommunicationLoggingHandler());
  }

  /**
   * Register event handler
   */
  private registerEventHandler(handler: ICommunicationEventHandler): void {
    const handlers = this.eventHandlers.get(handler.eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(handler.eventType, handlers);
  }

  /**
   * Handle communication event
   */
  private async handleCommunicationEvent(eventData: CommunicationEventData): Promise<void> {
    const handlers = this.eventHandlers.get(eventData.eventType) || [];
    await Promise.all(
      handlers.map(handler => handler.handle(eventData))
    );
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Simple phone number validation
   */
  private isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const digits = cleaned.replace(/\+/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }
}

/**
 * Communication Analytics Handler
 */
class CommunicationAnalyticsHandler implements ICommunicationEventHandler {
  eventType = CommunicationEventType.MESSAGE_SENT;

  async handle(eventData: CommunicationEventData): Promise<void> {
    // This would typically update analytics data
    console.log('Communication analytics event:', eventData);
  }
}

/**
 * Communication Logging Handler
 */
class CommunicationLoggingHandler implements ICommunicationEventHandler {
  eventType = CommunicationEventType.MESSAGE_SENT;

  async handle(eventData: CommunicationEventData): Promise<void> {
    // This would typically log to a dedicated logging service
    console.log('Communication event logged:', {
      eventType: eventData.eventType,
      messageId: eventData.messageId,
      channel: eventData.channel,
      status: eventData.status,
      timestamp: eventData.timestamp,
    });
  }
}

// Export the main service
export default CommunicationService;
