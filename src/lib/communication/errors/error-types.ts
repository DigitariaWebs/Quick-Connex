/**
 * Communication Error Types
 * 
 * Error types, codes, and severity definitions for the communication system.
 */

/**
 * Communication error types
 */
export enum CommunicationErrorType {
  PROVIDER_ERROR = 'provider_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
  TEMPLATE_ERROR = 'template_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Communication error codes
 */
export const COMMUNICATION_ERROR_CODES = {
  // Provider errors
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  PROVIDER_QUOTA_EXCEEDED: 'PROVIDER_QUOTA_EXCEEDED',
  PROVIDER_INVALID_CREDENTIALS: 'PROVIDER_INVALID_CREDENTIALS',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  
  // Validation errors
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  MISSING_CONTENT: 'MISSING_CONTENT',
  INVALID_TEMPLATE: 'INVALID_TEMPLATE',
  
  // Configuration errors
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // Network errors
  TIMEOUT: 'TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Template errors
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_ERROR: 'TEMPLATE_RENDER_ERROR'
} as const;

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error recovery suggestions
 */
export const ERROR_RECOVERY_SUGGESTIONS = {
  [CommunicationErrorType.AUTHENTICATION_ERROR]: [
    'Check API credentials and tokens',
    'Verify provider account status',
    'Refresh authentication tokens if applicable'
  ],
  [CommunicationErrorType.RATE_LIMIT_ERROR]: [
    'Wait before retrying',
    'Check rate limit quotas',
    'Consider upgrading provider plan'
  ],
  [CommunicationErrorType.VALIDATION_ERROR]: [
    'Validate recipient information',
    'Check message content format',
    'Verify required fields are provided'
  ],
  [CommunicationErrorType.NETWORK_ERROR]: [
    'Check internet connection',
    'Verify provider service status',
    'Try again after a short delay'
  ],
  [CommunicationErrorType.CONFIGURATION_ERROR]: [
    'Check environment variables',
    'Verify provider configuration',
    'Review service setup'
  ],
  [CommunicationErrorType.TEMPLATE_ERROR]: [
    'Check template ID and format',
    'Verify template variables',
    'Review template syntax'
  ]
} as const;
