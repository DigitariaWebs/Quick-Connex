import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * Unified Audit Log Model
 * 
 * Consolidated audit trail for all system activities:
 * - Admin actions and user management
 * - User activities and login tracking
 * - System events and security incidents
 * - Data access and modifications
 */

// Actor types - who performed the action
export enum ActorType {
  ADMIN = 'admin',
  USER = 'user',
  SYSTEM = 'system',
  API = 'api',
  BATCH = 'batch'
}

// Action categories for better organization
export enum AuditCategory {
  USER_MANAGEMENT = 'user_management',
  TRANSFER_MANAGEMENT = 'transfer_management',
  PATIENT_MANAGEMENT = 'patient_management',
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  DATA_ACCESS = 'data_access',
  SYSTEM_CONFIGURATION = 'system_configuration',
  NOTIFICATION = 'notification',
  COMMUNICATION = 'communication',
  FILE_OPERATION = 'file_operation',
  API_ACCESS = 'api_access'
}

// Comprehensive action types
export enum AuditAction {
  // User Management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_SUSPENDED = 'user_suspended',
  USER_ACTIVATED = 'user_activated',
  USER_APPROVED = 'user_approved',
  USER_REJECTED = 'user_rejected',
  USER_PROFILE_VIEWED = 'user_profile_viewed',
  USER_DATA_EXPORTED = 'user_data_exported',
  
  // Transfer Management
  TRANSFER_CREATED = 'transfer_created',
  TRANSFER_UPDATED = 'transfer_updated',
  TRANSFER_DELETED = 'transfer_deleted',
  TRANSFER_CANCELLED = 'transfer_cancelled',
  TRANSFER_APPROVED = 'transfer_approved',
  TRANSFER_REJECTED = 'transfer_rejected',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_REASSIGNED = 'transfer_reassigned',
  BULK_TRANSFER_OPERATION = 'bulk_transfer_operation',
  
  // Authentication & Security
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  PERMISSION_CHANGED = 'permission_changed',
  SESSION_CREATED = 'session_created',
  SESSION_REVOKED = 'session_revoked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Data Access
  DATA_VIEWED = 'data_viewed',
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  REPORT_GENERATED = 'report_generated',
  BULK_DATA_ACCESS = 'bulk_data_access',
  
  // System Operations
  SETTINGS_UPDATED = 'settings_updated',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  SYSTEM_ALERT = 'system_alert',
  
  // Patient Management
  PATIENT_CREATED = 'patient_created',
  PATIENT_UPDATED = 'patient_updated',
  PATIENT_DELETED = 'patient_deleted',
  PATIENT_VIEWED = 'patient_viewed',
  PATIENT_MERGED = 'patient_merged',
  
  // Notifications
  NOTIFICATION_SENT = 'notification_sent',
  NOTIFICATION_BROADCAST = 'notification_broadcast',
  EMAIL_SENT = 'email_sent',
  EMAIL_FAILED = 'email_failed',
  SMS_SENT = 'sms_sent',
  SMS_FAILED = 'sms_failed',
  
  // File Operations
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_DELETED = 'file_deleted',
  
  // API Access
  API_ENDPOINT_ACCESSED = 'api_endpoint_accessed',
  API_RATE_LIMITED = 'api_rate_limited',
  API_ERROR = 'api_error'
}

// Target resource types
export enum TargetResourceType {
  USER = 'user',
  TRANSFER = 'transfer',
  PATIENT = 'patient',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
  SETTING = 'setting',
  REPORT = 'report',
  FILE = 'file',
  API = 'api',
  SESSION = 'session'
}

// Risk levels for security assessment
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Audit log interface
export interface IAuditLog extends Document {
  // Actor information (who performed the action)
  actorId: string; // ID of the person/system that performed the action
  actorType: ActorType; // Type of actor
  actorEmail?: string; // Email for human actors
  actorName?: string; // Name for human actors
  actorRole?: string; // Role (admin, manager, employee, etc.)
  
