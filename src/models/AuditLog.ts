import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Audit Log Model
 * 
 * Tracks all administrative actions in the system for compliance and security
 */

// Audit action categories
export enum AuditCategory {
  USER_MANAGEMENT = 'user_management',
  TRANSFER_MANAGEMENT = 'transfer_management',
  SYSTEM_CONFIGURATION = 'system_configuration',
  DATA_ACCESS = 'data_access',
  SECURITY = 'security',
  NOTIFICATION = 'notification',
  AUTHENTICATION = 'authentication',
}

// Audit action types
export enum AuditAction {
  // User management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_ACTIVATED = 'user_activated',
  USER_APPROVED = 'user_approved',
  USER_REJECTED = 'user_rejected',
  
  // Transfer management
  TRANSFER_CREATED = 'transfer_created',
  TRANSFER_UPDATED = 'transfer_updated',
  TRANSFER_DELETED = 'transfer_deleted',
  TRANSFER_CANCELLED = 'transfer_cancelled',
  TRANSFER_FORCE_COMPLETED = 'transfer_force_completed',
  TRANSFER_REASSIGNED = 'transfer_reassigned',
  BULK_TRANSFER_OPERATION = 'bulk_transfer_operation',
  
  // System configuration
  SETTINGS_UPDATED = 'settings_updated',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  
  // Data access
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  REPORT_GENERATED = 'report_generated',
  
  // Security
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  PERMISSION_CHANGED = 'permission_changed',
  
  // Notifications
  NOTIFICATION_BROADCAST = 'notification_broadcast',
  NOTIFICATION_SENT = 'notification_sent',
}

// Target resource types
export enum TargetResourceType {
  USER = 'user',
  TRANSFER = 'transfer',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
  SETTING = 'setting',
  REPORT = 'report',
}

// Audit log interface
export interface IAuditLog extends Document {
  // Who performed the action
  adminId: Types.ObjectId; // Reference to admin user
  adminName: string; // Cached for quick display
  adminEmail: string; // Cached for quick display
  adminRole: string; // admin or super_admin
  
  // What action was performed
  action: AuditAction;
  category: AuditCategory;
  description: string; // Human-readable description
  
  // What was affected
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string;
  };
  
  // Details of the change
  changes?: {
    before?: any; // State before the change
    after?: any; // State after the change
    fields?: string[]; // List of fields that were changed
  };
  
  // Additional context
  metadata?: {
    reason?: string; // Reason for the action (especially important for deletions, suspensions)
    affectedUsers?: number; // For bulk operations
    bulkOperationDetails?: any; // Details of bulk operation
    [key: string]: any; // Flexible for additional data
  };
  
  // Request information
  requestInfo: {
    ipAddress: string;
    userAgent: string;
    method?: string; // HTTP method
    endpoint?: string; // API endpoint
    requestId?: string; // For correlation
  };
  
  // Result
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string; // If outcome is failure
  
  // Timing
  timestamp: Date;
  duration?: number; // Time taken in milliseconds
  
  // Flags
  isSensitive?: boolean; // Mark sensitive operations
  requiresReview?: boolean; // Flag for operations that need review
  
  createdAt: Date;
  updatedAt: Date;
}

// Audit log schema
const AuditLogSchema = new Schema<IAuditLog>({
  // Admin information
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminName: {
    type: String,
    required: true,
    trim: true
  },
  adminEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  adminRole: {
    type: String,
    required: true,
    enum: ['admin', 'super_admin']
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    enum: Object.values(AuditAction),
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: Object.values(AuditCategory),
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Target resource
  targetResource: {
    type: {
      type: String,
      enum: Object.values(TargetResourceType),
      required: true
    },
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true
    }
  },
  
  // Change details
  changes: {
    before: {
      type: Schema.Types.Mixed
    },
    after: {
      type: Schema.Types.Mixed
    },
    fields: [{
      type: String
    }]
  },
  
  // Metadata
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Request information
  requestInfo: {
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    method: {
      type: String,
      trim: true
    },
    endpoint: {
      type: String,
      trim: true
    },
    requestId: {
      type: String,
      trim: true
    }
  },
  
  // Outcome
  outcome: {
    type: String,
    required: true,
    enum: ['success', 'failure', 'partial'],
    index: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  
  // Timing
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  duration: {
    type: Number,
    min: 0
  },
  
  // Flags
  isSensitive: {
    type: Boolean,
    default: false,
    index: true
  },
  requiresReview: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for common queries
AuditLogSchema.index({ adminId: 1, timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, outcome: 1 });
AuditLogSchema.index({ 'targetResource.type': 1, 'targetResource.id': 1 });
AuditLogSchema.index({ timestamp: -1 }); // For recent activity queries
AuditLogSchema.index({ isSensitive: 1, requiresReview: 1 }); // For security review

// TTL index - keep audit logs for 2 years by default
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Static methods
AuditLogSchema.statics.logAction = async function(logData: Partial<IAuditLog>) {
  const log = new this(logData);
  return await log.save();
};

AuditLogSchema.statics.getRecentActivity = function(limit: number = 50, adminId?: string) {
  const query = adminId ? { adminId } : {};
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

AuditLogSchema.statics.getActivityByCategory = function(
  category: AuditCategory,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { category };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .lean();
};

AuditLogSchema.statics.getFailedActions = function(limit: number = 100) {
  return this.find({ outcome: 'failure' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

AuditLogSchema.statics.getSensitiveActions = function(limit: number = 100) {
  return this.find({ isSensitive: true })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

AuditLogSchema.statics.getActionsRequiringReview = function() {
  return this.find({ requiresReview: true })
    .sort({ timestamp: -1 })
    .lean();
};

AuditLogSchema.statics.getActivityStats = async function(startDate: Date, endDate: Date) {
  return await this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          category: '$category',
          outcome: '$outcome'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        outcomes: {
          $push: {
            outcome: '$_id.outcome',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

// Create or get the AuditLog model
const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog as Model<IAuditLog> || 
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Log when AuditLog model is created/accessed
if (!mongoose.models.AuditLog) {
  console.log('📋 Models: AuditLog model created successfully');
} else {
  console.log('📋 Models: Using existing AuditLog model');
}

export default AuditLog;



