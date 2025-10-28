import mongoose, { Schema, Document } from 'mongoose';
import { hashIpAddress, cleanExpiredLoginHistory } from '../lib/auth/utils/privacy';
import { UserRole, Permission } from '../types/auth/permissions.types';
import { UserStatus } from '../types/auth/user.types';
import { ILoginHistory, IDocumentReference } from '../types/auth/security.types';

// Define the interface for User document
export interface IUser extends Document {
  userType: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: mongoose.Types.ObjectId;
  hospital?: mongoose.Types.ObjectId;
  documents?: IDocumentReference[];
  
  // Admin-specific fields
  permissions?: Permission[];
  
  // Security & Activity tracking
  loginHistory?: ILoginHistory[];
  accountLockedUntil?: Date;
  
  // Approval system fields
  status: UserStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  isAdmin(): boolean;
  recordLogin(ipAddress: string, userAgent: string, success?: boolean): Promise<IUser>;
  isAccountLocked(): boolean;
  getRecentFailedAttempts(minutes: number): number;
  getLastLogin(): Date | null;
  getLastLoginIp(): string | null;
  getSanitizedLoginHistory(): any[];
}

// Base user schema
const UserSchema = new Schema<IUser>({
  userType: { 
    type: String, 
    required: true,
    enum: Object.values(UserRole),
    index: true
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  // Manager specific fields
  post: { 
    type: String,
    required: function(this: IUser) { return this.userType === UserRole.MANAGER; },
    trim: true
  },
  ciusss: {
    type: Schema.Types.ObjectId,
    ref: 'CIUSSS',
    required: function(this: IUser) { return this.userType === UserRole.MANAGER; },
    validate: {
      validator: function(v: any) {
        if (!v) return true;
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'CIUSSS must be a valid ObjectId reference'
    }
  },
  hospital: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function(this: IUser) { return this.userType === UserRole.MANAGER; },
    validate: {
      validator: function(v: any) {
        if (!v) return true;
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Hospital must be a valid ObjectId reference'
    }
  },
  
  // Admin-specific fields
  permissions: [{
    type: String,
    enum: Object.values(Permission)
  }],
  
  // Security & Activity tracking
  loginHistory: [{
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    success: {
      type: Boolean,
      required: true,
      default: true
    },
    location: {
      type: String
    }
  }],
  accountLockedUntil: {
    type: Date
  },
  
  // Employee specific fields - documents array
  documents: [{
    fileId: {
      type: String,
      required: true
    },
    documentType: {
      type: String,
      required: true,
      enum: ['cv', 'opiqPermit', 'rcr']
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    checksum: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Approval system fields
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING,
    index: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  suspendedBy: {
    type: String,
    trim: true
  },
  suspendedAt: {
    type: Date
  },
  suspensionReason: {
    type: String,
    trim: true
  },
  
  // Password reset fields
  resetPasswordToken: {
    type: String,
    trim: true
  },
  resetPasswordExpires: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Add validation and pre-save hooks
UserSchema.pre('save', function(next) {
  // Validate employees have required documents
  if (this.userType === UserRole.EMPLOYEE && this.status === UserStatus.APPROVED) {
    const hasCv = this.documents?.some(doc => doc.documentType === 'cv');
    const hasOpiqPermit = this.documents?.some(doc => doc.documentType === 'opiqPermit');
    const hasRcr = this.documents?.some(doc => doc.documentType === 'rcr');
    
    if (!hasCv || !hasOpiqPermit || !hasRcr) {
      return next(new Error('Employee must have CV, OPIQ permit, and RCR documents'));
    }
  }
  
  // Auto-approve admins (they don't need approval)
  if ((this.userType === UserRole.ADMIN || this.userType === UserRole.SUPER_ADMIN) && this.isNew) {
    this.status = UserStatus.APPROVED;
    this.approvedAt = new Date();
  }
  
  // Limit login history to last 50 entries
  if (this.loginHistory && this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }
  
  next();
});

// Add indexes for faster queries
UserSchema.index({ 'documents.fileId': 1 });
UserSchema.index({ userType: 1, status: 1 });

// Instance methods
UserSchema.methods.hasPermission = function(this: IUser, permission: Permission): boolean {
  // Super admins have all permissions
  if (this.userType === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // Check if user has the specific permission
  return this.permissions?.includes(permission) || false;
};

UserSchema.methods.hasAnyPermission = function(this: IUser, permissions: Permission[]): boolean {
  if (this.userType === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  return permissions.some(permission => this.permissions?.includes(permission));
};

UserSchema.methods.isAdmin = function(this: IUser): boolean {
  return this.userType === UserRole.ADMIN || this.userType === UserRole.SUPER_ADMIN;
};

UserSchema.methods.recordLogin = function(this: IUser, ipAddress: string, userAgent: string, success: boolean = true) {
  if (!this.loginHistory) {
    this.loginHistory = [];
  }
  
  // Clean expired entries before adding new one
  const retentionDays = 90;
  this.loginHistory = cleanExpiredLoginHistory(this.loginHistory, retentionDays);
  
  // Hash IP address for privacy protection
  const hashedIp = hashIpAddress(ipAddress);
  
  // Add new login entry
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress: hashedIp,
    userAgent,
    success
  });
  
  // Prepare update object
  const updateData: any = {
    loginHistory: this.loginHistory,
    updatedAt: new Date()
  };
  
  if (success) {
    // Clear lockout on successful login
    updateData.accountLockedUntil = undefined;
  } else {
    // Check if account should be locked (5 failed attempts in last 15 minutes)
    const recentFailures = this.getRecentFailedAttempts(15); // 15 minutes
    if (recentFailures >= 4) { // 4 previous + this one = 5 total
      updateData.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
  }
  
  // Use updateOne to avoid triggering full document validation
  const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
  return UserModel.updateOne(
    { _id: this._id },
    { $set: updateData }
  );
};

UserSchema.methods.isAccountLocked = function(this: IUser): boolean {
  if (!this.accountLockedUntil) {
    return false;
  }
  
  return new Date() < this.accountLockedUntil;
};

// Helper method to get recent failed attempts
UserSchema.methods.getRecentFailedAttempts = function(this: IUser, minutes: number = 15): number {
  if (!this.loginHistory) return 0;
  
  const cutoffTime = new Date(Date.now() - (minutes * 60 * 1000));
  return this.loginHistory.filter((entry: any) => 
    !entry.success && entry.timestamp >= cutoffTime
  ).length;
};

// Helper method to get last successful login
UserSchema.methods.getLastLogin = function(this: IUser): Date | null {
  if (!this.loginHistory) return null;
  
  const successfulLogins = this.loginHistory
    .filter((entry: any) => entry.success)
    .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return successfulLogins.length > 0 ? successfulLogins[0].timestamp : null;
};

// Helper method to get last login IP
UserSchema.methods.getLastLoginIp = function(this: IUser): string | null {
  if (!this.loginHistory) return null;
  
  const successfulLogins = this.loginHistory
    .filter((entry: any) => entry.success)
    .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
  
  return successfulLogins.length > 0 ? successfulLogins[0].ipAddress : null;
};

// Method to get sanitized login history for admin display
UserSchema.methods.getSanitizedLoginHistory = function(this: IUser): any[] {
  return this.loginHistory?.map((entry: any) => ({
    timestamp: entry.timestamp,
    success: entry.success,
    ipAddress: entry.ipAddress, // This is already hashed
    userAgent: entry.userAgent
  })) || [];
};

// Create the User model with proper method attachment
let User: mongoose.Model<IUser>;

// Force recompilation to ensure methods are attached
if (mongoose.models.User) {
  delete mongoose.models.User;
}

User = mongoose.model<IUser>('User', UserSchema);

export default User;
