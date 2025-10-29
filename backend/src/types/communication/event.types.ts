/**
 * Communication Event Types
 * 
 * Event system types for communication events and handlers.
 */

import { CommunicationChannel, CommunicationStatus, CommunicationRecipient } from './core.types';

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
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  TEMPLATE_RENDERED = 'template_rendered',
  TEMPLATE_ERROR = 'template_error',
  USER_PREFERENCES_UPDATED = 'user_preferences_updated',
  ANALYTICS_UPDATED = 'analytics_updated'
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
  provider?: string;
  cost?: number;
  currency?: string;
}

/**
 * Communication Event Handler Interface
 */
export interface ICommunicationEventHandler {
  eventType: CommunicationEventType;
  handle(eventData: CommunicationEventData): Promise<void>;
  canHandle(eventType: CommunicationEventType): boolean;
}

/**
 * Event Handler Registration
 */
export interface EventHandlerRegistration {
  handler: ICommunicationEventHandler;
  priority: number; // Higher number = higher priority
  enabled: boolean;
  filters?: EventHandlerFilter[];
}

/**
 * Event Handler Filter
 */
export interface EventHandlerFilter {
  field: keyof CommunicationEventData;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in';
  value: any;
}

/**
 * Event Handler Registry Interface
 */
export interface IEventHandlerRegistry {
  registerHandler(handler: ICommunicationEventHandler, priority?: number, filters?: EventHandlerFilter[]): void;
  unregisterHandler(handler: ICommunicationEventHandler): void;
  handleEvent(eventData: CommunicationEventData): Promise<void>;
  getHandlers(eventType: CommunicationEventType): ICommunicationEventHandler[];
  clearHandlers(): void;
  getRegisteredEventTypes(): CommunicationEventType[];
}

/**
 * Event Processing Options
 */
export interface EventProcessingOptions {
  async: boolean;
  timeout: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  batchSize: number;
  parallel: boolean;
}

/**
 * Event Processing Result
 */
export interface EventProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: EventProcessingError[];
  duration: number; // in milliseconds
}

/**
 * Event Processing Error
 */
export interface EventProcessingError {
  handler: string;
  error: string;
  eventData: CommunicationEventData;
  timestamp: Date;
}

/**
 * Event Metrics
 */
export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<CommunicationEventType, number>;
  eventsByChannel: Record<CommunicationChannel, number>;
  eventsByStatus: Record<CommunicationStatus, number>;
  averageProcessingTime: number;
  errorRate: number;
  lastProcessed: Date;
}

/**
 * Event Queue Configuration
 */
export interface EventQueueConfig {
  enabled: boolean;
  maxSize: number;
  processingInterval: number; // in milliseconds
  batchSize: number;
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  deadLetterQueue: boolean;
}

/**
 * Event Subscription
 */
export interface EventSubscription {
  id: string;
  eventTypes: CommunicationEventType[];
  handler: ICommunicationEventHandler;
  filters?: EventHandlerFilter[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Audit Log
 */
export interface EventAuditLog {
  id: string;
  eventType: CommunicationEventType;
  messageId: string;
  handler: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number; // in milliseconds
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Event Middleware Interface
 */
export interface IEventMiddleware {
  beforeHandle?(eventData: CommunicationEventData): Promise<CommunicationEventData>;
  afterHandle?(eventData: CommunicationEventData, result: any): Promise<void>;
  onError?(eventData: CommunicationEventData, error: Error): Promise<void>;
}

/**
 * Event Context
 */
export interface EventContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

