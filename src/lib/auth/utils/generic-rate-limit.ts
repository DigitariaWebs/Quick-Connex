/**
 * Generic Rate Limiting for Auth Routes
 * 
 * Extends the auth module's rate limiting to be usable by any endpoint.
 * Provides a simple rate limiting function that can be used by auth-related routes.
 */

import { NextRequest } from 'next/server';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface GenericRateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: RateLimitOptions) {
  return (request: NextRequest): GenericRateLimitResult => {
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }

    const key = `${ip}:${Math.floor(now / options.windowMs)}`;
    const current = rateLimitStore.get(key) || { 
      count: 0, 
      resetTime: now + options.windowMs 
    };

    if (current.count >= options.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }

    current.count++;
    rateLimitStore.set(key, current);

    return {
      success: true,
      remaining: options.maxRequests - current.count,
      resetTime: current.resetTime,
    };
  };
}
