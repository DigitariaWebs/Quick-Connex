/**
 * Rate Limiting Utilities
 * 
 * Rate limiting for authentication endpoints and security.
 */

import { RateLimitResult } from '../../../types/auth';
import { RATE_LIMITS } from '../core/constants';
import { log } from '../../logging';

/**
 * In-memory rate limit store
 * In production, use Redis or similar distributed cache
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetAt: number }>;
  
  constructor() {
    this.store = new Map();
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Check if rate limit is exceeded
   */
  check(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);
    
    // No entry or expired entry
    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        limit: maxAttempts,
        windowMs
      };
    }
    
    // Entry exists and not expired
    if (entry.count >= maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        reason: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
        remaining: 0,
        limit: maxAttempts,
        windowMs
      };
    }
    
    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      limit: maxAttempts,
      windowMs
    };
  }
  
  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.store.delete(key);
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.debug('Rate limit store cleanup', { cleaned, remaining: this.store.size });
    }
  }
  
  /**
   * Get store statistics
   */
  getStats(): { total: number; active: number } {
    const now = Date.now();
    let active = 0;
    
    for (const entry of this.store.values()) {
      if (now < entry.resetAt) {
        active++;
      }
    }
    
    return {
      total: this.store.size,
      active
    };
  }
}

// Singleton instance
export const rateLimitStore = new RateLimitStore();

/**
 * Generate rate limit key
 */
export function generateRateLimitKey(
  identifier: string,
  operation: string,
  ipAddress?: string
): string {
  const parts = [operation, identifier];
  if (ipAddress) {
    parts.push(ipAddress);
  }
  return parts.join(':');
}

/**
 * Check login rate limit
 */
export function checkLoginRateLimit(email: string, ipAddress: string): RateLimitResult {
  const key = generateRateLimitKey(email, 'login', ipAddress);
  return rateLimitStore.check(
    key,
    RATE_LIMITS.MAX_LOGIN_ATTEMPTS,
    RATE_LIMITS.LOGIN_WINDOW_MS
  );
}

/**
 * Check signup rate limit
 */
export function checkSignupRateLimit(email: string, ipAddress: string): RateLimitResult {
  const key = generateRateLimitKey(email, 'signup', ipAddress);
  return rateLimitStore.check(
    key,
    RATE_LIMITS.MAX_SIGNUP_ATTEMPTS,
    RATE_LIMITS.SIGNUP_WINDOW_MS
  );
}

/**
 * Check password reset rate limit
 */
export function checkPasswordResetRateLimit(email: string, ipAddress: string): RateLimitResult {
  const key = generateRateLimitKey(email, 'password_reset', ipAddress);
  return rateLimitStore.check(
    key,
    RATE_LIMITS.MAX_PASSWORD_RESET_ATTEMPTS,
    RATE_LIMITS.PASSWORD_RESET_WINDOW_MS
  );
}

/**
 * Check token refresh rate limit
 */
export function checkTokenRefreshRateLimit(userId: string, ipAddress: string): RateLimitResult {
  const key = generateRateLimitKey(userId, 'token_refresh', ipAddress);
  return rateLimitStore.check(
    key,
    RATE_LIMITS.MAX_TOKEN_REFRESH_ATTEMPTS,
    RATE_LIMITS.TOKEN_REFRESH_WINDOW_MS
  );
}

/**
 * Check API request rate limit
 */
export function checkApiRateLimit(identifier: string, ipAddress: string): RateLimitResult {
  const key = generateRateLimitKey(identifier, 'api', ipAddress);
  return rateLimitStore.check(
    key,
    RATE_LIMITS.MAX_API_REQUESTS_PER_MINUTE,
    60 * 1000 // 1 minute
  );
}

/**
 * Reset rate limit
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.reset(key);
}

/**
 * Failed login attempts tracking
 */
class FailedAttemptsTracker {
  private attempts: Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>;
  
  constructor() {
    this.attempts = new Map();
    
    // Cleanup expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }
  
  /**
   * Record failed attempt
   */
  record(identifier: string): void {
    const now = Date.now();
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return;
    }
    
    entry.count++;
    entry.lastAttempt = now;
    
    // Lock account after max attempts
    if (entry.count >= RATE_LIMITS.MAX_LOGIN_ATTEMPTS) {
      entry.lockedUntil = now + (30 * 60 * 1000); // Lock for 30 minutes
      log.warn('Account locked due to failed attempts', {
        identifier,
        attempts: entry.count
      });
    }
  }
  
  /**
   * Reset attempts
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
  
  /**
   * Check if locked
   */
  isLocked(identifier: string): boolean {
    const entry = this.attempts.get(identifier);
    if (!entry || !entry.lockedUntil) {
      return false;
    }
    
    const now = Date.now();
    if (now >= entry.lockedUntil) {
      // Lock expired, reset
      this.reset(identifier);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get attempt count
   */
  getCount(identifier: string): number {
    return this.attempts.get(identifier)?.count || 0;
  }
  
  /**
   * Get time until unlock
   */
  getTimeUntilUnlock(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || !entry.lockedUntil) {
      return 0;
    }
    
    const now = Date.now();
    return Math.max(0, entry.lockedUntil - now);
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredThreshold = now - (60 * 60 * 1000); // 1 hour
    let cleaned = 0;
    
    for (const [key, entry] of this.attempts.entries()) {
      // Remove if last attempt was over 1 hour ago
      if (entry.lastAttempt < expiredThreshold) {
        this.attempts.delete(key);
        cleaned++;
      }
      // Remove if lock expired
      else if (entry.lockedUntil && now >= entry.lockedUntil) {
        this.attempts.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.debug('Failed attempts cleanup', { cleaned, remaining: this.attempts.size });
    }
  }
}

// Singleton instance
export const failedAttemptsTracker = new FailedAttemptsTracker();

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(options: {
  maxAttempts: number;
  windowMs: number;
  keyGenerator?: (req: any) => string;
  message?: string;
}) {
  return (req: any, res: any, next: any) => {
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : `${req.ip}:${req.path}`;
    
    const result = rateLimitStore.check(key, options.maxAttempts, options.windowMs);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit || options.maxAttempts);
    res.setHeader('X-RateLimit-Remaining', result.remaining || 0);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 0);
      return res.status(429).json({
        success: false,
        error: options.message || result.reason || 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  rateLimit: { total: number; active: number };
  failedAttempts: { total: number };
} {
  return {
    rateLimit: rateLimitStore.getStats(),
    failedAttempts: {
      total: failedAttemptsTracker['attempts'].size
    }
  };
}
