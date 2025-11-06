/**
 * Communication Types
 * 
 * Centralized exports for all communication-related types.
 * Single import point for all type definitions.
 */

// Core types
export * from './core.types';

// Provider types
export * from './provider.types';

// Template types
export * from './template.types';

// Event types
export * from './event.types';

// Configuration types
export * from './config.types';

// Response types
export * from './response.types';

// Preference types
export * from './preferences.types';

// Re-export commonly used types for convenience
export type {
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus,
  BaseCommunicationMessage,
  EmailMessage,
  SMSMessage,
  CommunicationRecipient,
  CommunicationContent,
  CommunicationTemplate,
  CommunicationServiceResponse,
  CommunicationAnalytics
} from './core.types';

export type {
  EmailProvider,
  SMSProvider,
  CommunicationProviderConfig,
  IEmailProvider,
  ISMSProvider,
  IProviderManager
} from './provider.types';

export {
  CommunicationEventType
} from './event.types';

export type {
  CommunicationEventData,
  ICommunicationEventHandler,
  IEventHandlerRegistry
} from './event.types';

export type {
  CommunicationConfig,
  TemplateConfig,
  QueueConfig,
  AnalyticsConfig,
  RateLimitingConfig,
  ValidationConfig
} from './config.types';

export type {
  UserCommunicationPreferences,
  EmailPreferences,
  SMSPreferences,
  PushPreferences,
  GlobalPreferences
} from './preferences.types';
