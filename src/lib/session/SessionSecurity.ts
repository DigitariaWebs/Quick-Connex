/**
 * Session Security Enhancements
 * 
 * Essential security features for hospital management system
 */

import { NextRequest } from 'next/server';
import Session from '@/models/Session';
import User from '@/models/User';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export interface SecurityConfig {
  // Rate limiting
  maxLoginAttempts: number;
  loginWindowMs: number;
  maxSessionsPerUser: number;
  
  // Session security
  sessionTimeoutMinutes: number;
  requireIpBinding: boolean;
  suspiciousActivityThreshold: number;
  
  // Device security
  requireDeviceVerification: boolean;
  maxNewDevicesPerDay: number;
}

export const SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  loginWindowMs: 15 * 60 * 1000, // 15 minutes
  maxSessionsPerUser: 3,
  sessionTimeoutMinutes: 8 * 60, // 8 hours for hospital staff
  requireIpBinding: true,
  suspiciousActivityThreshold: 3,
  requireDeviceVerification: true,
  maxNewDevicesPerDay: 2
};

export class SessionSecurity {
  
  /**
   * Check rate limiting for login attempts
   */
  static async checkRateLimit(
    email: string, 
    ipAddress: string
  ): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    const key = `login:${email}:${ipAddress}`;
    const now = Date.now();
    
    // Clean expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
    
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + SECURITY_CONFIG.loginWindowMs });
      return { allowed: true };
    }
    
    if (now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + SECURITY_CONFIG.loginWindowMs });
      return { allowed: true };
    }
    
    if (current.count >= SECURITY_CONFIG.maxLoginAttempts) {
      return {
        allowed: false,
        reason: 'Too many login attempts',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      };
    }
    
    current.count++;
    return { allowed: true };
  }
  
  /**
   * Record failed login attempt
   */
  static async recordFailedAttempt(email: string, ipAddress: string): Promise<void> {
    const key = `failed:${email}:${ipAddress}`;
    const now = Date.now();
    
    const current = failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
    current.count++;
    current.lastAttempt = now;
    
    failedAttempts.set(key, current);
    
    // Log security event
    console.warn(`🚨 Security: Failed login attempt for ${email} from ${ipAddress} (${current.count} attempts)`);
  }
  
  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ suspicious: boolean; flags: string[] }> {
    const flags: string[] = [];
    
    try {
      // Check for multiple failed attempts
      const failedKey = `failed:${userId}:${ipAddress}`;
      const failedAttempts = SessionSecurity.getFailedAttempts(failedKey);
      if (failedAttempts >= SECURITY_CONFIG.suspiciousActivityThreshold) {
        flags.push('multiple_failed_attempts');
      }
      
      // Check for unusual IP patterns
      const recentSessions = await Session.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).select('ipAddress');
      
      const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress));
      if (uniqueIPs.size > 3) {
        flags.push('multiple_ip_addresses');
      }
      
      // Check for unusual user agents
      const userAgentPatterns = recentSessions.map(s => s.deviceInfo?.userAgent).filter(Boolean);
      const uniqueUserAgents = new Set(userAgentPatterns);
      if (uniqueUserAgents.size > 2) {
        flags.push('multiple_user_agents');
      }
      
      // Check for rapid session creation
      const recentSessionCount = await Session.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });
      
      if (recentSessionCount > 5) {
        flags.push('rapid_session_creation');
      }
      
      return {
        suspicious: flags.length > 0,
        flags
      };
      
    } catch (error) {
      console.error('Security check failed:', error);
      return { suspicious: false, flags: [] };
    }
  }
  
  /**
   * Enhanced device fingerprinting
   */
  static generateEnhancedFingerprint(
    userAgent: string,
    ipAddress: string,
    screenResolution?: string,
    timezone?: string,
    language?: string
  ): string {
    const components = [
      userAgent,
      ipAddress,
      screenResolution || 'unknown',
      timezone || 'unknown',
      language || 'unknown'
    ];
    
    // Create a more robust fingerprint
    return components.join('|');
  }
  
  /**
   * Calculate enhanced security risk score
   */
  static calculateRiskScore(
    isNewDevice: boolean,
    isNewLocation: boolean,
    suspiciousFlags: string[],
    userType: string,
    existingSessions: any[]
  ): number {
    let riskScore = 0;
    
    // Base risk
    riskScore += 10;
    
    // New device risk
    if (isNewDevice) {
      riskScore += 20;
    }
    
    // New location risk
    if (isNewLocation) {
      riskScore += 15;
    }
    
    // Suspicious activity risk
    riskScore += suspiciousFlags.length * 10;
    
    // User type risk (admin accounts are higher risk)
    if (userType === 'super_admin') {
      riskScore += 15;
    } else if (userType === 'admin') {
      riskScore += 10;
    }
    
    // Concurrent sessions risk
    if (existingSessions.length > 2) {
      riskScore += 10;
    }
    
    // Cap at 100
    return Math.min(riskScore, 100);
  }
  
  /**
   * Check IP binding for session validation
   */
  static async validateIpBinding(
    sessionId: string,
    currentIp: string
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!SECURITY_CONFIG.requireIpBinding) {
      return { valid: true };
    }
    
    try {
      const session = await Session.findOne({ sessionId });
      
      if (!session) {
        return { valid: false, reason: 'Session not found' };
      }
      
      // Allow some IP variation (for mobile users, VPNs)
      const sessionIp = session.ipAddress;
      const ipMatch = sessionIp === currentIp;
      
      if (!ipMatch) {
        console.warn(`🚨 Security: IP mismatch for session ${sessionId}. Expected: ${sessionIp}, Got: ${currentIp}`);
        return { valid: false, reason: 'IP address mismatch' };
      }
      
      return { valid: true };
      
    } catch (error) {
      console.error('IP binding validation failed:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }
  
  /**
   * Get security recommendations based on risk score
   */
  static getSecurityRecommendations(riskScore: number, flags: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskScore >= 70) {
      recommendations.push('Consider requiring additional authentication');
      recommendations.push('Monitor session activity closely');
    }
    
    if (riskScore >= 50) {
      recommendations.push('Enable session timeout warnings');
      recommendations.push('Consider IP binding');
    }
    
    if (flags.includes('multiple_failed_attempts')) {
      recommendations.push('Account may be compromised - consider password reset');
    }
    
    if (flags.includes('multiple_ip_addresses')) {
      recommendations.push('Unusual IP activity detected');
    }
    
    if (flags.includes('rapid_session_creation')) {
      recommendations.push('Suspicious session creation pattern');
    }
    
    return recommendations;
  }
  
  /**
   * Log security events
   */
  static async logSecurityEvent(
    event: string,
    userId: string,
    details: any
  ): Promise<void> {
    console.log(`🔒 Security Event: ${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      details
    });
    
    // In production, save to audit log database
    // await AuditLog.create({ event, userId, details, timestamp: new Date() });
  }
  
  /**
   * Get failed attempts count
   */
  private static getFailedAttempts(key: string): number {
    const current = failedAttempts.get(key);
    if (!current) return 0;
    
    // Reset if too old
    const now = Date.now();
    if (now - current.lastAttempt > SECURITY_CONFIG.loginWindowMs) {
      failedAttempts.delete(key);
      return 0;
    }
    
    return current.count;
  }
}