  // Action details (what was done)
  action: AuditAction; // Specific action performed
  category: AuditCategory; // Category for grouping
  description: string; // Human-readable description
  
  // Target resource (what was affected)
  targetResource?: {
    type: TargetResourceType;
    id: string;
    name?: string;
    metadata?: Record<string, any>;
  };
  
  // Change tracking (for modifications)
  changes?: {
    before?: any; // State before the change
    after?: any; // State after the change
    fields?: string[]; // List of fields that were changed
    changeSummary?: string; // Human-readable summary of changes
  };
  
  // Context and metadata
  context?: {
    reason?: string; // Reason for the action
    affectedUsers?: number; // For bulk operations
    bulkOperationDetails?: any; // Details of bulk operations
    workflowStep?: string; // Current step in a workflow
    businessJustification?: string; // Business reason for the action
    [key: string]: any; // Flexible for additional context
  };
  
  // Request information
  requestInfo: {
    ipAddress: string;
    userAgent: string;
    method?: string; // HTTP method
    endpoint?: string; // API endpoint
    requestId?: string; // For request correlation
    sessionId?: string; // Session identifier
    deviceFingerprint?: string; // Device identification
  };
  
  // Security and risk assessment
  securityContext: {
    riskLevel: RiskLevel;
    isSensitive: boolean; // Mark sensitive operations
    requiresReview: boolean; // Flag for operations needing review
    securityFlags?: string[]; // Security-related flags
    riskScore?: number; // Numeric risk score (0-100)
    complianceFlags?: string[]; // Compliance-related flags
  };
  
  // Outcome and results
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string; // If outcome is failure
  errorCode?: string; // Error code for categorization
  
  // Timing information
  timestamp: Date;
  duration?: number; // Time taken in milliseconds
  timezone?: string; // Timezone of the action
  
  // Additional flags
  isAutomated: boolean; // Whether action was automated
  isBulkOperation: boolean; // Whether this was part of a bulk operation
  parentAuditId?: string; // For child operations in bulk actions
  
  // Resolution tracking (for security events)
  resolution?: {
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: string;
  };
  
  // Data retention
  retentionPolicy?: {
    expiresAt?: Date; // When this log should be deleted
    retentionReason?: string; // Why it's kept longer/shorter
  };
}

