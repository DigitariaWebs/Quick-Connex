import mongoose, { Schema, Document, Model } from "mongoose";
// Import referenced models to ensure they're registered before this model references them
import { CIUSSS } from "./CIUSSS";
import Hospital from "./Hospital";

// Define the interface for document references
export interface IDocumentReference {
  fileId: string; // GridFS file ID
  documentType: "cv" | "opiqPermit" | "rcr";
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

// Define user roles
export type UserRole = "employee" | "manager" | "admin" | "super_admin";

// Define permissions enum
export enum Permission {
  // User management
  VIEW_ALL_USERS = "view_all_users",
  EDIT_USERS = "edit_users",
  DELETE_USERS = "delete_users",
  APPROVE_USERS = "approve_users",
  SUSPEND_USERS = "suspend_users",

  // Transfer management
  VIEW_ALL_TRANSFERS = "view_all_transfers",
  CANCEL_ANY_TRANSFER = "cancel_any_transfer",
  EDIT_ANY_TRANSFER = "edit_any_transfer",
  FORCE_COMPLETE_TRANSFER = "force_complete_transfer",
  REASSIGN_TRANSFERS = "reassign_transfers",

  // System management
  VIEW_SYSTEM_METRICS = "view_system_metrics",
  MANAGE_SYSTEM_SETTINGS = "manage_system_settings",
  ACCESS_AUDIT_LOGS = "access_audit_logs",
  MANAGE_NOTIFICATIONS = "manage_notifications",
  VIEW_ERROR_LOGS = "view_error_logs",

  // Data management
  EXPORT_DATA = "export_data",
  DELETE_DATA = "delete_data",
  BACKUP_DATABASE = "backup_database",

  // Super admin only
  MANAGE_ADMINS = "manage_admins",
  ACCESS_SYSTEM_LOGS = "access_system_logs",
  EXECUTE_QUERIES = "execute_queries",
}

// Define the interface for User document
export interface IUser extends Document {
  userType: "employee" | "manager" | "admin" | "super_admin";
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

  // Security & Activity tracking
  accountLockedUntil?: Date;

  // Push notification subscription
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    subscribedAt: Date;
    isActive: boolean;
  };

  // Approval system fields
  status: "pending" | "approved" | "rejected" | "suspended";
  approvedBy?: string; // Admin email who approved/rejected
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: string; // Admin who suspended the account
  suspendedAt?: Date;
  suspensionReason?: string;

  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  // Phone verification fields
  phoneVerified?: boolean;
  phoneVerifiedAt?: Date;

  // Email verification fields
  emailVerified?: boolean;
  emailVerifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  hasPermission(permission: Permission): boolean;
  hasAnyPermission(permissions: Permission[]): boolean;
  isAdmin(): boolean;
  isAccountLocked(): boolean;
}

