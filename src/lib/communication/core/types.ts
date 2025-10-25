/**
 * Communication System Types
 * 
 * This file contains all TypeScript interfaces and types for the communication system,
 * including email and SMS services, templates, and delivery tracking.
 */

import { Types } from 'mongoose';

/**
 * Communication Channel Types
 */
export type CommunicationChannel = 'email' | 'sms' | 'push' | 'realtime';

/**
 * Communication Priority Levels
 */
export type CommunicationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Communication Status
 */
export type CommunicationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'blocked';

/**
 * Email Provider Types
 */
export type EmailProvider = 'sendgrid' | 'gmail-api' | 'gmail-smtp' | 'nodemailer' | 'ses' | 'mailgun' | 'resend';

/**
 * SMS Provider Types
 */
export type SMSProvider = 'twilio' | 'aws-sns' | 'messagebird' | 'vonage' | 'plivo';

/**
 * Base Communication Message Interface
 */
export interface BaseCommunicationMessage {
  id: string;
  channel: CommunicationChannel;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  recipient: CommunicationRecipient;
  content: CommunicationContent;
  metadata?: CommunicationMetadata;
  tracking?: CommunicationTracking;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Communication Recipient Interface
 */
export interface CommunicationRecipient {
  id?: string; // User ID if available
  email?: string;
  phone?: string;
  name?: string;
  userType?: 'employee' | 'manager' | 'admin';
  preferences?: UserCommunicationPreferences;
}

/**
 * User Communication Preferences
 */
export interface UserCommunicationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[]; // Notification types user wants to receive
  };
  sms: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[]; // Notification types user wants to receive
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[]; // Notification types user wants to receive
  };
}

/**
 * Communication Content Interface
 */
export interface CommunicationContent {
  subject?: string; // For email
  text: string; // Plain text content
  html?: string; // HTML content for email
  template?: string; // Template name if using templates
  templateData?: Record<string, any>; // Data for template rendering
  attachments?: CommunicationAttachment[];
}

/**
 * Communication Attachment Interface
 */
export interface CommunicationAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size?: number;
}

/**
 * Communication Metadata Interface
 */
export interface CommunicationMetadata {
  source: string; // Which system/service sent this
  category: string; // e.g., 'transfer_notification', 'system_alert'
  notificationId?: string; // Reference to notification if applicable
  transferId?: string; // Reference to transfer if applicable
  userId?: string; // User who triggered this communication
  retryCount?: number;
  maxRetries?: number;
  scheduledFor?: Date; // For scheduled communications
  expiresAt?: Date; // When this communication expires
}

/**
 * Communication Tracking Interface
 */
export interface CommunicationTracking {
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  providerId?: string; // External provider's message ID
  providerResponse?: any; // Raw response from provider
  cost?: number; // Cost of sending this message
  currency?: string;
}

/**
 * Email Message Interface
 */
export interface EmailMessage extends BaseCommunicationMessage {
  channel: 'email';
  recipient: EmailRecipient;
  content: EmailContent;
}

/**
 * Email Recipient Interface
 */
export interface EmailRecipient extends CommunicationRecipient {
  email: string;
  name?: string;
}

/**
 * Email Content Interface
 */
export interface EmailContent extends CommunicationContent {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  from?: EmailSender;
  cc?: string[];
  bcc?: string[];
}

/**
 * Email Sender Interface
 */
export interface EmailSender {
  email: string;
  name?: string;
}

/**
 * SMS Message Interface
 */
export interface SMSMessage extends BaseCommunicationMessage {
  channel: 'sms';
  recipient: SMSRecipient;
  content: SMSContent;
}

/**
 * SMS Recipient Interface
 */
export interface SMSRecipient extends CommunicationRecipient {
  phone: string;
  countryCode?: string;
}

/**
 * SMS Content Interface
 */
export interface SMSContent extends CommunicationContent {
  text: string; // SMS text content (max 160 chars for single SMS)
  from?: string; // Sender phone number or short code
}

/**
 * Communication Template Interface
 */
