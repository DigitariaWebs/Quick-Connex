import mongoose, { Schema, Document } from 'mongoose';
import { Types } from 'mongoose';
import { UserRole } from '@/lib/auth/core/types';
import { ActorType, TargetResourceType } from '@/models/AuditLog';

// Notification delivery schema
const NotificationDeliverySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  deliveryMethod: { type: String, required: true },
  deliveredAt: { type: Date, required: true },
  readAt: { type: Date },
  dismissedAt: { type: Date },
  acknowledgedAt: { type: Date },
  failureReason: { type: String },
});

// Notification settings schema
const NotificationSettingsSchema = new Schema({
  persistent: { type: Boolean, default: true },
  expiresAt: { type: Date },
  requireAcknowledgment: { type: Boolean, default: false },
  channels: [{ type: String }],
});

// Main notification schema
const NotificationSchema = new Schema({
  type: { type: String, required: true },
  priority: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  
  // Targeting
  targetUsers: [{ type: Schema.Types.ObjectId }],
  targetRoles: [{ type: String, enum: ['employee', 'manager', 'admin', 'super_admin'] }],
  excludeUsers: [{ type: Schema.Types.ObjectId }],
  
  // References
  transferId: { type: Schema.Types.ObjectId },
  relatedResourceId: { type: Schema.Types.ObjectId },
  relatedResourceType: { type: String },
  
  // Delivery tracking
  deliveries: [NotificationDeliverySchema],
  
  // Status
  status: { type: String, required: true },
  deliveryAttempts: { type: Number, default: 0 },
  lastDeliveryAttempt: { type: Date },
  
  // Settings
  settings: NotificationSettingsSchema,
  
  // Audit fields
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdByType: { type: String, required: true, enum: Object.values(ActorType) },
}, {
  timestamps: true,
});

// Create indexes
NotificationSchema.index({ targetUsers: 1 });
NotificationSchema.index({ targetRoles: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ 'settings.expiresAt': 1 });

// Interface for the document
export interface INotification extends Document {
  _id: Types.ObjectId;
  type: string;
  priority: string;
  title: string;
  message: string;
  data?: any;
  targetUsers: Types.ObjectId[];
  targetRoles: UserRole[];
  excludeUsers: Types.ObjectId[];
  transferId?: Types.ObjectId;
  relatedResourceId?: Types.ObjectId;
  relatedResourceType?: TargetResourceType;
  deliveries: any[];
  status: string;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  settings: {
    persistent: boolean;
    expiresAt?: Date;
    requireAcknowledgment: boolean;
    channels: string[];
  };
  createdBy: Types.ObjectId;
  createdByType: ActorType;
  createdAt: Date;
  updatedAt: Date;
}

// Create and export the model
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;