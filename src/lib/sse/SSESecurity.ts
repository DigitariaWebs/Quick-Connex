/**
 * SSE Security Component
 * 
 * Handles security-related operations for SSE connections.
 * Similar to SessionSecurity in the session system.
 */

import { SSESecurityContext, SSEConfig } from './SSETypes';

export interface SSESecurityConfig {
  maxConnectionsPerUser: number;
  maxConnectionsPerIP: number;
  suspiciousActivityThreshold: number;
  ipWhitelist: string[];
  ipBlacklist: string[];
  userAgentBlacklist: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
}

export const SSE_SECURITY_CONFIG: SSESecurityConfig = {
  maxConnectionsPerUser: 3,
  maxConnectionsPerIP: 10,
  suspiciousActivityThreshold: 70,
  ipWhitelist: [],
  ipBlacklist: [],
  userAgentBlacklist: ['bot', 'crawler', 'spider'],
  rateLimitWindow: 60000, // 1 minute
  rateLimitMax: 100
};

export class SSESecurity {
  private static connectionAttempts: Map<string, number[]> = new Map();
  private static ipConnections: Map<string, number> = new Map();
  private static userConnections: Map<string, number> = new Map();

  /**
   * Validate connection security
   */
  static async validateConnection(
    userId: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<{ valid: boolean; reason?: string; riskScore: number }> {
    try {
      // Check IP blacklist
      if (SSE_SECURITY_CONFIG.ipBlacklist.includes(ipAddress)) {
        return { valid: false, reason: 'IP address blocked', riskScore: 100 };
      }

      // Check user agent blacklist
      const userAgentLower = userAgent.toLowerCase();
      if (SSE_SECURITY_CONFIG.userAgentBlacklist.some(blocked => 
        userAgentLower.includes(blocked.toLowerCase())
      )) {
        return { valid: false, reason: 'User agent blocked', riskScore: 100 };
      }

      // Check connection limits
      const userConnectionCount = this.userConnections.get(userId) || 0;
      if (userConnectionCount >= SSE_SECURITY_CONFIG.maxConnectionsPerUser) {
        return { 
          valid: false, 
          reason: `Maximum ${SSE_SECURITY_CONFIG.maxConnectionsPerUser} connections per user`, 
          riskScore: 80 
        };
      }

      const ipConnectionCount = this.ipConnections.get(ipAddress) || 0;
      if (ipConnectionCount >= SSE_SECURITY_CONFIG.maxConnectionsPerIP) {
        return { 
          valid: false, 
          reason: `Maximum ${SSE_SECURITY_CONFIG.maxConnectionsPerIP} connections per IP`, 
          riskScore: 70 
        };
      }

      // Check rate limiting
      const now = Date.now();
      const attempts = this.connectionAttempts.get(ipAddress) || [];
      const recentAttempts = attempts.filter(time => now - time < SSE_SECURITY_CONFIG.rateLimitWindow);
      
      if (recentAttempts.length >= SSE_SECURITY_CONFIG.rateLimitMax) {
        return { 
          valid: false, 
          reason: 'Rate limit exceeded', 
          riskScore: 90 
        };
      }

      // Record connection attempt
      recentAttempts.push(now);
      this.connectionAttempts.set(ipAddress, recentAttempts);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(userId, ipAddress, userAgent, sessionId);

      return { valid: true, riskScore };

    } catch (error) {
      console.error('❌ SSE Security validation failed:', error);
      return { valid: false, reason: 'Security validation failed', riskScore: 100 };
    }
  }

  /**
   * Calculate connection risk score
   */
  static calculateRiskScore(
    userId: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): number {
    let riskScore = 0;

    // Base risk factors
    const userConnectionCount = this.userConnections.get(userId) || 0;
    const ipConnectionCount = this.ipConnections.get(ipAddress) || 0;

    // Multiple connections increase risk
    if (userConnectionCount > 1) riskScore += 20;
    if (ipConnectionCount > 5) riskScore += 30;

    // Suspicious user agent patterns
    const userAgentLower = userAgent.toLowerCase();
    if (userAgentLower.includes('bot')) riskScore += 50;
    if (userAgentLower.includes('crawler')) riskScore += 40;
    if (userAgentLower.includes('spider')) riskScore += 40;
    if (userAgentLower.length < 10) riskScore += 30; // Very short user agent

    // IP patterns
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      riskScore -= 10; // Local network, lower risk
    }

    // Session validation
    if (!sessionId || sessionId.length < 10) {
      riskScore += 40; // Invalid session ID
    }

    return Math.min(Math.max(riskScore, 0), 100);
  }

  /**
   * Record successful connection
   */
  static recordConnection(userId: string, ipAddress: string): void {
    const userCount = this.userConnections.get(userId) || 0;
    const ipCount = this.ipConnections.get(ipAddress) || 0;
    
    this.userConnections.set(userId, userCount + 1);
    this.ipConnections.set(ipAddress, ipCount + 1);
  }

  /**
   * Record connection disconnection
   */
  static recordDisconnection(userId: string, ipAddress: string): void {
    const userCount = this.userConnections.get(userId) || 0;
    const ipCount = this.ipConnections.get(ipAddress) || 0;
    
    if (userCount > 0) {
      this.userConnections.set(userId, userCount - 1);
    }
    if (ipCount > 0) {
      this.ipConnections.set(ipAddress, ipCount - 1);
    }
  }

  /**
   * Create security context
   */
  static createSecurityContext(
    userId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    riskScore: number
  ): SSESecurityContext {
    return {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      connectionTime: new Date(),
      lastActivity: new Date(),
      riskScore,
      securityFlags: this.getSecurityFlags(riskScore)
    };
  }

  /**
   * Get security flags based on risk score
   */
  static getSecurityFlags(riskScore: number): string[] {
    const flags: string[] = [];
    
    if (riskScore >= 80) flags.push('HIGH_RISK');
    if (riskScore >= 60) flags.push('SUSPICIOUS');
    if (riskScore >= 40) flags.push('MODERATE_RISK');
    if (riskScore >= 20) flags.push('LOW_RISK');
    
    return flags;
  }

  /**
   * Check if connection is suspicious
   */
  static isSuspicious(riskScore: number): boolean {
    return riskScore >= SSE_SECURITY_CONFIG.suspiciousActivityThreshold;
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    totalConnections: number;
    suspiciousConnections: number;
    blockedAttempts: number;
    averageRiskScore: number;
  } {
    const totalConnections = Array.from(this.userConnections.values()).reduce((a, b) => a + b, 0);
    const suspiciousConnections = Array.from(this.connectionAttempts.values())
      .filter(attempts => attempts.length > 5).length;
    const blockedAttempts = Array.from(this.connectionAttempts.values())
      .filter(attempts => attempts.length > SSE_SECURITY_CONFIG.rateLimitMax).length;
    
    return {
      totalConnections,
      suspiciousConnections,
      blockedAttempts,
      averageRiskScore: 0 // Would need to track this separately
    };
  }

  /**
   * Cleanup old connection attempts
   */
  static cleanupOldAttempts(): void {
    const now = Date.now();
    const cutoff = now - (SSE_SECURITY_CONFIG.rateLimitWindow * 2);
    
    this.connectionAttempts.forEach((attempts, ip) => {
      const recentAttempts = attempts.filter(time => time > cutoff);
      if (recentAttempts.length === 0) {
        this.connectionAttempts.delete(ip);
      } else {
        this.connectionAttempts.set(ip, recentAttempts);
      }
    });
  }
}
