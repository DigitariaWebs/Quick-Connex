/**
 * Admin Audit Log Model
 * 
 * Tracks admin access to sensitive user data for security and compliance
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminAuditLog extends Document {
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: string;
  targetUserId: string;
  targetUserEmail: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  riskLevel: 'low' | 'medium' | 'high';
  success: boolean;
  errorMessage?: string;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  adminId: {
    type: String,
    required: true,
    index: true
  },
  adminEmail: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'view_user_details',
      'view_login_history',
      'export_user_data',
      'suspend_user',
      'activate_user',
      'reset_password',
      'unlock_account',
      'delete_user',
      'bulk_operations'
    ],
    index: true
  },
  targetUserId: {
    type: String,
    required: true,
    index: true
  },
  targetUserEmail: {
    type: String,
    required: true
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    index: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
    index: true
  },
  success: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for efficient querying
AdminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ targetUserId: 1, timestamp: -1 });
AdminAuditLogSchema.index({ action: 1, timestamp: -1 });
AdminAuditLogSchema.index({ riskLevel: 1, timestamp: -1 });

// TTL index to automatically delete old audit logs after 1 year
AdminAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to log admin actions
AdminAuditLogSchema.statics.logAdminAction = async function(
  adminId: string,
  adminEmail: string,
  action: string,
  targetUserId: string,
  targetUserEmail: string,
  details: Record<string, any> = {},
  ipAddress: string,
  userAgent: string,
  sessionId?: string,
  riskLevel: 'low' | 'medium' | 'high' = 'low',
  success: boolean = true,
  errorMessage?: string
): Promise<IAdminAuditLog> {
  const auditLog = new this({
    adminId,
    adminEmail,
    action,
    targetUserId,
    targetUserEmail,
    details,
    ipAddress,
    userAgent,
    sessionId,
    riskLevel,
    success,
    errorMessage
  });
  
  return auditLog.save();
};

// Static method to get audit logs for a specific admin
AdminAuditLogSchema.statics.getAdminAuditLogs = function(
  adminId: string,
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ adminId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get audit logs for a specific user
AdminAuditLogSchema.statics.getUserAuditLogs = function(
  targetUserId: string,
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ targetUserId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get high-risk activities
AdminAuditLogSchema.statics.getHighRiskActivities = function(
  limit: number = 100,
  skip: number = 0
) {
  return this.find({ riskLevel: 'high' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Create or get the AdminAuditLog model
let AdminAuditLog: Model<IAdminAuditLog>;

try {
  if (mongoose.models.AdminAuditLog) {
    AdminAuditLog = mongoose.models.AdminAuditLog;
  } else {
    AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
  }
} catch (error) {
  console.error('Error creating AdminAuditLog model:', error);
  AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
}

export default AdminAuditLog;
