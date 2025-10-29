/**
 * Communication Error Handler
 * 
 * Error handling logic for communication operations.
 */

import { log } from '../../logging';
import { CommunicationErrorType, ErrorSeverity, ERROR_RECOVERY_SUGGESTIONS } from './error-types';
import { CommunicationServiceResponse } from '../../../types/communication';

/**
 * Handle communication error
 */
export function handleCommunicationError(error: any): {
  type: CommunicationErrorType;
  severity: ErrorSeverity;
  message: string;
  suggestions: string[];
  response: CommunicationServiceResponse;
} {
  const errorMessage = error?.message || 'Unknown error';
  let type = CommunicationErrorType.UNKNOWN_ERROR;
  let severity = ErrorSeverity.MEDIUM;
  
  // Determine error type
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    type = CommunicationErrorType.VALIDATION_ERROR;
    severity = ErrorSeverity.LOW;
  } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    type = CommunicationErrorType.RATE_LIMIT_ERROR;
    severity = ErrorSeverity.MEDIUM;
  } else if (errorMessage.includes('auth') || errorMessage.includes('credentials')) {
    type = CommunicationErrorType.AUTHENTICATION_ERROR;
    severity = ErrorSeverity.HIGH;
  } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    type = CommunicationErrorType.NETWORK_ERROR;
    severity = ErrorSeverity.MEDIUM;
  } else if (errorMessage.includes('config')) {
    type = CommunicationErrorType.CONFIGURATION_ERROR;
    severity = ErrorSeverity.HIGH;
  } else if (errorMessage.includes('template')) {
    type = CommunicationErrorType.TEMPLATE_ERROR;
    severity = ErrorSeverity.LOW;
  } else if (errorMessage.includes('provider')) {
    type = CommunicationErrorType.PROVIDER_ERROR;
    severity = ErrorSeverity.HIGH;
  }
  
  const suggestions = [...(ERROR_RECOVERY_SUGGESTIONS[type] || [])];
  
  log.error(`Communication error [${type}]:`, {
    message: errorMessage,
    severity,
    stack: error?.stack
  });
  
  return {
    type,
    severity,
    message: errorMessage,
    suggestions,
    response: createErrorResponse('unknown', errorMessage)
  };
}

/**
 * Handle provider error
 */
export function handleProviderError(provider: string, error: any): CommunicationServiceResponse {
  const errorMessage = `Provider ${provider} error: ${error?.message || 'Unknown error'}`;
  log.error(errorMessage, error);
  
  return createErrorResponse('provider_error', errorMessage);
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  const retryableErrors = [
    'timeout',
    'network',
    'temporary',
    'service unavailable',
    'too many requests'
  ];
  
  return retryableErrors.some(err => errorMessage.includes(err));
}

/**
 * Get retry delay for error
 */
export function getRetryDelayForError(_error: any, retryCount: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: any): {
  message: string;
  type: string;
  stack?: string;
  code?: string;
} {
  return {
    message: error?.message || 'Unknown error',
    type: error?.constructor?.name || 'Error',
    stack: error?.stack,
    code: error?.code
  };
}

/**
 * Create error response
 */
export function createErrorResponse(messageId: string, error: string): CommunicationServiceResponse {
  return {
    success: false,
    messageId,
    status: 'failed',
    error
  };
}

