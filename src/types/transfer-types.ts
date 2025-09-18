/**
 * Transfer System Types and Interfaces
 * 
 * This file contains all TypeScript types and interfaces used throughout
 * the transfer system to ensure type safety and consistency.
 */

import { Types } from 'mongoose';
import {
  TransferStatus,
  TransferPriority,
  TransferType,
  UserRole
} from '@/constants/transfer-constants';

// Note: Conflict types removed as hospitals handle their own logistics

// Base Entity Interfaces
export interface BaseEntity {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Patient Information (embedded in transfer)
export interface PatientInfo {
  firstName: string;
  lastName: string;
  age: number;
}

// User Information
export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserRole;
  isActive: boolean;
  phone?: string;
}

// Time Slot Configuration
export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  duration: number; // in minutes
}

// Location Configuration
export interface LocationConfig {
  pickupLocation: string;
  dropoffLocation: string;
  estimatedDistance?: number; // in kilometers
  estimatedDuration?: number; // in minutes
}

// Note: ConflictInfo interface removed as hospitals handle their own logistics

// Scheduling Configuration
export interface SchedulingConfig {
  isRecurring: boolean;
  timeSlot: TimeSlot;
  location: LocationConfig;
}

// Status History Entry
export interface StatusHistoryEntry {
  status: TransferStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
  notes?: string;
}

// Transfer Document Interface (matches MongoDB schema)
export interface ITransfer extends BaseEntity {
  transferId: string;
  patientInfo: PatientInfo;
  fromHospital: string;
  toHospital: string;
  requestedBy: Types.ObjectId; // Reference to User (manager)
  assignedTo?: Types.ObjectId; // Reference to User (employee)
  reason: string;
  priority: TransferPriority;
  status: TransferStatus;
  requestedDate: Date;
  scheduledDate?: Date;
  scheduledEndDate?: Date;
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[]; // Array of file paths
  
  // Advanced scheduling fields
  scheduling: SchedulingConfig;
  
  // Enhanced fields for robustness
  statusHistory: StatusHistoryEntry[];
  
  // Audit fields
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
}

// Transfer Request Data (for creating new transfers)
export interface TransferRequestData {
  patientFirstName: string;
  patientLastName: string;
  patientAge: number;
  fromHospital: string;
  toHospital: string;
  transferDate: string;
  transferTime: string;
  transferType: TransferType;
  issuer: string;
  priority: TransferPriority;
  reason: string;
  notes?: string;
  medicalDocuments?: string[];
  scheduling?: Partial<SchedulingConfig>;
}

// Transfer Response (for API responses)
export interface TransferResponse {
  _id: string;
  transferId: string;
  patientInfo: PatientInfo;
  fromHospital: string;
  toHospital: string;
  requestedBy: UserInfo;
  assignedTo?: UserInfo;
  reason: string;
  priority: TransferPriority;
  status: TransferStatus;
  requestedDate: string;
  scheduledDate?: string;
  scheduledEndDate?: string;
  completedDate?: string;
  notes?: string;
  medicalDocuments?: string[];
  scheduling: SchedulingConfig;
  statusHistory: StatusHistoryEntry[];
  lastModifiedBy: UserInfo;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  updatedAt: string;
}

// Transfer List Response
export interface TransferListResponse {
  transfers: TransferResponse[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Transfer Action Request
export interface TransferActionRequest {
  transferId: string;
  action: 'accept' | 'start' | 'complete' | 'cancel';
  assignedTo?: string;
  notes?: string;
  reason?: string;
}

// Transfer Action Response
export interface TransferActionResponse {
  success: boolean;
  message: string;
  transfer?: TransferResponse;
  error?: string;
  errorCode?: string;
}

// Transfer Validation Result
export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

// Transfer Action Permissions
export interface TransferActionPermissions {
  canAccept: boolean;
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canEdit: boolean;
  canView: boolean;
  canCreate: boolean;
  reason?: string;
}

// Transfer Statistics
export interface TransferStats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  averageCompletionTime?: number; // in minutes
  completionRate?: number; // percentage
}

// Transfer Filter Options
export interface TransferFilterOptions {
  status?: TransferStatus[];
  priority?: TransferPriority[];
  requestedBy?: string[];
  assignedTo?: string[];
  fromHospital?: string[];
  toHospital?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  isRecurring?: boolean;
}

// Transfer Sort Options
export interface TransferSortOptions {
  field: 'requestedDate' | 'scheduledDate' | 'priority' | 'status' | 'patientName';
  direction: 'asc' | 'desc';
}

// Transfer Query Options
export interface TransferQueryOptions {
  filter?: TransferFilterOptions;
  sort?: TransferSortOptions;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

// Notification Data
export interface TransferNotificationData {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  transferId: string;
  transfer: {
    id: string;
    transferId: string;
    patientInfo: PatientInfo;
    fromHospital: string;
    toHospital: string;
    priority: TransferPriority;
    status: TransferStatus;
    scheduledDate?: Date;
  };
  requestedBy: {
    id: string;
    name: string;
    userType: UserRole;
  };
  timestamp: string;
  read: boolean;
  expiresAt?: string;
}

// Calendar Event Data
export interface TransferCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  transferId: string;
  patientInfo: {
    name: string;
    age: number;
  };
  fromHospital: string;
  toHospital: string;
  priority: TransferPriority;
  status: TransferStatus;
  assignedTo?: string;
  color: string;
  isRecurring: boolean;
}

// Note: ConflictDetectionResult interface removed as hospitals handle their own logistics

// Recurring Transfer Instance
export interface RecurringTransferInstance {
  parentTransferId: string;
  instanceDate: Date;
  status: TransferStatus;
  assignedTo?: Types.ObjectId;
  notes?: string;
}

// Transfer Analytics Data
export interface TransferAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  stats: TransferStats;
  trends: {
    daily: Array<{
      date: string;
      count: number;
      completed: number;
    }>;
    weekly: Array<{
      week: string;
      count: number;
      completed: number;
    }>;
    monthly: Array<{
      month: string;
      count: number;
      completed: number;
    }>;
  };
  performance: {
    averageAcceptanceTime: number; // in minutes
    averageCompletionTime: number; // in minutes
    onTimeRate: number; // percentage
    cancellationRate: number; // percentage
  };
  topHospitals: Array<{
    hospital: string;
    count: number;
    completionRate: number;
  }>;
  topEmployees: Array<{
    employee: string;
    count: number;
    completionRate: number;
    averageTime: number;
  }>;
}

// Export utility types
export type TransferStatusType = keyof typeof TransferStatus;
export type TransferPriorityType = keyof typeof TransferPriority;
export type TransferTypeType = keyof typeof TransferType;
export type UserRoleType = keyof typeof UserRole;

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

// Pagination Info
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Generic List Response
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}
