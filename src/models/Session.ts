import mongoose from 'mongoose';
import type { Document, Model, Schema } from 'mongoose';

// Device information interface
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  timezone: string;
  language: string;
}

// Location information interface
export interface LocationInfo {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

// Security context interface
export interface SecurityContext {
  fingerprint: string;
  riskScore: number; // 0-100, higher = more risky
  isNewDevice: boolean;
  isNewLocation: boolean;
  suspiciousActivity: boolean;
  lastSecurityCheck: Date;
  securityFlags: string[];
}

// Session type enum
export type SessionType = 'web' | 'mobile' | 'api';

// Main Session interface
export interface ISession extends Document {
  sessionId: string; // UUID v4
  userId: mongoose.Types.ObjectId;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location?: LocationInfo;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: mongoose.Types.ObjectId;
  revokedReason?: string;
  securityContext: SecurityContext;
  refreshToken: string; // Hashed refresh token
  sessionType: SessionType;
  concurrentSessions: number;
  isPrimary: boolean; // Primary session for the user
  
  // Instance methods
  isExpired(): boolean;
  isRevoked(): boolean;
  isValid(): boolean;
  updateLastAccessed(): Promise<ISession>;
  revokeSession(revokedBy?: mongoose.Types.ObjectId, reason?: string): Promise<ISession>;
  extendSession(additionalHours?: number): Promise<ISession>;
  getSecurityRisk(): 'low' | 'medium' | 'high';
  getSessionAge(): number; // in minutes
  getRemainingTime(): number; // in minutes
}

// Session schema
const SessionSchema = new mongoose.Schema<ISession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
    type: mongoose.Schema.Types.ObjectId,
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
  refreshToken: {
    type: String,
    required: true,
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
const createPerformanceIndexes = async () => {
  try {
    if (Session.collection) {
      // Primary performance indexes
      await Session.collection.createIndex({ userId: 1, isActive: 1, expiresAt: 1 }, { name: 'user_active_sessions' });
      await Session.collection.createIndex({ sessionId: 1, isActive: 1 }, { name: 'session_lookup' });
      await Session.collection.createIndex({ expiresAt: 1 }, { name: 'expired_sessions' });
      await Session.collection.createIndex({ lastAccessedAt: 1 }, { name: 'session_activity' });
      
      // Security and analytics indexes
      await Session.collection.createIndex({ ipAddress: 1, createdAt: 1 }, { name: 'ip_analytics' });
      await Session.collection.createIndex({ 'securityContext.riskScore': 1, createdAt: 1 }, { name: 'security_analytics' });
      await Session.collection.createIndex({ sessionType: 1, isActive: 1 }, { name: 'session_type_analytics' });
      await Session.collection.createIndex({ 'deviceInfo.deviceType': 1, isActive: 1 }, { name: 'device_analytics' });
      
      // Compound indexes for complex queries
      await Session.collection.createIndex({ userId: 1, sessionType: 1, isActive: 1 }, { name: 'user_session_type' });
      await Session.collection.createIndex({ createdAt: 1, isActive: 1, revoked: 1 }, { name: 'session_cleanup' });
      await Session.collection.createIndex({ 'securityContext.riskScore': 1, isActive: 1, lastAccessedAt: 1 }, { name: 'security_monitoring' });
      
      console.log('📊 Performance indexes created successfully');
    }
  } catch (error) {
    console.log('📊 Index creation will be handled by MongoDB on first use');
  }
};

// Instance methods
SessionSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

SessionSchema.methods.isRevoked = function(): boolean {
  return this.revoked;
};

SessionSchema.methods.isValid = function(): boolean {
  return this.isActive && !this.revoked && !this.isExpired();
};

SessionSchema.methods.updateLastAccessed = async function(): Promise<ISession> {
  this.lastAccessedAt = new Date();
  return this.save();
};

SessionSchema.methods.revokeSession = async function(
  revokedBy?: mongoose.Types.ObjectId, 
  reason?: string
): Promise<ISession> {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  this.isActive = false;
  return this.save();
};

SessionSchema.methods.extendSession = async function(additionalHours: number = 24): Promise<ISession> {
  this.expiresAt = new Date(Date.now() + (additionalHours * 60 * 60 * 1000));
  return this.save();
};

SessionSchema.methods.getSecurityRisk = function(): 'low' | 'medium' | 'high' {
  if (this.securityContext.riskScore >= 70) return 'high';
  if (this.securityContext.riskScore >= 40) return 'medium';
  return 'low';
};

SessionSchema.methods.getSessionAge = function(): number {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
};

SessionSchema.methods.getRemainingTime = function(): number {
  return Math.floor((this.expiresAt.getTime() - Date.now()) / (1000 * 60));
};

// Static methods
SessionSchema.statics.findActiveSessions = function(userId: string) {
  return this.find({ 
    userId, 
    isActive: true, 
    revoked: false, 
    expiresAt: { $gt: new Date() } 
  });
};

SessionSchema.statics.findBySessionId = function(sessionId: string) {
  return this.findOne({ sessionId, isActive: true, revoked: false });
};

SessionSchema.statics.revokeAllUserSessions = function(userId: string, revokedBy?: mongoose.Types.ObjectId) {
  return this.updateMany(
    { userId, isActive: true },
    { 
      revoked: true, 
      revokedAt: new Date(), 
      revokedBy,
      revokedReason: 'User logout or admin action'
    }
  );
};

SessionSchema.statics.cleanupExpiredSessions = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
  });
};

SessionSchema.statics.getSessionStats = function(userId?: string) {
  const match = userId ? { userId } : {};
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: { $sum: { $cond: [{ $and: ['$isActive', { $not: '$revoked' }] }, 1, 0] } },
        expiredSessions: { $sum: { $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] } },
        revokedSessions: { $sum: { $cond: ['$revoked', 1, 0] } }
      }
    }
  ]);
};

// Pre-save middleware
SessionSchema.pre('save', function(next) {
  // Update lastAccessedAt on every save
  if (this.isModified() && !this.isNew) {
    this.lastAccessedAt = new Date();
  }
  next();
});

// Create or get the Session model with defensive checks
let Session: Model<ISession>;

try {
  // Check if mongoose.models exists and has Session
  if (mongoose.models && mongoose.models.Session) {
    Session = mongoose.models.Session as Model<ISession>;
    console.log('📋 Models: Using existing Session model');
  } else {
    Session = mongoose.model<ISession>('Session', SessionSchema);
    console.log('📋 Models: Session model created successfully');
  }
} catch (error) {
  // Fallback: always create new model
  console.log('📋 Models: Fallback - creating new Session model');
  Session = mongoose.model<ISession>('Session', SessionSchema);
}

// Create performance indexes after a short delay to avoid blocking
setTimeout(createPerformanceIndexes, 100);

export default Session;
