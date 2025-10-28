/**
 * RefreshToken Model
 * 
 * Mongoose model for refresh token storage with security features.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { RefreshTokenRecord } from '../types/auth';

/**
 * RefreshToken Document Interface
 */
export interface IRefreshToken extends Omit<RefreshTokenRecord, '_id'>, Document {}

/**
 * RefreshToken Schema
 */
const refreshTokenSchema = new Schema({
  tokenId: { 
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
  sessionId: { 
    type: String, 
    required: true, 
    index: true 
  },
  tokenFamily: { 
    type: String, 
    required: true, 
    index: true 
  },
  tokenHash: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsedAt: { 
    type: Date 
  },
  isRevoked: { 
    type: Boolean, 
    default: false, 
    index: true 
  },
  revokedAt: { 
    type: Date 
  },
  revokedReason: { 
    type: String 
  },
  deviceFingerprint: { 
    type: String, 
    required: true 
  },
  ipAddress: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true,
  collection: 'refreshtokens'
});

// Indexes for performance and cleanup queries
refreshTokenSchema.index({ expiresAt: 1, isRevoked: 1 });
refreshTokenSchema.index({ tokenFamily: 1, createdAt: 1 });
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ sessionId: 1, isRevoked: 1 });
refreshTokenSchema.index({ createdAt: 1 });

// Compound indexes for common queries
refreshTokenSchema.index({ userId: 1, tokenFamily: 1 });
refreshTokenSchema.index({ sessionId: 1, tokenFamily: 1 });

// TTL index for automatic cleanup of expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Pre-save middleware
 */
refreshTokenSchema.pre('save', function(next) {
  // Ensure tokenId is unique
  if (this.isNew && !this['tokenId']) {
    this['tokenId'] = this._id.toString();
  }
  next();
});

/**
 * Static methods
 */
refreshTokenSchema.statics = {
  /**
   * Find active refresh token by token family
   */
  async findActiveByFamily(tokenFamily: string): Promise<IRefreshToken | null> {
    return this.findOne({
      tokenFamily,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });
  },

  /**
   * Find all tokens in a family
   */
  async findByFamily(tokenFamily: string): Promise<IRefreshToken[]> {
    return this.find({ tokenFamily }).sort({ createdAt: -1 });
  },

  /**
   * Revoke all tokens in a family
   */
  async revokeFamily(tokenFamily: string, reason: string = 'family_revoked'): Promise<number> {
    const result = await this.updateMany(
      { tokenFamily, isRevoked: false },
      { 
        isRevoked: true, 
        revokedAt: new Date(),
        revokedReason: reason 
      }
    );
    return result.modifiedCount;
  },

  /**
   * Revoke all tokens for a user
   */
  async revokeAllForUser(userId: string, reason: string = 'user_logout'): Promise<number> {
    const result = await this.updateMany(
      { userId, isRevoked: false },
      { 
        isRevoked: true, 
        revokedAt: new Date(),
        revokedReason: reason 
      }
    );
    return result.modifiedCount;
  },

  /**
   * Cleanup expired tokens
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
  },

  /**
   * Cleanup revoked tokens older than specified days
   */
  async cleanupRevoked(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await this.deleteMany({
      isRevoked: true,
      revokedAt: { $lt: cutoffDate }
    });
    return result.deletedCount;
  },

  /**
   * Get token statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    families: number;
  }> {
    const now = new Date();
    
    const [total, active, revoked, expired, families] = await Promise.all([
      this.countDocuments(),
      this.countDocuments({ isRevoked: false, expiresAt: { $gt: now } }),
      this.countDocuments({ isRevoked: true }),
      this.countDocuments({ expiresAt: { $lt: now } }),
      this.distinct('tokenFamily').then((families: any[]) => families.length)
    ]);

    return { total, active, revoked, expired, families };
  }
};

/**
 * Instance methods
 */
refreshTokenSchema.methods = {
  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return this['expiresAt'] < new Date();
  },

  /**
   * Check if token is active (not revoked and not expired)
   */
  isActive(): boolean {
    return !this['isRevoked'] && !this['isExpired']();
  },

  /**
   * Revoke token
   */
  async revoke(reason: string = 'manual_revoke'): Promise<void> {
    this['isRevoked'] = true;
    this['revokedAt'] = new Date();
    this['revokedReason'] = reason;
    await this['save']();
  },

  /**
   * Update last used timestamp
   */
  async updateLastUsed(): Promise<void> {
    this['lastUsedAt'] = new Date();
    await this['save']();
  }
};

/**
 * Create and export the model
 */
export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

export default RefreshToken;
