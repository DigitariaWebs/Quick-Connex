/**
 * Models Initialization
 * 
 * This file ensures all Mongoose models are properly registered
 * before they are used anywhere in the application.
 */

import mongoose from 'mongoose';

// Import all models to ensure they are registered
import Hospital from '@/models/Hospital';
import User from '@/models/User';
import Patient from '@/models/Patient';
import Transfer from '@/models/Transfer';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { CIUSSS } from '@/models/CIUSSS';

// Log model registration status
console.log('📋 Models: Initializing all models...');

// Verify all models are registered
const requiredModels = ['Hospital', 'User', 'Patient', 'Transfer', 'AuditLog', 'Notification', 'CIUSSS'];
const missingModels = requiredModels.filter(modelName => !mongoose.models || !mongoose.models[modelName]);

if (missingModels.length > 0) {
  console.warn('⚠️ Models: Missing models:', missingModels);
} else {
  console.log('✅ Models: All models registered successfully');
}

export {
  Hospital,
  User,
  Patient,
  Transfer,
  AuditLog,
  Notification,
  CIUSSS
};

