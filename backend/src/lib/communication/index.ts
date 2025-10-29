/**
 * Communication Module
 * 
 * Complete communication system for email and SMS.
 * Single import point for all communication functionality.
 */

// ===== CORE SERVICE =====
export {
  CommunicationService,
  createCommunicationService,
  initializeCommunicationService
} from './core/CommunicationService';

// ===== CONFIGURATION =====
export {
  getCommunicationConfig,
  validateCommunicationConfig,
  getEnvVar,
  getRequiredEnvVar,
  isCommunicationEnabled,
  isEmailEnabled,
  isSMSEnabled,
  getDevelopmentConfig
} from './core/config';

// ===== CONSTANTS =====
export {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_PRIORITY,
  COMMUNICATION_STATUS,
  EMAIL_PROVIDERS,
  SMS_PROVIDERS,
  COMMUNICATION_CONFIG,
  COMMUNICATION_ERRORS,
  COMMUNICATION_SUCCESS
} from './core/constants';

// ===== PROVIDERS =====
export {
  ProviderManager,
  createProviderManager
} from './providers/manager';

export {
  BaseEmailProvider,
  SendGridProvider,
  NodemailerProvider
} from './providers/email';

export {
  BaseSMSProvider,
  TwilioProvider
} from './providers/sms';

// ===== UTILITIES =====
export {
  validateEmailMessage,
  validateSMSMessage,
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumberForMessage,
  isChannelEnabledForUser,
  chunkArray,
  getDefaultUserPreferences,
  isValidChannel,
  getChannelDisplayName,
  isUrgentMessage,
  getPriorityDisplayName,
  generateMessageId,
  isMessageExpired,
  getMessageAge,
  isMessageStale
} from './utils/helpers';

export {
  shouldRetryMessage,
  getRetryDelay,
  applyRateLimit,
  getRateLimitResetTime,
  getRateLimitStatus,
  shouldRetryBasedOnError,
  getBackoffDelay,
  getRetryStrategy
} from './utils/rate-limiter';

export {
  sanitizeRecipient,
  sanitizeMessageForLogging,
  createCommunicationContext
} from './utils/logger';

export {
  formatPhoneNumber,
  formatEmailAddress,
  sanitizeHTML,
  htmlToText,
  decodeHTMLEntities,
  truncateText,
  formatMessagePreview,
  formatDateForEmail,
  formatFileSize,
  formatCurrency,
  formatSMSSegments,
  escapeHTML,
  formatRecipientName,
  formatMessageStatus
} from './utils/formatters';

// ===== ERROR HANDLING =====
export {
  CommunicationErrorType,
  ErrorSeverity,
  COMMUNICATION_ERROR_CODES,
  ERROR_RECOVERY_SUGGESTIONS
} from './errors/error-types';

export {
  handleCommunicationError,
  handleProviderError,
  shouldRetryError,
  getRetryDelayForError,
  formatErrorForLogging,
  createErrorResponse
} from './errors/error-handler';

// ===== INTEGRATIONS =====
export {
  TransferNotificationService,
  UserNotificationService,
  NotificationIntegrationService
} from './integrations';

export {
  createEmailFromNotification,
  generateEmailHTML,
  renderEmailTemplate,
  getEmailTemplates
} from './templates/email-templates';

export {
  createSMSFromNotification,
  generateSMSText,
  renderSMSTemplate,
  getSMSTemplates
} from './templates/sms-templates';

// ===== TYPE RE-EXPORTS =====
export type {
  // Core types
  CommunicationChannel,
  CommunicationPriority,
  CommunicationStatus,
  BaseCommunicationMessage,
  EmailMessage,
  SMSMessage,
  CommunicationRecipient,
  EmailRecipient,
  SMSRecipient,
  CommunicationContent,
  EmailContent,
  SMSContent,
  CommunicationAttachment,
  CommunicationMetadata,
  CommunicationTracking,
  CommunicationTemplate,
  CommunicationServiceResponse,
  CommunicationAnalytics,
  ICommunicationService,
  ICommunicationProvider,
  
  // Provider types
  EmailProvider,
  SMSProvider,
  CommunicationProviderConfig,
  EmailProviderConfig,
  SMSProviderConfig,
  IEmailProvider,
  ISMSProvider,
  IProviderManager,
  ProviderHealthStatus,
  ProviderStats,
  ProviderError,
  
  // Event types
  CommunicationEventType,
  CommunicationEventData,
  ICommunicationEventHandler,
  IEventHandlerRegistry,
  
  // Config types
  CommunicationConfig,
  TemplateConfig,
  QueueConfig,
  AnalyticsConfig,
  RateLimitingConfig,
  ValidationConfig,
  MonitoringConfig,
  SecurityConfig,
  ConfigValidationResult,
  
  // Response types
  BaseResponse,
  BulkCommunicationResponse,
  TemplateResponse,
  AnalyticsResponse,
  HealthCheckResponse,
  ServiceHealth,
  ProviderStatusResponse,
  ProviderStatus,
  UserPreferencesResponse,
  ErrorResponse,
  ValidationResponse,
  
  // Preference types
  UserCommunicationPreferences,
  EmailPreferences,
  SMSPreferences,
  PushPreferences,
  GlobalPreferences,
  QuietHours,
  
  // Template types
  TemplateVariable,
  TemplateCategory,
  TemplateRenderingContext,
  TemplateRenderingResult,
  TemplateValidationResult,
  TemplatePreviewOptions,
  TemplatePreviewResult,
  ITemplateLoader
} from '../../types/communication';

