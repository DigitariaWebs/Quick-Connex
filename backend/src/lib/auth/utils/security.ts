/**
 * Security and Risk Assessment Utilities
 * 
 * Functions for security checks, risk assessment, and suspicious activity detection.
 */

import { Request } from 'express';
import { 
  SecurityCheck,
  RiskAssessment
} from '../../../types/auth';
import { AUTH_CONFIG } from '../core/config';
import { log } from '../../logging';
import Session from '../../../models/Session';

/**
 * Assess security risk based on various factors
 */
export function assessSecurityRisk(
  isNewDevice: boolean,
  isNewLocation: boolean,
  suspiciousFlags: string[],
  userType: 'employee' | 'manager' | 'admin' | 'super_admin'
): RiskAssessment {
  let score = 0;
  
  // Weight factors
  if (isNewDevice) score += 20;
  if (isNewLocation) score += 15;
  score += suspiciousFlags.length * 10;
  
  // Higher security for admin accounts
  if (userType === 'admin' || userType === 'super_admin') {
    score += 10;
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (score >= AUTH_CONFIG.highRiskThreshold) {
    riskLevel = 'high';
  } else if (score >= AUTH_CONFIG.mediumRiskThreshold) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Generate recommendations based on risk level
  const recommendations: string[] = [];
  if (riskLevel === 'high') {
    recommendations.push('Enable 2FA immediately');
    recommendations.push('Review login history');
    recommendations.push('Change password if suspicious');
  } else if (riskLevel === 'medium') {
    recommendations.push('Monitor account activity');
    recommendations.push('Consider enabling 2FA');
  }
  
  return {
    riskScore: Math.min(score, 100),
    riskLevel,
    flags: suspiciousFlags,
    recommendations
  };
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  userId: string,
  ipAddress: string,
  userAgent: string,
  failedAttempts?: Map<string, { count: number; lastAttempt: number }>
): Promise<SecurityCheck> {
  const flags: string[] = [];
  
  try {
    // Check for multiple failed attempts
    if (failedAttempts) {
      const userFailedAttempts = failedAttempts.get(userId) || { count: 0, lastAttempt: 0 };
      if (userFailedAttempts.count > AUTH_CONFIG.suspiciousActivityThreshold) {
        flags.push('multiple_failed_logins');
      }
    }
    
    // Check for unusual IP address
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSessions = await Session.find({ 
      userId, 
      createdAt: { $gte: twentyFourHoursAgo },
      isActive: true
    }).lean();
    
    const hasRecentIp = recentSessions.some((s: any) => s.ipAddress === ipAddress);
    if (!hasRecentIp && recentSessions.length > 0) {
      flags.push('unusual_ip_address');
    }
    
    // Check for rapid location changes
    if (recentSessions.length > 0) {
      const uniqueIPs = new Set(recentSessions.map((s: any) => s.ipAddress));
      if (uniqueIPs.size > 3) {
        flags.push('multiple_locations');
      }
    }
    
    // Check for unusual user agent
    const hasRecentUserAgent = recentSessions.some((s: any) => 
      s.deviceInfo?.userAgent === userAgent
    );
    if (!hasRecentUserAgent && recentSessions.length > 0) {
      flags.push('unusual_user_agent');
    }
    
    // Calculate risk score
    let riskScore = 20; // Base score
    if (flags.includes('multiple_failed_logins')) riskScore += 30;
    if (flags.includes('unusual_ip_address')) riskScore += 20;
    if (flags.includes('multiple_locations')) riskScore += 15;
    if (flags.includes('unusual_user_agent')) riskScore += 15;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (riskScore >= 70) {
      recommendations.push('Enable 2FA');
      recommendations.push('Review account activity');
      recommendations.push('Change password');
    } else if (riskScore >= 40) {
      recommendations.push('Monitor account activity');
      recommendations.push('Consider enabling 2FA');
    }
    
    return {
      suspicious: flags.length > 0,
      flags,
      riskScore: Math.min(riskScore, 100),
      recommendations
    };
    
  } catch (error) {
    log.error('Error checking suspicious activity', {
      userId,
      ipAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Return safe defaults on error
    return {
      suspicious: false,
      flags: [],
      riskScore: 20,
      recommendations: []
    };
  }
}

/**
 * Extract IP address from Express request
 */
export function extractIpAddress(request: Request): string {
  // Try various headers in order of preference
  const forwarded = request.get('x-forwarded-for');
  const realIp = request.get('x-real-ip');
  const cfConnectingIp = request.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : 'unknown';
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // Fallback to socket address
  return request.ip || request.socket?.remoteAddress || 'unknown';
}

/**
 * Check if device is new for user
 */
export async function isNewDevice(
  userId: string,
  deviceFingerprint: string
): Promise<boolean> {
  try {
    const existingSession = await Session.findOne({
      userId,
      'securityContext.fingerprint': deviceFingerprint,
      isActive: true
    }).lean();
    
    return existingSession == null;
  } catch (error) {
    log.error('Error checking new device', {
      userId,
      deviceFingerprint,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Assume new device on error for security
    return true;
  }
}

/**
 * Check if location is new for user
 */
export async function isNewLocation(
  userId: string,
  ipAddress: string
): Promise<boolean> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const existingSession = await Session.findOne({
      userId,
      ipAddress,
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    }).lean();
    
    return !existingSession;
  } catch (error) {
    log.error('Error checking new location', {
      userId,
      ipAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Assume new location on error for security
    return true;
  }
}

/**
 * Validate IP address format
 */
export function isValidIpAddress(ip: string): boolean {
  if (!ip || ip === 'unknown') {
    return false;
  }
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Sanitize IP address for logging
 */
export function sanitizeIpAddress(ip: string): string {
  if (!isValidIpAddress(ip)) {
    return 'unknown';
  }
  
  // Mask last octet of IPv4 for privacy
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  
  return ip;
}

/**
 * Check if request is from known bot
 */
export function isBotRequest(userAgent: string): boolean {
  if (!userAgent) {
    return false;
  }
  
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Calculate session risk score
 */
export function calculateSessionRiskScore(
  isNewDevice: boolean,
  isNewLocation: boolean,
  failedAttempts: number,
  suspiciousFlags: string[],
  userType: 'employee' | 'manager' | 'admin' | 'super_admin'
): number {
  let score = 0;
  
  // Base factors
  if (isNewDevice) score += 20;
  if (isNewLocation) score += 15;
  score += Math.min(failedAttempts * 10, 30); // Cap at 30
  score += suspiciousFlags.length * 10;
  
  // Account type multiplier
  if (userType === 'super_admin') {
    score = Math.floor(score * 1.3);
  } else if (userType === 'admin') {
    score = Math.floor(score * 1.2);
  }
  
  return Math.min(score, 100);
}

/**
 * Generate security recommendations
 */
export function generateSecurityRecommendations(
  riskScore: number,
  flags: string[]
): string[] {
  const recommendations: string[] = [];
  
  if (riskScore >= 70) {
    recommendations.push('Immediate action required');
    recommendations.push('Enable two-factor authentication');
    recommendations.push('Review recent account activity');
    recommendations.push('Change password immediately');
    recommendations.push('Check for unauthorized access');
  } else if (riskScore >= 40) {
    recommendations.push('Monitor account activity closely');
    recommendations.push('Consider enabling two-factor authentication');
    recommendations.push('Review login history');
  } else {
    recommendations.push('Account appears secure');
    recommendations.push('Continue monitoring activity');
  }
  
  // Flag-specific recommendations
  if (flags.includes('multiple_failed_logins')) {
    recommendations.push('Multiple failed login attempts detected');
  }
  if (flags.includes('unusual_ip_address')) {
    recommendations.push('Login from new location detected');
  }
  if (flags.includes('unusual_user_agent')) {
    recommendations.push('Login from new device detected');
  }
  
  return recommendations;
}
