/**
 * Session Model
 * 
 * Mongoose model for session management with dual-token system integration.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ISession, SecurityContext } from '../types/auth';

/**
 * Session Document Interface
 */
export interface ISessionDocument extends Omit<ISession, '_id'>, Document {}

/**
 * Session Schema
 */
const sessionSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    userAgent: { type: String, required: true },
    platform: { type: String, required: true },
    browser: { type: String, required: true },
    browserVersion: { type: String, required: true },
    os: { type: String, required: true },
    osVersion: { type: String, required: true },
    deviceType: { 
      type: String, 
      enum: ['desktop', 'mobile', 'tablet'],
      required: true 
    },
    screenResolution: String,
    timezone: { type: String, required: true },
    language: { type: String, required: true }
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  location: {
    country: String,
    countryCode: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  revoked: {
    type: Boolean,
    default: false,
    index: true
  },
  revokedAt: Date,
  revokedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedReason: String,
  securityContext: {
    fingerprint: { type: String, required: true },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    isNewDevice: { type: Boolean, default: false },
    isNewLocation: { type: Boolean, default: false },
    suspiciousActivity: { type: Boolean, default: false },
    lastSecurityCheck: { type: Date, default: Date.now },
    securityFlags: [{ type: String }]
  },
  // DUAL TOKEN SYSTEM: Track current token IDs
  accessTokenId: {
    type: String,
    index: true
  },
  refreshTokenId: {
    type: String,
    index: true
  },
  sessionType: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web',
    index: true
  },
  concurrentSessions: {
    type: Number,
    default: 1
  },
  isPrimary: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Performance-optimized indexes
sessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });
sessionSchema.index({ sessionId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastAccessedAt: 1 });
sessionSchema.index({ ipAddress: 1, createdAt: 1 });
sessionSchema.index({ 'securityContext.riskScore': 1, createdAt: 1 });
sessionSchema.index({ sessionType: 1, isActive: 1 });
sessionSchema.index({ 'deviceInfo.deviceType': 1, isActive: 1 });
sessionSchema.index({ userId: 1, sessionType: 1, isActive: 1 });
sessionSchema.index({ createdAt: 1, isActive: 1, revoked: 1 });
sessionSchema.index({ 'securityContext.riskScore': 1, isActive: 1, lastAccessedAt: 1 });

// TTL index for automatic cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Instance methods
 */
sessionSchema.methods['isExpired'] = function(): boolean {
  return new Date() > this['expiresAt'];
};

sessionSchema.methods['isRevoked'] = function(): boolean {
  return this['revoked'];
};

sessionSchema.methods['isValid'] = function(): boolean {
  return this['isActive'] && !this['revoked'] && !this['isExpired']();
};

sessionSchema.methods['updateLastAccessed'] = async function(): Promise<ISessionDocument> {
  this['lastAccessedAt'] = new Date();
  return this['save']();
};

sessionSchema.methods['revokeSession'] = async function(
  revokedBy?: mongoose.Types.ObjectId, 
  reason?: string
): Promise<ISessionDocument> {
  this['revoked'] = true;
  this['revokedAt'] = new Date();
  this['revokedBy'] = revokedBy;
  this['revokedReason'] = reason;
  this['isActive'] = false;
  return this['save']();
};

sessionSchema.methods['extendSession'] = async function(additionalHours: number = 24): Promise<ISessionDocument> {
  this['expiresAt'] = new Date(Date.now() + (additionalHours * 60 * 60 * 1000));
  return this['save']();
};

sessionSchema.methods['getSecurityRisk'] = function(): 'low' | 'medium' | 'high' {
  if (this['securityContext']['riskScore'] >= 70) return 'high';
  if (this['securityContext']['riskScore'] >= 40) return 'medium';
  return 'low';
};

sessionSchema.methods['getSessionAge'] = function(): number {
  return Math.floor((Date.now() - this['createdAt'].getTime()) / (1000 * 60));
};

