import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Email Verification Interface
 * Stores temporary verification codes for email verification during signup
 */
export interface IEmailVerification extends Document {
  email: string; // Email address
  codeHash: string; // Hashed verification code (bcrypt)
  expiresAt: Date; // Code expiration time (5 minutes)
  verified: boolean; // Whether this code has been successfully verified
  verifiedAt?: Date; // Timestamp when code was verified
  attemptCount: number; // Number of verification attempts
  maxAttempts: number; // Maximum allowed attempts (default: 5)
  userId?: mongoose.Types.ObjectId; // Optional: link to user after account creation
  ipAddress?: string; // IP address where code was requested
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isExpired(): boolean;
  isValid(): boolean;
  incrementAttempt(): Promise<IEmailVerification>;
  markAsVerified(): Promise<IEmailVerification>;
}

/**
 * Email Verification Model Interface with static methods
 */
export interface IEmailVerificationModel extends Model<IEmailVerification> {
  findActiveVerification(email: string): Promise<IEmailVerification | null>;
  findVerifiedEmail(email: string, withinMinutes?: number): Promise<IEmailVerification | null>;
  countRecentCodes(email: string, withinMinutes?: number): Promise<number>;
  cleanupExpired(): Promise<{ deletedCount?: number }>;
}

// Email Verification Schema
const EmailVerificationSchema = new Schema<IEmailVerification>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  codeHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
    // Index created separately below to avoid duplicate
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  verifiedAt: {
    type: Date
  },
  attemptCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  ipAddress: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'email_verifications'
});

// Indexes for performance
EmailVerificationSchema.index({ email: 1, verified: 1, expiresAt: 1 });
EmailVerificationSchema.index({ email: 1, createdAt: -1 }); // For rate limiting queries
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }); // TTL index (1 hour)

// Instance methods
EmailVerificationSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

EmailVerificationSchema.methods.isValid = function(): boolean {
  return !this.verified && !this.isExpired() && this.attemptCount < this.maxAttempts;
};

EmailVerificationSchema.methods.incrementAttempt = async function(): Promise<IEmailVerification> {
  this.attemptCount += 1;
  return this.save();
};

EmailVerificationSchema.methods.markAsVerified = async function(): Promise<IEmailVerification> {
  this.verified = true;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
EmailVerificationSchema.statics.findActiveVerification = function(email: string) {
  return this.findOne({
    email: email.toLowerCase(),
    verified: false,
    expiresAt: { $gt: new Date() },
    attemptCount: { $lt: 5 }
  }).sort({ createdAt: -1 }); // Get most recent active verification
};

EmailVerificationSchema.statics.findVerifiedEmail = function(email: string, withinMinutes: number = 10) {
  const cutoffTime = new Date(Date.now() - (withinMinutes * 60 * 1000));
  return this.findOne({
    email: email.toLowerCase(),
    verified: true,
    verifiedAt: { $gte: cutoffTime }
  }).sort({ verifiedAt: -1 });
};

EmailVerificationSchema.statics.countRecentCodes = function(email: string, withinMinutes: number = 60) {
  const cutoffTime = new Date(Date.now() - (withinMinutes * 60 * 1000));
  return this.countDocuments({
    email: email.toLowerCase(),
    createdAt: { $gte: cutoffTime }
  });
};

EmailVerificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { verified: true, verifiedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete verified codes older than 24 hours
    ]
  });
};

// Create or get the EmailVerification model
let EmailVerification: IEmailVerificationModel;

if (mongoose.models.EmailVerification) {
  EmailVerification = mongoose.models.EmailVerification as IEmailVerificationModel;
} else {
  EmailVerification = mongoose.model<IEmailVerification, IEmailVerificationModel>('EmailVerification', EmailVerificationSchema);
}

export default EmailVerification;

