import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Define the interface for Notification document
export interface INotification extends Document {
  id: string;
  type: 'transfer_status_change' | 'new_transfer' | 'urgent_transfer' | 'transfer_reminder' | 'system' | 'scheduling';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  
  // User targeting
  targetUsers: Types.ObjectId[]; // Specific users to receive this notification
  targetRoles: string[]; // Roles that should receive this notification
  excludeUsers: Types.ObjectId[]; // Users to exclude from receiving this notification
  
  // Transfer-related data
  transferId?: string;
  transfer?: Types.ObjectId; // Reference to Transfer
  
  // Additional data
  data?: {
    transfer?: {
      id: string;
      transferId: string;
      patient?: {
        firstName: string;
        lastName: string;
        patientId: string;
      };
      fromHospital?: string;
      toHospital?: string;
      status?: string;
      oldStatus?: string;
      priority?: string;
      scheduledDate?: Date;
    };
    changedBy?: {
      id: string;
      name: string;
      userType: string;
    };
    requestedBy?: {
      id: string;
      name: string;
      userType: string;
    };
    [key: string]: any;
  };
  
  // Delivery tracking
  deliveries: Array<{
    userId: Types.ObjectId;
    deliveredAt: Date;
    readAt?: Date;
    dismissedAt?: Date;
    deliveryMethod: 'realtime' | 'email' | 'sms' | 'push';
  }>;
  
  // Notification settings
  settings: {
    persistent: boolean; // Whether to persist in database
    expiresAt?: Date; // When this notification expires
    maxDeliveries?: number; // Maximum number of delivery attempts
    retryInterval?: number; // Minutes between retry attempts
  };
  
  // Status tracking
  status: 'pending' | 'delivered' | 'failed' | 'expired';
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  
  // Audit fields
  createdBy?: Types.ObjectId; // User who created this notification
  createdAt: Date;
  updatedAt: Date;
}

// Notification schema
const NotificationSchema = new Schema<INotification>({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'transfer_reminder', 'system', 'scheduling'],
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // User targeting
  targetUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  targetRoles: [{
    type: String,
    enum: ['manager', 'employee', 'admin'],
    index: true
  }],
  excludeUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Transfer-related data
  transferId: {
    type: String,
    trim: true
  },
  transfer: {
    type: Schema.Types.ObjectId,
    ref: 'Transfer'
  },
  
  // Additional data
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Delivery tracking
  deliveries: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    deliveredAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    readAt: {
      type: Date
    },
    dismissedAt: {
      type: Date
    },
    deliveryMethod: {
      type: String,
      enum: ['realtime', 'email', 'sms', 'push'],
      required: true
    }
  }],
  
  // Notification settings
  settings: {
    persistent: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 } // TTL index
    },
    maxDeliveries: {
      type: Number,
      default: 3
    },
    retryInterval: {
      type: Number,
      default: 5 // minutes
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  lastDeliveryAttempt: {
    type: Date
  },
  
  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  versionKey: false
});

// Add indexes for better query performance
NotificationSchema.index({ type: 1, priority: 1 });
NotificationSchema.index({ targetUsers: 1, status: 1 });
NotificationSchema.index({ targetRoles: 1, status: 1 });
NotificationSchema.index({ transferId: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ 'deliveries.userId': 1, 'deliveries.readAt': 1 });

// Static methods
NotificationSchema.statics.findUnreadForUser = function(userId: string, userRoles: string[]) {
  return this.find({
    $and: [
      {
        $or: [
          { targetUsers: userId },
          { targetRoles: { $in: userRoles } }
        ]
      },
      {
        excludeUsers: { $ne: userId }
      },
      {
        'deliveries': {
          $not: {
            $elemMatch: {
              userId: userId,
              readAt: { $exists: true }
            }
          }
        }
      },
      {
        status: { $in: ['pending', 'delivered'] }
      }
    ]
  }).sort({ createdAt: -1 });
};

NotificationSchema.statics.markAsRead = function(notificationId: string, userId: string) {
  return this.updateOne(
    { 
      id: notificationId,
      'deliveries.userId': userId 
    },
    { 
      $set: { 'deliveries.$.readAt': new Date() }
    }
  );
};

NotificationSchema.statics.markAsDismissed = function(notificationId: string, userId: string) {
  return this.updateOne(
    { 
      id: notificationId,
      'deliveries.userId': userId 
    },
    { 
      $set: { 'deliveries.$.dismissedAt': new Date() }
    }
  );
};

// Instance methods
NotificationSchema.methods.addDelivery = function(userId: string, deliveryMethod: string = 'realtime') {
  const existingDelivery = this.deliveries.find((d: any) => d.userId.toString() === userId);
  
  if (existingDelivery) {
    existingDelivery.deliveredAt = new Date();
    existingDelivery.deliveryMethod = deliveryMethod;
  } else {
    this.deliveries.push({
      userId,
      deliveredAt: new Date(),
      deliveryMethod
    });
  }
  
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  
  return this.save();
};

NotificationSchema.methods.markAsReadForUser = function(userId: string) {
  const delivery = this.deliveries.find((d: any) => d.userId.toString() === userId);
  if (delivery) {
    delivery.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

NotificationSchema.methods.markAsDismissedForUser = function(userId: string) {
  const delivery = this.deliveries.find((d: any) => d.userId.toString() === userId);
  if (delivery) {
    delivery.dismissedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Create or get the Notification model with defensive checks
let Notification: Model<INotification>;

try {
  // Check if mongoose.models exists and has Notification
  if (mongoose.models && mongoose.models.Notification) {
    Notification = mongoose.models.Notification as Model<INotification>;
    console.log('📋 Models: Using existing Notification model');
  } else {
    Notification = mongoose.model<INotification>('Notification', NotificationSchema);
    console.log('📋 Models: Notification model created successfully');
  }
} catch (error) {
  // Fallback: always create new model
  console.log('📋 Models: Fallback - creating new Notification model');
  Notification = mongoose.model<INotification>('Notification', NotificationSchema);
}

export default Notification;