// Audit log schema
const AuditLogSchema = new Schema<IAuditLog>({
  // Actor information
  actorId: {
    type: String,
    required: true,
    index: true
  },
  actorType: {
    type: String,
    required: true,
    enum: Object.values(ActorType),
    index: true
  },
  actorEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  actorName: {
    type: String,
    trim: true
  },
  actorRole: {
    type: String,
    trim: true,
    index: true
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
      required: function(this: IAuditLog) {
        return this.targetResource !== undefined;
      }
    },
    id: {
      type: String,
      required: function(this: IAuditLog) {
        return this.targetResource !== undefined;
      }
    },
    name: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Change tracking
  changes: {
    before: {
      type: Schema.Types.Mixed
    },
    after: {
      type: Schema.Types.Mixed
    },
    fields: [{
      type: String
    }],
    changeSummary: {
      type: String,
      trim: true
    }
  },
  
  // Context
  context: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Request information
  requestInfo: {
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    userAgent: {
      type: String,
      required: true
    },
    method: {
      type: String,
      trim: true,
      uppercase: true
    },
    endpoint: {
      type: String,
      trim: true
    },
    requestId: {
      type: String,
      trim: true,
      index: true
    },
    sessionId: {
      type: String,
      index: true
    },
    deviceFingerprint: {
      type: String,
      trim: true
    }
  },
  
  // Security context
  securityContext: {
    riskLevel: {
      type: String,
      required: true,
      enum: Object.values(RiskLevel),
      default: RiskLevel.LOW,
      index: true
    },
    isSensitive: {
      type: Boolean,
      default: false,
      index: true
    },
    requiresReview: {
      type: Boolean,
      default: false,
      index: true
    },
    securityFlags: [{
      type: String
    }],
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    complianceFlags: [{
      type: String
    }]
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
  errorCode: {
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
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Additional flags
  isAutomated: {
    type: Boolean,
    default: false,
    index: true
  },
  isBulkOperation: {
    type: Boolean,
    default: false,
    index: true
  },
  parentAuditId: {
    type: String,
    index: true
  },
  
  // Resolution tracking
  resolution: {
    resolved: {
      type: Boolean,
      default: false,
      index: true
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: String,
      trim: true
    },
    resolution: {
      type: String,
      trim: true
    }
  },
  
  // Data retention
  retentionPolicy: {
    expiresAt: {
      type: Date,
      index: true
    },
    retentionReason: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes for efficient querying
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, outcome: 1 });
AuditLogSchema.index({ 'targetResource.type': 1, 'targetResource.id': 1 });
AuditLogSchema.index({ 'securityContext.riskLevel': 1, timestamp: -1 });
AuditLogSchema.index({ 'securityContext.isSensitive': 1, 'securityContext.requiresReview': 1 });
AuditLogSchema.index({ 'requestInfo.ipAddress': 1, timestamp: -1 });
AuditLogSchema.index({ 'requestInfo.sessionId': 1, timestamp: -1 });

// TTL index for automatic cleanup (2 years default)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Static methods for common operations
AuditLogSchema.statics.logAction = async function(logData: Partial<IAuditLog>) {
  const log = new this(logData);
  return await log.save();
};

// Get recent activity
AuditLogSchema.statics.getRecentActivity = function(
  limit: number = 50,
  actorId?: string,
  category?: AuditCategory
) {
  const query: any = {};
  if (actorId) query.actorId = actorId;
  if (category) query.category = category;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get activity by category
AuditLogSchema.statics.getActivityByCategory = function(
  category: AuditCategory,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
) {
  const query: any = { category };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get failed actions
AuditLogSchema.statics.getFailedActions = function(limit: number = 100) {
  return this.find({ outcome: 'failure' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get sensitive actions
AuditLogSchema.statics.getSensitiveActions = function(limit: number = 100) {
  return this.find({ 'securityContext.isSensitive': true })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get high-risk activities
AuditLogSchema.statics.getHighRiskActivities = function(limit: number = 100) {
  return this.find({ 
    'securityContext.riskLevel': { $in: [RiskLevel.HIGH, RiskLevel.CRITICAL] }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get actions requiring review
AuditLogSchema.statics.getActionsRequiringReview = function(limit: number = 100) {
  return this.find({ 'securityContext.requiresReview': true })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get activity statistics
AuditLogSchema.statics.getActivityStats = async function(
  startDate: Date, 
  endDate: Date
) {
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
          outcome: '$outcome',
          riskLevel: '$securityContext.riskLevel'
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
            riskLevel: '$_id.riskLevel',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

// Get user activity
AuditLogSchema.statics.getUserActivity = function(
  userId: string,
  limit: number = 50,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { actorId: userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Get admin activity
AuditLogSchema.statics.getAdminActivity = function(
  adminId: string,
  limit: number = 50,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { 
    actorId: adminId,
    actorType: { $in: [ActorType.ADMIN, ActorType.SYSTEM] }
  };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Create or get the AuditLog model
let AuditLog: Model<IAuditLog>;

try {
  if (mongoose.models.AuditLog) {
    AuditLog = mongoose.models.AuditLog as Model<IAuditLog>;
    console.log('📋 Models: Using existing AuditLog model');
  } else {
    AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
    console.log('📋 Models: AuditLog model created successfully');
  }
} catch (error) {
  console.log('📋 Models: Fallback - creating new AuditLog model');
  AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
}

export default AuditLog;



