/**
 * Request Utilities
 * 
 * Functions for extracting and processing request information
 * for audit logging. Adapted for Express Request objects.
 */

import { Request } from 'express';
import { AuditRequestInfo } from '@/types/audit';

/**
 * Truncate string to specified length
 */
function truncate(str: string, options: { maxLength: number; preserveWords?: boolean }): string {
  const { maxLength, preserveWords = true } = options;
  
  if (str.length <= maxLength) {
    return str;
  }
  
  if (preserveWords) {
    const truncated = str.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) + '...' : truncated + '...';
  }
  
  return str.substring(0, maxLength) + '...';
}

/**
 * Sanitize string by removing potentially harmful characters
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Extract request information from Express Request
 */
export function extractRequestInfo(request: Request): AuditRequestInfo {
  const userAgent = request.get('User-Agent') || 'Unknown';
  const ipAddress = extractAuditIpAddress(request);
  const requestId = request.get('x-request-id') || undefined;
  const sessionId = request.get('x-session-id') || undefined;
  
  return {
    ipAddress,
    userAgent: truncate(sanitizeString(userAgent), { maxLength: 500, preserveWords: false }),
    method: request.method,
    endpoint: request.path,
    requestId,
    sessionId
  };
}

/**
 * Extract IP address from Express request
 */
export function extractAuditIpAddress(request: Request): string {
  const forwarded = request.get('x-forwarded-for');
  const realIp = request.get('x-real-ip');
  const cfConnectingIp = request.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return request.ip || request.connection?.remoteAddress || 'unknown';
}
