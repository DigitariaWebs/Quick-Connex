/**
 * Communication Core Module
 * 
 * Core communication functionality exports.
 */

// Re-export configuration
export { getCommunicationConfig, validateCommunicationConfig } from './config';

// Re-export constants
export * from './constants';

// Re-export services
export { CommunicationService, createCommunicationService, initializeCommunicationService } from './CommunicationService';