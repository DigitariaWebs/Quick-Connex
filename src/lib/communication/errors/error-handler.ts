/**
 * Communication Error Handler
 * 
 * Handles communication-specific errors, provider errors, and retry logic.
 * Extracted from CommunicationService for better error management.
 */

import { CommunicationServiceResponse } from '../core/types';
import { 
  CommunicationErrorType, 
  COMMUNICATION_ERROR_CODES, 
  ErrorSeverity,
  ERROR_RECOVERY_SUGGESTIONS 
} from './error-types';

/**
 * Handle communication errors
 */
export function handleCommunicationError(error: any): {
  type: CommunicationErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  retryable: boolean;
  response: CommunicationServiceResponse;
} {
  const errorInfo = analyzeError(error);
  
  return {
    type: errorInfo.type,
    severity: errorInfo.severity,
    code: errorInfo.code,
    message: errorInfo.message,
    retryable: errorInfo.retryable,
    response: {
      success: false,
      messageId: error.messageId || 'unknown',
      status: 'failed',
      error: errorInfo.message
    }
  };
}

/**
 * Handle provider-specific errors
 */
export function handleProviderError(provider: string, error: any): {
  type: CommunicationErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  retryable: boolean;
} {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // SendGrid errors
  if (provider === 'sendgrid') {
    if (errorMessage.includes('unauthorized')) {
      return {
        type: CommunicationErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.HIGH,
        code: COMMUNICATION_ERROR_CODES.PROVIDER_INVALID_CREDENTIALS,
        message: 'SendGrid API key is invalid or expired',
        retryable: false
      };
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return {
        type: CommunicationErrorType.RATE_LIMIT_ERROR,
        severity: ErrorSeverity.MEDIUM,
        code: COMMUNICATION_ERROR_CODES.PROVIDER_QUOTA_EXCEEDED,
        message: 'SendGrid quota exceeded',
        retryable: true
      };
    }
  }
  
  // Twilio errors
  if (provider === 'twilio') {
    if (errorMessage.includes('authentication')) {
      return {
        type: CommunicationErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.HIGH,
        code: COMMUNICATION_ERROR_CODES.PROVIDER_INVALID_CREDENTIALS,
        message: 'Twilio credentials are invalid',
        retryable: false
      };
    }
    
    if (errorMessage.includes('rate limit')) {
      return {
        type: CommunicationErrorType.RATE_LIMIT_ERROR,
        severity: ErrorSeverity.MEDIUM,
        code: COMMUNICATION_ERROR_CODES.PROVIDER_RATE_LIMITED,
        message: 'Twilio rate limit exceeded',
        retryable: true
      };
    }
  }
  
  // Gmail errors
  if (provider === 'gmail') {
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('expired')) {
      return {
        type: CommunicationErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        code: COMMUNICATION_ERROR_CODES.PROVIDER_INVALID_CREDENTIALS,
        message: 'Gmail access token expired',
        retryable: true
      };
    }
  }
  
  // Generic provider error
  return {
    type: CommunicationErrorType.PROVIDER_ERROR,
    severity: ErrorSeverity.MEDIUM,
    code: COMMUNICATION_ERROR_CODES.PROVIDER_UNAVAILABLE,
    message: `Provider ${provider} error: ${error.message}`,
    retryable: true
  };
}

/**
 * Determine if error should be retried
 */
export function shouldRetryError(error: any, retryCount: number, maxRetries: number): boolean {
  if (retryCount >= maxRetries) {
    return false;
  }
  
  const errorInfo = analyzeError(error);
  
  // Don't retry certain error types
  const nonRetryableTypes = [
    CommunicationErrorType.VALIDATION_ERROR,
    CommunicationErrorType.CONFIGURATION_ERROR,
    CommunicationErrorType.TEMPLATE_ERROR
  ];
  
  if (nonRetryableTypes.includes(errorInfo.type)) {
    return false;
  }
  
  // Don't retry authentication errors after first attempt
  if (errorInfo.type === CommunicationErrorType.AUTHENTICATION_ERROR && retryCount > 0) {
    return false;
  }
  
  return errorInfo.retryable;
}

/**
 * Get retry delay for error
 */
export function getRetryDelayForError(error: any, retryCount: number): number {
  const errorInfo = analyzeError(error);
  
  // Base delay
  let baseDelay = 1000; // 1 second
  
  // Adjust based on error type
  switch (errorInfo.type) {
    case CommunicationErrorType.RATE_LIMIT_ERROR:
      baseDelay = 5000; // 5 seconds for rate limits
      break;
    case CommunicationErrorType.NETWORK_ERROR:
      baseDelay = 2000; // 2 seconds for network issues
      break;
    case CommunicationErrorType.PROVIDER_ERROR:
      baseDelay = 3000; // 3 seconds for provider errors
      break;
  }
  
  // Exponential backoff
  const delay = baseDelay * Math.pow(2, retryCount);
  
  // Cap at 30 seconds
  return Math.min(delay, 30000);
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: any, context?: any): any {
  return {
    message: error.message,
    stack: error.stack,
    type: error.type || 'unknown',
    code: error.code || 'unknown',
    context: context || {},
    timestamp: new Date().toISOString(),
    severity: error.severity || ErrorSeverity.MEDIUM
  };
}

