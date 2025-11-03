import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Phone Verification Interface
 * Stores temporary verification codes for phone number verification during signup
 */
export interface IPhoneVerification extends Document {
  phone: string; // Phone number (E.164 format)
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
  incrementAttempt(): Promise<IPhoneVerification>;
  markAsVerified(): Promise<IPhoneVerification>;
}

/**
 * Phone Verification Model Interface with static methods
 */
export interface IPhoneVerificationModel extends Model<IPhoneVerification> {
  findActiveVerification(phone: string): Promise<IPhoneVerification | null>;
  findVerifiedPhone(phone: string, withinMinutes?: number): Promise<IPhoneVerification | null>;
  countRecentCodes(phone: string, withinMinutes?: number): Promise<number>;
  cleanupExpired(): Promise<{ deletedCount?: number }>;
}

// Phone Verification Schema
const PhoneVerificationSchema = new Schema<IPhoneVerification>({
  phone: {
    type: String,
    required: true,
    trim: true,
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
  collection: 'phone_verifications'
});

// Indexes for performance
PhoneVerificationSchema.index({ phone: 1, verified: 1, expiresAt: 1 });
PhoneVerificationSchema.index({ phone: 1, createdAt: -1 }); // For rate limiting queries
PhoneVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 }); // TTL index (1 hour)

// Instance methods
PhoneVerificationSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

PhoneVerificationSchema.methods.isValid = function(): boolean {
  return !this.verified && !this.isExpired() && this.attemptCount < this.maxAttempts;
};

PhoneVerificationSchema.methods.incrementAttempt = async function(): Promise<IPhoneVerification> {
  this.attemptCount += 1;
  return this.save();
};

PhoneVerificationSchema.methods.markAsVerified = async function(): Promise<IPhoneVerification> {
  this.verified = true;
  this.verifiedAt = new Date();
  return this.save();
};

// Static methods
PhoneVerificationSchema.statics.findActiveVerification = function(phone: string) {
  return this.findOne({
    phone,
    verified: false,
    expiresAt: { $gt: new Date() },
    attemptCount: { $lt: 5 }
  }).sort({ createdAt: -1 }); // Get most recent active verification
};

PhoneVerificationSchema.statics.findVerifiedPhone = function(phone: string, withinMinutes: number = 10) {
  const cutoffTime = new Date(Date.now() - (withinMinutes * 60 * 1000));
  return this.findOne({
    phone,
    verified: true,
    verifiedAt: { $gte: cutoffTime }
  }).sort({ verifiedAt: -1 });
};

PhoneVerificationSchema.statics.countRecentCodes = function(phone: string, withinMinutes: number = 60) {
  const cutoffTime = new Date(Date.now() - (withinMinutes * 60 * 1000));
  return this.countDocuments({
    phone,
    createdAt: { $gte: cutoffTime }
  });
};

PhoneVerificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { verified: true, verifiedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete verified codes older than 24 hours
    ]
  });
};

// Create or get the PhoneVerification model
let PhoneVerification: IPhoneVerificationModel;

if (mongoose.models.PhoneVerification) {
  PhoneVerification = mongoose.models.PhoneVerification as IPhoneVerificationModel;
} else {
  PhoneVerification = mongoose.model<IPhoneVerification, IPhoneVerificationModel>('PhoneVerification', PhoneVerificationSchema);
}

export default PhoneVerification;

