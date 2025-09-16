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

// Define the interface for User document
export interface IUser extends Document {
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  class?: string;
  documents?: IDocumentReference[]; // Array of document references
  createdAt: Date;
  updatedAt: Date;
}

// Base user schema
const UserSchema = new Schema<IUser>({
  userType: { 
    type: String, 
    required: true,
    enum: ['employee', 'manager'] 
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
  class: { 
    type: String,
    required: function(this: IUser) { return this.userType === 'manager'; },
    trim: true
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
  }]
}, {
  timestamps: true, // This will automatically add createdAt and updatedAt fields
  versionKey: false // This will remove the __v field
});

// Add validation to ensure employees have required documents
UserSchema.pre('save', function(next) {
  if (this.userType === 'employee') {
    const hasCv = this.documents?.some(doc => doc.documentType === 'cv');
    const hasOpiqPermit = this.documents?.some(doc => doc.documentType === 'opiqPermit');
    const hasRcr = this.documents?.some(doc => doc.documentType === 'rcr');
    
    if (!hasCv || !hasOpiqPermit || !hasRcr) {
      return next(new Error('Employee must have CV, OPIQ permit, and RCR documents'));
    }
  }
  next();
});

// Remove old field validations that are no longer needed
UserSchema.pre('validate', function(next) {
  // Remove validation errors for old fields that no longer exist
  if (this.userType === 'employee') {
    delete this.opiqPermit;
    delete this.rcr;
  }
  next();
});

// Add index for faster queries
// Note: email index is already created by unique: true, so we don't need to add it again
UserSchema.index({ 'documents.fileId': 1 });

// Create or get the User model
const User: Model<IUser> = mongoose.models.User as Model<IUser> || 
  mongoose.model<IUser>('User', UserSchema);

// Log when User model is created/accessed
if (!mongoose.models.User) {
  console.log('📋 Models: User model created successfully');
} else {
  console.log('📋 Models: Using existing User model');
}

export default User;