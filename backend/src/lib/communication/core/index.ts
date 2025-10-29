/**
 * Communication Core Module
 * 
 * Core communication service and configuration exports.
 */

// Configuration
export * from './config';
export * from './constants';

// Re-export types for convenience
export type {
  CommunicationConfig,
  CommunicationProviderConfig,
  EmailProviderConfig,
  SMSProviderConfig,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning
} from '../../../types/communication';

