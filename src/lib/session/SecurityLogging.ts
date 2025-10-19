/**
 * Enhanced Security Logging System
 * 
 * This file provides comprehensive security event logging capabilities
 * integrated with the session security system.
 */

import dbConnect from '@/lib/database/mongoose';
import mongoose from 'mongoose';

// Security event types
export type SecurityEventType = 
  | 'session_created'
  | 'session_revoked'
  | 'session_expired'
  | 'session_hijack_attempt'
  | 'login_success'
  | 'login_failed'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'device_fingerprint_mismatch'
  | 'ip_address_change'
  | 'concurrent_session_limit'
  | 'user_account_blocked'
  | 'admin_action'
  | 'security_cleanup'
  | 'system_alert';

// Security event severity levels
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

// Security event interface
export interface SecurityEvent {
  eventId: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  description: string;
  metadata: Record<string, any>;
  riskScore?: number;
  securityFlags?: string[];
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

// Security event schema
const SecurityEventSchema = new mongoose.Schema<SecurityEvent>({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'session_created', 'session_revoked', 'session_expired', 'session_hijack_attempt',
      'login_success', 'login_failed', 'rate_limit_exceeded', 'suspicious_activity',
      'device_fingerprint_mismatch', 'ip_address_change', 'concurrent_session_limit',
      'user_account_blocked', 'admin_action', 'security_cleanup', 'system_alert'
    ],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: String,
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  securityFlags: [String],
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String
}, {
  timestamps: true,
  collection: 'security_events'
});

// Indexes for performance
SecurityEventSchema.index({ eventType: 1, timestamp: -1 });
SecurityEventSchema.index({ severity: 1, timestamp: -1 });
SecurityEventSchema.index({ userId: 1, timestamp: -1 });
SecurityEventSchema.index({ ipAddress: 1, timestamp: -1 });
SecurityEventSchema.index({ resolved: 1, timestamp: -1 });

// Create or get the SecurityEvent model
const SecurityEventModel = mongoose.models.SecurityEvent as mongoose.Model<SecurityEvent> || 
  mongoose.model<SecurityEvent>('SecurityEvent', SecurityEventSchema);

/**
 * Security event logging system
 */
export class SecurityLogging {
  
  /**
   * Log a security event
   */
  static async logEvent(
    eventType: SecurityEventType,
    severity: SecurityEventSeverity,
    description: string,
    metadata: {
      userId?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent?: string;
      riskScore?: number;
      securityFlags?: string[];
      [key: string]: any;
    }
  ): Promise<string> {
    try {
      await dbConnect();
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const securityEvent = new SecurityEventModel({
        eventId,
        eventType,
        severity,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        timestamp: new Date(),
        description,
        metadata,
        riskScore: metadata.riskScore,
        securityFlags: metadata.securityFlags,
        resolved: false
      });
      
      await securityEvent.save();
      
      // Log to console for immediate visibility
      console.log(`🔒 Security Event [${severity.toUpperCase()}]: ${eventType} - ${description}`, {
        eventId,
        userId: metadata.userId,
        ipAddress: metadata.ipAddress,
        riskScore: metadata.riskScore
      });
      
      // Trigger alerts for high severity events
      if (severity === 'high' || severity === 'critical') {
        await this.triggerSecurityAlert(securityEvent);
      }
      
      return eventId;
      
    } catch (error) {
      console.error('❌ Failed to log security event:', error);
      throw error;
    }
  }
  
  /**
   * Log session creation event
   */
  static async logSessionCreated(
    userId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    riskScore: number,
    securityFlags: string[]
  ): Promise<string> {
    const severity: SecurityEventSeverity = 
      riskScore >= 70 ? 'high' : 
      riskScore >= 40 ? 'medium' : 'low';
    
    return this.logEvent('session_created', severity, 
      `Session created for user ${userId} with risk score ${riskScore}`, {
      userId,
      sessionId,
      ipAddress,
      userAgent,
      riskScore,
      securityFlags
    });
  }
  