// Base user schema
const UserSchema = new Schema<IUser>(
  {
    userType: {
      type: String,
      required: true,
      enum: ["employee", "manager", "admin", "super_admin"],
      index: true, // Index for faster userType-based queries
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Manager specific fields
    post: {
      type: String,
      required: function (this: IUser) {
        return this.userType === "manager";
      },
      trim: true,
    },
    ciusss: {
      type: Schema.Types.ObjectId,
      ref: "CIUSSS",
      required: function (this: IUser) {
        return this.userType === "manager";
      },
      validate: {
        validator: function (v: any) {
          // Allow null/undefined for non-managers
          if (!v) return true;
          // Ensure it's a valid ObjectId
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "CIUSSS must be a valid ObjectId reference",
      },
    },
    hospital: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: function (this: IUser) {
        return this.userType === "manager";
      },
      validate: {
        validator: function (v: any) {
          // Allow null/undefined for non-managers
          if (!v) return true;
          // Ensure it's a valid ObjectId
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Hospital must be a valid ObjectId reference",
      },
    },

    // Admin-specific fields
    permissions: [
      {
        type: String,
        enum: Object.values(Permission),
      },
    ],

    // Security & Activity tracking
    accountLockedUntil: {
      type: Date,
    },

    // Data retention settings removed - not in interface
    // Employee specific fields - documents array
    documents: [
      {
        fileId: {
          type: String,
          required: true,
        },
        documentType: {
          type: String,
          required: true,
          enum: ["cv", "opiqPermit", "rcr"],
        },
        originalName: {
          type: String,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        checksum: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Approval system fields
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    approvedBy: {
      type: String,
      trim: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    suspendedBy: {
      type: String,
      trim: true,
    },
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
      type: String,
      trim: true,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      trim: true,
    },
    resetPasswordExpires: {
      type: Date,
    },

    // Phone verification fields
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    phoneVerifiedAt: {
      type: Date,
    },

    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerifiedAt: {
      type: Date,
    },

    // Push notification subscription
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
      subscribedAt: {
        type: Date,
        default: Date.now,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true, // This will automatically add createdAt and updatedAt fields
    versionKey: false, // This will remove the __v field
  },
);

// Add validation and pre-save hooks
UserSchema.pre("save", function (next) {
  // No need to sync userType and role since role field is removed

  // Validate employees have required documents
  if (this.userType === "employee" && this.status === "approved") {
    const hasCv = this.documents?.some((doc) => doc.documentType === "cv");
    const hasOpiqPermit = this.documents?.some(
      (doc) => doc.documentType === "opiqPermit",
    );
    const hasRcr = this.documents?.some((doc) => doc.documentType === "rcr");

    if (!hasCv || !hasOpiqPermit || !hasRcr) {
      return next(
        new Error("Employee must have CV, OPIQ permit, and RCR documents"),
      );
    }
  }

  // Auto-approve admins (they don't need approval)
  if (
    (this.userType === "admin" || this.userType === "super_admin") &&
    this.isNew
  ) {
    this.status = "approved";
    this.approvedAt = new Date();
  }

  next();
});

// Remove old field validations that are no longer needed
UserSchema.pre("validate", function (next) {
  // Remove validation errors for old fields that no longer exist
  if (this.userType === "employee") {
    delete (this as any).opiqPermit;
    delete (this as any).rcr;
  }
  next();
});

// Add indexes for faster queries
// Note: email index is already created by unique: true, so we don't need to add it again
UserSchema.index({ "documents.fileId": 1 });
UserSchema.index({ userType: 1, status: 1 });
UserSchema.index({ phone: 1 }); // Index for phone availability checks

// Indexes for search functionality (firstName, lastName, email, userId)
UserSchema.index({ firstName: 1 });
UserSchema.index({ lastName: 1 });
// Compound index for full name searches
UserSchema.index({ firstName: 1, lastName: 1 });

// Index for createdAt (used for sorting and date range queries)
UserSchema.index({ createdAt: -1 });

// Index for lastLogin (used in stats queries)
UserSchema.index({ lastLogin: -1 });

// Compound index for common filter combinations
UserSchema.index({ status: 1, createdAt: -1 });
UserSchema.index({ userType: 1, status: 1, createdAt: -1 });

// Index for account locking queries
UserSchema.index({ accountLockedUntil: 1 });

// Instance methods
UserSchema.methods.hasPermission = function (permission: Permission): boolean {
  // Super admins have all permissions
  if (this.userType === "super_admin") {
    return true;
  }

  // Check if user has the specific permission
  return this.permissions?.includes(permission) || false;
};

UserSchema.methods.hasAnyPermission = function (
  permissions: Permission[],
): boolean {
  if (this.userType === "super_admin") {
    return true;
  }

  return permissions.some((permission) =>
    this.permissions?.includes(permission),
  );
};

UserSchema.methods.isAdmin = function (): boolean {
  return this.userType === "admin" || this.userType === "super_admin";
};

UserSchema.methods.isAccountLocked = function (): boolean {
  if (!this.accountLockedUntil) {
    return false;
  }

  return new Date() < this.accountLockedUntil;
};

// Create the User model with proper method attachment
let User: mongoose.Model<IUser>;

// Force recompilation to ensure methods are attached
if (mongoose.models.User) {
  delete mongoose.models.User;
}

User = mongoose.model<IUser>("User", UserSchema);

export default User;
