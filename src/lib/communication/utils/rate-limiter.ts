/**
 * Communication Rate Limiter
 * 
 * Rate limiting and retry logic for communication operations.
 */

/**
 * Check if message should be retried
 */
export function shouldRetryMessage(
  error: any, 
  retryCount: number, 
  maxRetries: number
): boolean {
  if (retryCount >= maxRetries) {
    return false;
  }

  // Don't retry for certain types of errors
  const nonRetryableErrors = [
    'invalid_recipient',
    'invalid_content',
    'rate_limit_exceeded',
    'authentication_failed'
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  return !nonRetryableErrors.some(err => errorMessage.includes(err));
}

/**
 * Get retry delay with exponential backoff
 */
export function getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30 seconds
}

/**
 * Apply rate limiting to message sending
 */
export function applyRateLimit(
  messageCount: number,
  maxPerMinute: number,
  maxPerHour: number,
  currentMinuteCount: number,
  currentHourCount: number
): {
  allowed: boolean;
  reason?: string;
  waitTime?: number;
} {
  // Check minute limit
  if (currentMinuteCount + messageCount > maxPerMinute) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded for current minute',
      waitTime: 60000 // Wait 1 minute
    };
  }

  // Check hour limit
  if (currentHourCount + messageCount > maxPerHour) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded for current hour',
      waitTime: 3600000 // Wait 1 hour
    };
  }

  return { allowed: true };
}

/**
 * Calculate rate limit reset time
 */
export function getRateLimitResetTime(limitType: 'minute' | 'hour'): Date {
  const now = new Date();
  
  if (limitType === 'minute') {
    // Reset at the start of next minute
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0);
  } else {
    // Reset at the start of next hour
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
  }
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(
  currentMinuteCount: number,
  currentHourCount: number,
  maxPerMinute: number,
  maxPerHour: number
): {
  minute: { used: number; limit: number; remaining: number; resetTime: Date };
  hour: { used: number; limit: number; remaining: number; resetTime: Date };
} {
  return {
    minute: {
      used: currentMinuteCount,
      limit: maxPerMinute,
      remaining: Math.max(0, maxPerMinute - currentMinuteCount),
      resetTime: getRateLimitResetTime('minute')
    },
    hour: {
      used: currentHourCount,
      limit: maxPerHour,
      remaining: Math.max(0, maxPerHour - currentHourCount),
      resetTime: getRateLimitResetTime('hour')
    }
  };
}

/**
 * Check if retry is needed based on error type
 */
export function shouldRetryBasedOnError(error: any): boolean {
  const retryableErrors = [
    'timeout',
    'network_error',
    'temporary_failure',
    'service_unavailable',
    'too_many_requests'
  ];

  const nonRetryableErrors = [
    'invalid_recipient',
    'invalid_content',
    'authentication_failed',
    'permission_denied',
    'quota_exceeded'
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Check for non-retryable errors first
  if (nonRetryableErrors.some(err => errorMessage.includes(err))) {
    return false;
  }
  
  // Check for retryable errors
  return retryableErrors.some(err => errorMessage.includes(err));
}

/**
 * Calculate backoff delay with jitter
 */
export function getBackoffDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitter: boolean = true
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  if (jitter) {
    // Add random jitter to prevent thundering herd
    const jitterAmount = exponentialDelay * 0.1; // 10% jitter
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.max(0, exponentialDelay + randomJitter);
  }
  
  return exponentialDelay;
}

/**
 * Get retry strategy based on error type
 */
export function getRetryStrategy(error: any): {
  shouldRetry: boolean;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
} {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Network errors - more aggressive retry
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return {
      shouldRetry: true,
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 10000
    };
  }
  
  // Rate limit errors - moderate retry with longer delays
  if (errorMessage.includes('rate_limit') || errorMessage.includes('too_many_requests')) {
    return {
      shouldRetry: true,
      maxRetries: 3,
      baseDelay: 5000,
      maxDelay: 30000
    };
  }
  
  // Service unavailable - moderate retry
  if (errorMessage.includes('service_unavailable') || errorMessage.includes('temporary')) {
    return {
      shouldRetry: true,
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 15000
    };
  }
  
  // Default - no retry
  return {
    shouldRetry: false,
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0
  };
}