  /**
   * Log session revocation event
   */
  static async logSessionRevoked(
    userId: string,
    sessionId: string,
    ipAddress: string,
    reason: string,
    revokedBy?: string
  ): Promise<string> {
    return this.logEvent('session_revoked', 'medium',
      `Session ${sessionId} revoked for user ${userId}: ${reason}`, {
      userId,
      sessionId,
      ipAddress,
      revokedBy
    });
  }
  
  /**
   * Log login success event
   */
  static async logLoginSuccess(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    return this.logEvent('login_success', 'low',
      `Successful login for user ${email}`, {
      userId,
      ipAddress,
      userAgent,
      email
    });
  }
  
  /**
   * Log login failure event
   */
  static async logLoginFailure(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
    consecutiveFailures: number
  ): Promise<string> {
    const severity: SecurityEventSeverity = 
      consecutiveFailures >= 5 ? 'high' : 
      consecutiveFailures >= 3 ? 'medium' : 'low';
    
    return this.logEvent('login_failed', severity,
      `Failed login attempt for ${email}: ${reason} (${consecutiveFailures} consecutive failures)`, {
      ipAddress,
      userAgent,
      email,
      consecutiveFailures,
      reason
    });
  }
  
  /**
   * Log rate limit exceeded event
   */
  static async logRateLimitExceeded(
    identifier: string,
    ipAddress: string,
    limitType: string,
    attempts: number,
    windowMs: number
  ): Promise<string> {
    return this.logEvent('rate_limit_exceeded', 'medium',
      `Rate limit exceeded for ${identifier}: ${attempts} attempts in ${windowMs}ms`, {
      ipAddress,
      identifier,
      limitType,
      attempts,
      windowMs
    });
  }
  
  /**
   * Log suspicious activity event
   */
  static async logSuspiciousActivity(
    userId: string,
    sessionId: string,
    ipAddress: string,
    activity: string,
    riskScore: number,
    securityFlags: string[]
  ): Promise<string> {
    const severity: SecurityEventSeverity = 
      riskScore >= 80 ? 'critical' : 
      riskScore >= 60 ? 'high' : 'medium';
    
    return this.logEvent('suspicious_activity', severity,
      `Suspicious activity detected: ${activity}`, {
      userId,
      sessionId,
      ipAddress,
      riskScore,
      securityFlags,
      activity
    });
  }
  
  /**
   * Log device fingerprint mismatch event
   */
  static async logDeviceFingerprintMismatch(
    userId: string,
    sessionId: string,
    ipAddress: string,
    expectedFingerprint: string,
    actualFingerprint: string
  ): Promise<string> {
    return this.logEvent('device_fingerprint_mismatch', 'high',
      `Device fingerprint mismatch for session ${sessionId}`, {
      userId,
      sessionId,
      ipAddress,
      expectedFingerprint,
      actualFingerprint
    });
  }
  
  /**
   * Log IP address change event
   */
  static async logIPAddressChange(
    userId: string,
    sessionId: string,
    oldIP: string,
    newIP: string
  ): Promise<string> {
    return this.logEvent('ip_address_change', 'medium',
      `IP address changed for session ${sessionId} from ${oldIP} to ${newIP}`, {
      userId,
      sessionId,
      ipAddress: newIP,
      oldIP,
      newIP
    });
  }
  
  /**
   * Log admin action event
   */
  static async logAdminAction(
    adminId: string,
    action: string,
    targetUserId?: string,
    targetSessionId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.logEvent('admin_action', 'medium',
      `Admin action: ${action}`, {
      userId: adminId,
      sessionId: targetSessionId,
      ipAddress: 'admin',
      action,
      targetUserId,
      ...metadata
    });
  }
  
  /**
   * Log security cleanup event
   */
  static async logSecurityCleanup(
    cleanupType: string,
    itemsCleaned: number,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.logEvent('security_cleanup', 'low',
      `Security cleanup: ${cleanupType} - ${itemsCleaned} items cleaned`, {
      ipAddress: 'system',
      cleanupType,
      itemsCleaned,
      ...metadata
    });
  }
  
