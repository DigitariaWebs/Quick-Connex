/**
 * Communication Module
 * 
 * Simplified communication system for email and SMS.
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
  validateCommunicationConfig
} from './core/config';

// ===== CONSTANTS =====
export * from './core/constants';

// ===== PROVIDERS =====
export {
  NodemailerProvider
} from './providers/email';

export {
  TwilioProvider
} from './providers/sms';

// ===== TEMPLATES =====
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

// ===== UTILITIES =====
export {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber
} from './utils/validation';

// ===== ERROR HANDLING =====
export {
  handleCommunicationError,
  createErrorResponse,
  CommunicationError,
  ErrorResponse
} from './errors';

// ===== EVENTS =====
export {
  EventHandlerRegistry,
  createEventHandlerRegistry,
  handleCommunicationEvent
} from './events';

// ===== HELPERS =====
export {
  sendTransferNotificationToAdmin,
  sendSignupNotificationToAdmin,
  sendAccountApprovalEmail,
  sendUrgentSMS,
  sendTransferApprovalNotification
} from './helpers';

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
  CommunicationAttachment,
  CommunicationMetadata,
  CommunicationServiceResponse,
  ICommunicationService,
  
  // Provider types
  EmailProvider,
  SMSProvider,
  CommunicationProviderConfig,
  EmailProviderConfig,
  SMSProviderConfig,
  IEmailProvider,
  ISMSProvider,
  
  // Event types
  CommunicationEventType,
  CommunicationEventData,
  
  // Config types
  CommunicationConfig,
  ConfigValidationResult,
  
  // Response types
  BaseResponse,
  BulkCommunicationResponse,
  ErrorResponse,
  ValidationResponse
} from '../../types/communication';