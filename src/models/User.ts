import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for document references
export interface IDocumentReference {
  fileId: string; // GridFS file ID
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

// Define user roles
export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

// Define permissions enum
export enum Permission {
  // User management
  VIEW_ALL_USERS = 'view_all_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  APPROVE_USERS = 'approve_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Transfer management
  VIEW_ALL_TRANSFERS = 'view_all_transfers',
  CANCEL_ANY_TRANSFER = 'cancel_any_transfer',
  EDIT_ANY_TRANSFER = 'edit_any_transfer',
  FORCE_COMPLETE_TRANSFER = 'force_complete_transfer',
  REASSIGN_TRANSFERS = 'reassign_transfers',
  
  // System management
  VIEW_SYSTEM_METRICS = 'view_system_metrics',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  ACCESS_AUDIT_LOGS = 'access_audit_logs',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  VIEW_ERROR_LOGS = 'view_error_logs',
  
  // Data management
  EXPORT_DATA = 'export_data',
  DELETE_DATA = 'delete_data',
  BACKUP_DATABASE = 'backup_database',
  
  // Super admin only
  MANAGE_ADMINS = 'manage_admins',
  ACCESS_SYSTEM_LOGS = 'access_system_logs',
  EXECUTE_QUERIES = 'execute_queries',
}

// Login history interface
export interface ILoginHistory {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  location?: string;
}

// Define the interface for User document
export interface IUser extends Document {
  userType: 'employee' | 'manager' | 'admin' | 'super_admin';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: mongoose.Types.ObjectId;
  hospital?: mongoose.Types.ObjectId;
  documents?: IDocumentReference[]; // Array of document references
  
  // Admin-specific fields
  permissions?: Permission[]; // Granular permissions for admins
  isSuperAdmin?: boolean; // Flag for super admin
  
  // Security & Activity tracking
  lastLogin?: Date;
  lastLoginIp?: string;
  loginHistory?: ILoginHistory[];
  failedLoginAttempts?: number;
  accountLockedUntil?: Date;
  
  // Approval system fields
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: string; // Admin email who approved/rejected
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string; // Admin who suspended the account
  suspendedAt?: Date;
  suspensionReason?: string;
  
  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastPasswordChange?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  isAdmin(): boolean;
  recordLogin(ipAddress: string, userAgent: string, success?: boolean): Promise<IUser>;
  isAccountLocked(): boolean;
}

// Base user schema
const UserSchema = new Schema<IUser>({
  userType: { 
    type: String, 
    required: true,
    enum: ['employee', 'manager', 'admin', 'super_admin'],
    index: true // Index for faster userType-based queries
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
    required: function(this: IUser) { return this.userType === 'manager'; },
    trim: true
  },
  ciusss: {
    type: Schema.Types.ObjectId,
    ref: 'CIUSSS',
    required: function(this: IUser) { return this.userType === 'manager'; }
  },
  hospital: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function(this: IUser) { return this.userType === 'manager'; }
  },
  
  // Admin-specific fields
  permissions: [{
    type: String,
    enum: Object.values(Permission)
  }],
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  
  // Security & Activity tracking
  lastLogin: {
    type: Date
  },
  lastLoginIp: {
    type: String,
    trim: true
  },
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
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
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
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
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
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // This will automatically add createdAt and updatedAt fields
  versionKey: false // This will remove the __v field
});

// Add validation and pre-save hooks
UserSchema.pre('save', function(next) {
  // No need to sync userType and role since role field is removed
  
  // Validate employees have required documents
  if (this.userType === 'employee' && this.status === 'approved') {
    const hasCv = this.documents?.some(doc => doc.documentType === 'cv');
    const hasOpiqPermit = this.documents?.some(doc => doc.documentType === 'opiqPermit');
    const hasRcr = this.documents?.some(doc => doc.documentType === 'rcr');
    
    if (!hasCv || !hasOpiqPermit || !hasRcr) {
      return next(new Error('Employee must have CV, OPIQ permit, and RCR documents'));
    }
  }
  
  // Auto-approve admins (they don't need approval)
  if ((this.userType === 'admin' || this.userType === 'super_admin') && this.isNew) {
    this.status = 'approved';
    this.approvedAt = new Date();
  }
  
  // Limit login history to last 50 entries
  if (this.loginHistory && this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }
  
  next();
});

// Remove old field validations that are no longer needed
UserSchema.pre('validate', function(next) {
  // Remove validation errors for old fields that no longer exist
  if (this.userType === 'employee') {
    delete (this as any).opiqPermit;
    delete (this as any).rcr;
  }
  next();
});

// Add indexes for faster queries
// Note: email index is already created by unique: true, so we don't need to add it again
UserSchema.index({ 'documents.fileId': 1 });
UserSchema.index({ userType: 1, status: 1 });
UserSchema.index({ lastLogin: -1 });

// Instance methods
UserSchema.methods.hasPermission = function(permission: Permission): boolean {
  // Super admins have all permissions
  if (this.isSuperAdmin) {
    return true;
  }
  
  // Check if user has the specific permission
  return this.permissions?.includes(permission) || false;
};

UserSchema.methods.hasAnyPermission = function(permissions: Permission[]): boolean {
  if (this.isSuperAdmin) {
    return true;
  }
  
  return permissions.some(permission => this.permissions?.includes(permission));
};

UserSchema.methods.isAdmin = function(): boolean {
  return this.userType === 'admin' || this.userType === 'super_admin';
};

UserSchema.methods.recordLogin = function(ipAddress: string, userAgent: string, success: boolean = true) {
  if (!this.loginHistory) {
    this.loginHistory = [];
  }
  
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
    success
  });
  
  if (success) {
    this.lastLogin = new Date();
    this.lastLoginIp = ipAddress;
    this.failedLoginAttempts = 0;
    this.accountLockedUntil = undefined;
  } else {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
    
    // Lock account after 5 failed attempts for 15 minutes
    if (this.failedLoginAttempts >= 5) {
      this.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
  
  return this.save();
};

UserSchema.methods.isAccountLocked = function(): boolean {
  if (!this.accountLockedUntil) {
    return false;
  }
  
  return new Date() < this.accountLockedUntil;
};

// Create or get the User model with defensive checks
let User: Model<IUser>;

try {
  // Check if mongoose.models exists and has User
  if (mongoose.models && mongoose.models.User) {
    User = mongoose.models.User as Model<IUser>;
    console.log('📋 Models: Using existing User model');
  } else {
    User = mongoose.model<IUser>('User', UserSchema);
    console.log('📋 Models: User model created successfully');
  }
} catch (error) {
  // Fallback: always create new model
  console.log('📋 Models: Fallback - creating new User model');
  User = mongoose.model<IUser>('User', UserSchema);
}

export default User;