  /**
   * Trigger security alert for high severity events
   */
  private static async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // Log critical alert
      console.log(`🚨 CRITICAL SECURITY ALERT: ${event.eventType}`, {
        eventId: event.eventId,
        severity: event.severity,
        description: event.description,
        userId: event.userId,
        ipAddress: event.ipAddress,
        timestamp: event.timestamp
      });
      
      // In a production environment, you would:
      // 1. Send email alerts to security team
      // 2. Send Slack/Teams notifications
      // 3. Create tickets in security management system
      // 4. Trigger automated responses
      
      // For now, just log the alert
      console.log(`🔔 Security alert triggered for event ${event.eventId}`);
      
    } catch (error) {
      console.error('❌ Failed to trigger security alert:', error);
    }
  }
  
  /**
   * Get security events with filtering
   */
  static async getSecurityEvents(filters: {
    eventType?: SecurityEventType;
    severity?: SecurityEventSeverity;
    userId?: string;
    ipAddress?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    events: SecurityEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      await dbConnect();
      
      const query: any = {};
      
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.severity) query.severity = filters.severity;
      if (filters.userId) query.userId = filters.userId;
      if (filters.ipAddress) query.ipAddress = filters.ipAddress;
      if (filters.resolved !== undefined) query.resolved = filters.resolved;
      
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      const [events, total] = await Promise.all([
        SecurityEventModel.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(offset)
          .lean(),
        SecurityEventModel.countDocuments(query)
      ]);
      
      return {
        events,
        total,
        hasMore: offset + limit < total
      };
      
    } catch (error) {
      console.error('❌ Failed to get security events:', error);
      throw error;
    }
  }
  
  /**
   * Get security statistics
   */
  static async getSecurityStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByUser: Record<string, number>;
    eventsByIP: Record<string, number>;
    unresolvedEvents: number;
    criticalEvents: number;
  }> {
    try {
      await dbConnect();
      
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter['timestamp'] = {};
        if (startDate) dateFilter['timestamp'].$gte = startDate;
        if (endDate) dateFilter['timestamp'].$lte = endDate;
      }
      
      const [
        totalEvents,
        eventsByType,
        eventsBySeverity,
        eventsByUser,
        eventsByIP,
        unresolvedEvents,
        criticalEvents
      ] = await Promise.all([
        SecurityEventModel.countDocuments(dateFilter),
        
        SecurityEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$eventType', count: { $sum: 1 } } }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        
        SecurityEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        
        SecurityEventModel.aggregate([
          { $match: { ...dateFilter, userId: { $exists: true } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        
        SecurityEventModel.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).then(result => 
          result.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
        ),
        
        SecurityEventModel.countDocuments({ ...dateFilter, resolved: false }),
        SecurityEventModel.countDocuments({ ...dateFilter, severity: 'critical' })
      ]);
      
      return {
        totalEvents,
        eventsByType,
        eventsBySeverity,
        eventsByUser,
        eventsByIP,
        unresolvedEvents,
        criticalEvents
      };
      
    } catch (error) {
      console.error('❌ Failed to get security statistics:', error);
      throw error;
    }
  }
  
  /**
   * Resolve a security event
   */
  static async resolveEvent(
    eventId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<boolean> {
    try {
      await dbConnect();
      
      const result = await SecurityEventModel.updateOne(
        { eventId },
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolution
        }
      );
      
      return result.modifiedCount > 0;
      
    } catch (error) {
      console.error('❌ Failed to resolve security event:', error);
      return false;
    }
  }
  
  /**
   * Clean up old security events
   */
  static async cleanupOldEvents(olderThanDays: number = 90): Promise<number> {
    try {
      await dbConnect();
      
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const result = await SecurityEventModel.deleteMany({
        timestamp: { $lt: cutoffDate },
        resolved: true
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old security events`);
      return result.deletedCount;
      
    } catch (error) {
      console.error('❌ Failed to cleanup old security events:', error);
      return 0;
    }
  }
}

export default SecurityLogging;
