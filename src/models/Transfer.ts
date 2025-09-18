import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Define the interface for Transfer document
export interface ITransfer extends Document {
  transferId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    age: number;
  };
  fromHospital: string;
  toHospital: string;
  requestedBy: Types.ObjectId; // Reference to User (manager)
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: Date;
  scheduledDate?: Date;
  scheduledEndDate?: Date; // End time for the transfer
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  
  // Simplified scheduling fields
  scheduling: {
    timeSlot: {
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
      duration: number; // in minutes
    };
    location: {
      pickupLocation: string;
      dropoffLocation: string;
    };
  };
  
  // Status tracking
  statusHistory: Array<{
    status: string;
    changedBy: Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
  
  // Audit fields
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  
  createdAt: Date;
  updatedAt: Date;
}

// Transfer schema
const TransferSchema = new Schema<ITransfer>({
  transferId: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  patientInfo: {
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
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120
    }
  },
  fromHospital: { 
    type: String, 
    required: true,
    trim: true
  },
  toHospital: { 
    type: String, 
    required: true,
    trim: true
  },
  requestedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reason: { 
    type: String, 
    required: true,
    trim: true
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  requestedDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  scheduledDate: { 
    type: Date
  },
  scheduledEndDate: { 
    type: Date
  },
  completedDate: { 
    type: Date
  },
  notes: { 
    type: String,
    trim: true
  },
  medicalDocuments: [{ 
    type: String, 
    trim: true 
  }],
  
  // Simplified scheduling fields
  scheduling: {
    timeSlot: {
      startTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      endTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      duration: {
        type: Number,
        min: 0
      }
    },
    location: {
      pickupLocation: {
        type: String,
        required: true,
        trim: true
      },
      dropoffLocation: {
        type: String,
        required: true,
        trim: true
      }
    }
  },
  
  // Enhanced fields for robustness
  statusHistory: [{
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true
    }
  }],
  
  // Audit fields
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  estimatedDuration: {
    type: Number,
    min: 0
  },
  actualDuration: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// Add indexes for faster queries
TransferSchema.index({ transferId: 1 });
TransferSchema.index({ 'patientInfo.firstName': 1, 'patientInfo.lastName': 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ priority: 1 });
TransferSchema.index({ requestedBy: 1 });
TransferSchema.index({ requestedDate: -1 });
TransferSchema.index({ scheduledDate: 1 });
TransferSchema.index({ scheduledEndDate: 1 });
TransferSchema.index({ lastModifiedBy: 1 });
TransferSchema.index({ 'statusHistory.changedAt': -1 });

// Pre-save hook to track status changes
TransferSchema.pre('save', function(next) {
  // If status is being modified, add to status history
  if (this.isModified('status') && !this.isNew) {
    const statusEntry = {
      status: this.status,
      changedBy: this.lastModifiedBy,
      changedAt: new Date(),
      reason: 'Status updated'
    };
    
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    
    this.statusHistory.push(statusEntry);
  }
  
  next();
});

// Create or get the Transfer model
const Transfer: Model<ITransfer> = mongoose.models.Transfer as Model<ITransfer> || 
  mongoose.model<ITransfer>('Transfer', TransferSchema);

// Log when Transfer model is created/accessed
if (!mongoose.models.Transfer) {
  console.log('📋 Models: Transfer model created successfully');
} else {
  console.log('📋 Models: Using existing Transfer model');
}

export default Transfer;
