import mongoose, { Schema, Document, Model } from 'mongoose';

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
  opiqPermit?: string;
  rcr?: string;
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
  // Employee specific fields
  opiqPermit: { 
    type: String,
    required: function(this: IUser) { return this.userType === 'employee'; },
    trim: true
  },
  rcr: { 
    type: String,
    required: function(this: IUser) { return this.userType === 'employee'; },
    trim: true
  }
}, {
  timestamps: true, // This will automatically add createdAt and updatedAt fields
  versionKey: false // This will remove the __v field
});

// Add index for faster queries
UserSchema.index({ email: 1 });

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