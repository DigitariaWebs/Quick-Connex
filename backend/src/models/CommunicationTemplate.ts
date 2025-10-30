/**
 * Communication Template Model
 * 
 * Mongoose schema for communication templates with optional database overrides.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommunicationTemplate extends Document {
  id: string; // Unique template ID
  name: string;
  channel: 'email' | 'sms';
  category: string;
  subject?: string; // For email
  text: string; // Plain text or SMS content
  html?: string; // For email HTML
  variables: string[];
  isActive: boolean;
  version: number;
  createdBy?: mongoose.Types.ObjectId;
  lastModifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunicationTemplateModel extends Model<ICommunicationTemplate> {
  findActiveById(id: string): Promise<ICommunicationTemplate | null>;
  findByChannelAndCategory(channel: string, category?: string): Promise<ICommunicationTemplate[]>;
}

const CommunicationTemplateSchema = new Schema<ICommunicationTemplate>({
  id: {
    type: String,
    required: [true, 'Template ID is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Template ID cannot exceed 100 characters']
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [200, 'Template name cannot exceed 200 characters']
  },
  channel: {
    type: String,
    required: [true, 'Channel is required'],
    enum: ['email', 'sms'],
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    index: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [500, 'Subject cannot exceed 500 characters']
  },
  text: {
    type: String,
    required: [true, 'Text content is required'],
    trim: true
  },
  html: {
    type: String,
    trim: true
  },
  variables: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'communication_templates'
});

// Indexes for performance
CommunicationTemplateSchema.index({ id: 1, isActive: 1 });
CommunicationTemplateSchema.index({ channel: 1, category: 1, isActive: 1 });
CommunicationTemplateSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure version increment
CommunicationTemplateSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Static method to find active template by ID
CommunicationTemplateSchema.statics['findActiveById'] = function(id: string) {
  return this.findOne({ id, isActive: true });
};

// Static method to find templates by channel and category
CommunicationTemplateSchema.statics['findByChannelAndCategory'] = function(channel: string, category?: string) {
  const query: any = { channel, isActive: true };
  if (category) {
    query.category = category;
  }
  return this.find(query).sort({ name: 1 });
};

export const CommunicationTemplate: ICommunicationTemplateModel = mongoose.model<ICommunicationTemplate, ICommunicationTemplateModel>('CommunicationTemplate', CommunicationTemplateSchema);