export interface CommunicationTemplate {
  id: string;
  name: string;
  channel: CommunicationChannel;
  category: string;
  subject?: string; // For email templates
  text: string; // Plain text template
  html?: string; // HTML template for email
  variables: string[]; // Available template variables
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Communication Provider Configuration
 */
export interface CommunicationProviderConfig {
  email: {
    provider: EmailProvider;
    apiKey?: string;
    apiSecret?: string;
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
    region?: string; // For AWS SES
    domain?: string; // For Mailgun
  };
  sms: {
    provider: SMSProvider;
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string; // For Twilio
    authToken?: string; // For Twilio
    fromNumber?: string;
    region?: string; // For AWS SNS
  };
}

/**
 * Communication Service Response
 */
export interface CommunicationServiceResponse {
  success: boolean;
  messageId: string;
  providerId?: string;
  status: CommunicationStatus;
  error?: string;
  cost?: number;
  currency?: string;
}

/**
 * Communication Queue Item
 */
export interface CommunicationQueueItem {
  id: string;
  message: BaseCommunicationMessage;
  priority: CommunicationPriority;
  scheduledFor?: Date;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Communication Analytics Interface
 */
export interface CommunicationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  failureRate: number;
  averageDeliveryTime: number; // in milliseconds
  costByChannel: Record<CommunicationChannel, number>;
  volumeByChannel: Record<CommunicationChannel, number>;
  volumeByTime: Record<string, number>; // Time-based volume
  topFailureReasons: Array<{
    reason: string;
    count: number;
  }>;
}

/**
 * Communication Service Interface
 */
export interface ICommunicationService {
  sendEmail(message: EmailMessage): Promise<CommunicationServiceResponse>;
  sendSMS(message: SMSMessage): Promise<CommunicationServiceResponse>;
  sendBulk(communications: BaseCommunicationMessage[]): Promise<CommunicationServiceResponse[]>;
  getStatus(messageId: string): Promise<CommunicationStatus>;
  getAnalytics(timeRange?: { start: Date; end: Date }): Promise<CommunicationAnalytics>;
  validateRecipient(recipient: CommunicationRecipient): Promise<boolean>;
  getTemplates(channel?: CommunicationChannel): Promise<CommunicationTemplate[]>;
  renderTemplate(templateId: string, data: Record<string, any>): Promise<CommunicationContent>;
}

/**
 * Communication Provider Interface
 */
export interface ICommunicationProvider {
  providerType: EmailProvider | SMSProvider;
  send(message: BaseCommunicationMessage): Promise<CommunicationServiceResponse>;
  getStatus(messageId: string): Promise<CommunicationStatus>;
  validateConfiguration(): Promise<boolean>;
  getCostEstimate(message: BaseCommunicationMessage): Promise<number>;
}

/**
 * Communication Event Types
 */
export enum CommunicationEventType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_DELIVERED = 'message_delivered',
  MESSAGE_FAILED = 'message_failed',
  MESSAGE_BOUNCED = 'message_bounced',
  MESSAGE_READ = 'message_read',
  MESSAGE_CLICKED = 'message_clicked',
  BULK_SEND_STARTED = 'bulk_send_started',
  BULK_SEND_COMPLETED = 'bulk_send_completed',
  PROVIDER_ERROR = 'provider_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

/**
 * Communication Event Data
 */
export interface CommunicationEventData {
  eventType: CommunicationEventType;
  messageId: string;
  channel: CommunicationChannel;
  recipient: CommunicationRecipient;
  status: CommunicationStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Communication Event Handler Interface
 */
export interface ICommunicationEventHandler {
  eventType: CommunicationEventType;
  handle(eventData: CommunicationEventData): Promise<void>;
}

/**
 * Communication Configuration Interface
 */
export interface CommunicationConfig {
  providers: CommunicationProviderConfig;
  templates: {
    directory: string;
    cacheEnabled: boolean;
    cacheTTL: number; // in seconds
  };
  queue: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number; // in milliseconds
    batchSize: number;
    processingInterval: number; // in milliseconds
  };
  analytics: {
    enabled: boolean;
    retentionDays: number;
    aggregationInterval: number; // in minutes
  };
  rateLimiting: {
    enabled: boolean;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  validation: {
    emailValidation: boolean;
    phoneValidation: boolean;
    contentValidation: boolean;
  };
}

/**
 * Communication Rate Limiting Interface
 */
export interface CommunicationRateLimiting {
  enabled: boolean;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}