/**
 * Analyze error to determine type and properties
 */
function analyzeError(error: any): {
  type: CommunicationErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  retryable: boolean;
} {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Validation errors
  if (errorMessage.includes('invalid') && (errorMessage.includes('email') || errorMessage.includes('phone'))) {
    return {
      type: CommunicationErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      code: errorMessage.includes('email') ? COMMUNICATION_ERROR_CODES.INVALID_EMAIL : COMMUNICATION_ERROR_CODES.INVALID_PHONE,
      message: error.message,
      retryable: false
    };
  }
  
  // Missing content errors
  if (errorMessage.includes('missing') || errorMessage.includes('required')) {
    return {
      type: CommunicationErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      code: COMMUNICATION_ERROR_CODES.MISSING_CONTENT,
      message: error.message,
      retryable: false
    };
  }
  
  // Template errors
  if (errorMessage.includes('template')) {
    return {
      type: CommunicationErrorType.TEMPLATE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: errorMessage.includes('not found') ? COMMUNICATION_ERROR_CODES.TEMPLATE_NOT_FOUND : COMMUNICATION_ERROR_CODES.TEMPLATE_RENDER_ERROR,
      message: error.message,
      retryable: false
    };
  }
  
  // Network errors
  if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
    return {
      type: CommunicationErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: errorMessage.includes('timeout') ? COMMUNICATION_ERROR_CODES.TIMEOUT : COMMUNICATION_ERROR_CODES.CONNECTION_FAILED,
      message: error.message,
      retryable: true
    };
  }
  
  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return {
      type: CommunicationErrorType.RATE_LIMIT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: COMMUNICATION_ERROR_CODES.PROVIDER_RATE_LIMITED,
      message: error.message,
      retryable: true
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('invalid credentials')) {
    return {
      type: CommunicationErrorType.AUTHENTICATION_ERROR,
      severity: ErrorSeverity.HIGH,
      code: COMMUNICATION_ERROR_CODES.PROVIDER_INVALID_CREDENTIALS,
      message: error.message,
      retryable: false
    };
  }
  
  // Configuration errors
  if (errorMessage.includes('config') || errorMessage.includes('missing')) {
    return {
      type: CommunicationErrorType.CONFIGURATION_ERROR,
      severity: ErrorSeverity.HIGH,
      code: COMMUNICATION_ERROR_CODES.MISSING_CONFIG,
      message: error.message,
      retryable: false
    };
  }
  
  // Default to unknown error
  return {
    type: CommunicationErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error occurred',
    retryable: true
  };
}

/**
 * Get error recovery suggestions
 */
export function getErrorRecoverySuggestions(error: any): string[] {
  const errorInfo = analyzeError(error);
  const suggestions: string[] = [];
  
  switch (errorInfo.type) {
    case CommunicationErrorType.AUTHENTICATION_ERROR:
      suggestions.push('Check API credentials and tokens');
      suggestions.push('Verify provider account status');
      suggestions.push('Refresh authentication tokens if applicable');
      break;
      
    case CommunicationErrorType.RATE_LIMIT_ERROR:
      suggestions.push('Wait before retrying');
      suggestions.push('Check rate limit quotas');
      suggestions.push('Consider upgrading provider plan');
      break;
      
    case CommunicationErrorType.VALIDATION_ERROR:
      suggestions.push('Validate recipient information');
      suggestions.push('Check message content format');
      suggestions.push('Verify required fields are provided');
      break;
      
    case CommunicationErrorType.NETWORK_ERROR:
      suggestions.push('Check internet connection');
      suggestions.push('Verify provider service status');
      suggestions.push('Try again after a short delay');
      break;
      
    case CommunicationErrorType.CONFIGURATION_ERROR:
      suggestions.push('Check environment variables');
      suggestions.push('Verify provider configuration');
      suggestions.push('Review service setup');
      break;
      
    case CommunicationErrorType.TEMPLATE_ERROR:
      suggestions.push('Check template ID and format');
      suggestions.push('Verify template variables');
      suggestions.push('Review template syntax');
      break;
      
    default:
      suggestions.push('Check logs for more details');
      suggestions.push('Contact support if issue persists');
      break;
  }
  
  return suggestions;
}

/**
 * Create error response
 */
export function createErrorResponse(error: any, messageId: string): CommunicationServiceResponse {
  const errorInfo = analyzeError(error);
  
  return {
    success: false,
    messageId,
    status: 'failed',
    error: errorInfo.message
  };
}
