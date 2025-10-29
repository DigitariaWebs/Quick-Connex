/**
 * Communication Error Handler
 * 
 * Simplified error handling for communication operations.
 */

export interface CommunicationError {
  type: string;
  message: string;
  code?: string | undefined;
  retryable: boolean;
}

export interface ErrorResponse {
  success: false;
  messageId: string;
  status: 'failed';
  error: string;
  code?: string | undefined;
  retryable?: boolean;
}

/**
 * Handle communication error
 */
export function handleCommunicationError(error: any): { error: CommunicationError; response: ErrorResponse } {
  const errorType = getErrorType(error);
  const communicationError: CommunicationError = {
    type: errorType,
    message: error instanceof Error ? error.message : 'Unknown error',
    code: getErrorCode(error),
    retryable: isRetryableError(error)
  };

  const response: ErrorResponse = {
    success: false,
    messageId: 'unknown',
    status: 'failed',
    error: communicationError.message,
    code: communicationError.code,
    retryable: communicationError.retryable
  };

  return { error: communicationError, response };
}

/**
 * Get error type from error
 */
function getErrorType(error: any): string {
  if (error?.code) {
    switch (error.code) {
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
      case 'ETIMEDOUT':
        return 'CONNECTION_ERROR';
      case 'EAUTH':
      case 'EINVAL':
        return 'AUTHENTICATION_ERROR';
      case 'EMESSAGE':
        return 'MESSAGE_ERROR';
      case 'ERATE':
        return 'RATE_LIMIT_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  if (error?.message) {
    const message = error.message.toLowerCase();
    if (message.includes('connection') || message.includes('timeout')) {
      return 'CONNECTION_ERROR';
    }
    if (message.includes('auth') || message.includes('credential')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (message.includes('rate') || message.includes('limit')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (message.includes('message') || message.includes('content')) {
      return 'MESSAGE_ERROR';
    }
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Get error code from error
 */
function getErrorCode(error: any): string | undefined {
  return error?.code || error?.errorCode || undefined;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorType = getErrorType(error);
  
  // Retryable errors
  const retryableTypes = [
    'CONNECTION_ERROR',
    'RATE_LIMIT_ERROR'
  ];

  return retryableTypes.includes(errorType);
}

/**
 * Create error response
 */
export function createErrorResponse(messageId: string, error: string, code?: string | undefined): ErrorResponse {
  return {
    success: false,
    messageId,
    status: 'failed',
    error,
    code,
    retryable: false
  };
}