sessionSchema.methods['getRemainingTime'] = function(): number {
  return Math.floor((this['expiresAt'].getTime() - Date.now()) / (1000 * 60));
};

/**
 * Update token IDs for dual-token system
 */
sessionSchema.methods['updateTokenIds'] = async function(
  accessTokenId: string, 
  refreshTokenId: string
): Promise<ISessionDocument> {
  this['accessTokenId'] = accessTokenId;
  this['refreshTokenId'] = refreshTokenId;
  return this['save']();
};

/**
 * Static methods
 */
sessionSchema.statics = {
  /**
   * Find active sessions for user
   */
  async findActiveSessions(userId: string): Promise<ISessionDocument[]> {
    return this.find({ 
      userId, 
      isActive: true, 
      revoked: false, 
      expiresAt: { $gt: new Date() } 
    });
  },

  /**
   * Find session by session ID
   */
  async findBySessionId(sessionId: string): Promise<ISessionDocument | null> {
    return this.findOne({ sessionId, isActive: true, revoked: false });
  },

  /**
   * Find session by access token ID
   */
  async findByAccessTokenId(accessTokenId: string): Promise<ISessionDocument | null> {
    return this.findOne({ accessTokenId, isActive: true, revoked: false });
  },

  /**
   * Find session by refresh token ID
   */
  async findByRefreshTokenId(refreshTokenId: string): Promise<ISessionDocument | null> {
    return this.findOne({ refreshTokenId, isActive: true, revoked: false });
  },

  /**
   * Revoke all user sessions
   */
  async revokeAllUserSessions(userId: string, revokedBy?: mongoose.Types.ObjectId): Promise<number> {
    const result = await this.updateMany(
      { userId, isActive: true },
      { 
        revoked: true, 
        revokedAt: new Date(), 
        revokedBy,
        revokedReason: 'User logout or admin action'
      }
    );
    return result.modifiedCount;
  },

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    });
    return result.deletedCount;
  },

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }> {
    const match = userId ? { userId } : {};
    
    const stats = await this.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { 
            $sum: { 
              $cond: [
                { $and: ['$isActive', { $not: '$revoked' }, { $gt: ['$expiresAt', new Date()] }] }, 
                1, 
                0
              ] 
            } 
          },
          expired: { 
            $sum: { 
              $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] 
            } 
          },
          revoked: { 
            $sum: { 
              $cond: ['$revoked', 1, 0] 
            } 
          }
        }
      }
    ]);

    return stats[0] || { total: 0, active: 0, expired: 0, revoked: 0 };
  },

  /**
   * Find sessions by security risk level
   */
  async findBySecurityRisk(riskLevel: 'low' | 'medium' | 'high'): Promise<ISessionDocument[]> {
    const thresholds = { low: 40, medium: 70, high: 100 };
    const threshold = thresholds[riskLevel];
    
    let query: any = { isActive: true, revoked: false };
    
    if (riskLevel === 'low') {
      query['securityContext.riskScore'] = { $lt: threshold };
    } else if (riskLevel === 'medium') {
      query['securityContext.riskScore'] = { $gte: 40, $lt: threshold };
    } else {
      query['securityContext.riskScore'] = { $gte: threshold };
    }
    
    return this.find(query);
  },

  /**
   * Update session security context
   */
  async updateSecurityContext(
    sessionId: string, 
    securityContext: Partial<SecurityContext>
  ): Promise<ISessionDocument | null> {
    return this.findOneAndUpdate(
      { sessionId },
      { 
        $set: { 
          'securityContext': { ...securityContext },
          lastAccessedAt: new Date()
        }
      },
      { new: true }
    );
  }
};

/**
 * Pre-save middleware
 */
sessionSchema.pre('save', function(next) {
  // Update lastAccessedAt on every save (except new documents)
  if (this.isModified() && !this.isNew) {
    this['lastAccessedAt'] = new Date();
  }
  next();
});

/**
 * Create and export the model
 */
export const Session = mongoose.model<ISessionDocument>('Session', sessionSchema);

export default Session;
