/**
 * Request Utilities
 * 
 * Functions for extracting and processing request information
 * for audit logging.
 */

import { NextRequest } from 'next/server';
import { AuditRequestInfo } from '../core/types';
import { 
  truncate, 
  maskEmail
} from '@/lib/utils/string-helpers';
import { 
  sanitizeString 
} from '@/lib/utils/request-validation';

/**
 * Extract request information from NextRequest
 */
export function extractRequestInfo(request: NextRequest): AuditRequestInfo {
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ipAddress = extractAuditIpAddress(request);
  const requestId = request.headers.get('x-request-id') || undefined;
  const sessionId = request.headers.get('x-session-id') || undefined;
  
  return {
    ipAddress,
    userAgent: truncate(sanitizeString(userAgent), { maxLength: 500, preserveWords: false }),
    method: request.method,
    endpoint: new URL(request.url).pathname,
    requestId,
    sessionId
  };
}

/**
 * Extract IP address from request
 */
export function extractAuditIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}
