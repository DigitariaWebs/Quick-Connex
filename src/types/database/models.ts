/**
 * Database Model Types
 * 
 * Mongoose interface definitions for database models.
 * These are the database layer types, separate from domain types.
 */

import { Types } from 'mongoose';
import { IDocumentReference } from '../auth/user.types';

/**
 * User Interface (Mongoose/Database Model)
 * 
 * This is the database representation of a user.
 * Note: This is different from the domain User type which is used in the application layer.
 */
export interface IUser {
  _id: Types.ObjectId;
  userType: 'manager' | 'employee' | 'admin' | 'super_admin';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  post?: string;
  ciusss?: Types.ObjectId | string;
  hospital?: Types.ObjectId | string;
  documents?: IDocumentReference[];
  permissions?: string[];
  accountLockedUntil?: Date;
  isApproved?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedBy?: Types.ObjectId;
  suspendedAt?: Date;
  suspensionReason?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transfer Interface (Mongoose/Database Model)
 * 
 * This is the database representation of a transfer.
 * Note: This is different from the domain ITransfer type.
 */
export interface ITransferDocument {
  _id: Types.ObjectId;
  transferId: string;
  transferCategory: string;
  transferData: any;
  fromHospital: Types.ObjectId;
  toHospital: Types.ObjectId;
  fromHospitalName: string;
  toHospitalName: string;
  requestedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  reason: string;
  priority: string;
  status: string;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[];
  scheduling: any;
  statusHistory: any[];
  timeline: any[];
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

