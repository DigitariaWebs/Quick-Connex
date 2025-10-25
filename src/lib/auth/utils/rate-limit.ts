/**
 * Rate Limiting Utilities
 * 
 * Functions for managing rate limits and preventing abuse.
 */

/**
 * Generate rate limit key
 */
export function generateRateLimitKey(identifier: string, type: 'login' | 'signup' | 'password_reset'): string {
  return `${type}:${identifier}`;
}

/**
 * Check if rate limit is exceeded
 */
export function isRateLimitExceeded(
  rateLimitStore: Map<string, { count: number; resetTime: number }>,
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return false;
  }
  
  if (now > entry.resetTime) {
    rateLimitStore.delete(key);
    return false;
  }
  
  return entry.count >= maxAttempts;
}

/**
 * Update rate limit counter
 */
export function updateRateLimit(
  rateLimitStore: Map<string, { count: number; resetTime: number }>,
  key: string,
  windowMs: number
): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
  } else {
    entry.count++;
  }
}

