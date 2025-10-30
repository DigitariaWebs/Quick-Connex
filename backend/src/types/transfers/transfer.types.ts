/**
 * Transfer System Types and Interfaces
 */

import { Types } from 'mongoose';
import {
  TransferStatus,
  TransferPriority,
  TransferType,
  TransferCategory,
  UserRole
} from '../../lib/transfers/core/constants';

export interface BaseEntity {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientInfo {
  firstName: string;
  lastName: string;
  age: number;
  dossierNumber: string;
}

export interface EnvelopeInfo {
  envelopeNumber?: string;
  senderName: string;
  recipientName: string;
  contents: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  measurementUnit?: 'cm' | 'inch';
  weightUnit?: 'kg' | 'pound';
}

export interface FileInfo {
  patientName: string;
  dossierNumber: string;
  fileType: string;
  fileCount: number;
  urgency: 'low' | 'urgent';
}

export interface EquipmentInfo {
  equipmentName: string;
  serialNumber?: string;
  model: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  maintenanceRequired: boolean;
  specialInstructions?: string;
}

export interface TransferData {
  patientInfo?: PatientInfo;
  envelopeInfo?: EnvelopeInfo;
  fileInfo?: FileInfo;
  equipmentInfo?: EquipmentInfo;
}

export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserRole;
  isActive: boolean;
  phone?: string;
}

export interface SchedulingConfig {
  transferTime: string;
}

export type TimelineEventType = 
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'patient_updated'
  | 'hospital_updated'
  | 'scheduled'
  | 'rescheduled'
  | 'document_uploaded'
  | 'document_removed'
  | 'notes_updated'
  | 'priority_changed'
  | 'reason_updated'
  | 'approved'
  | 'rejected'
  | 'accepted'
  | 'started'
  | 'completed'
  | 'cancelled'
  | 'communication'
  | 'system'
  | 'admin_action'
  | 'manager_action'
  | 'employee_action';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: Date;
  actor: {
    id: Types.ObjectId;
    name: string;
    email: string;
    userType: 'manager' | 'employee' | 'admin';
  };
  metadata?: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
    details?: string;
    [key: string]: any;
  };
  isSystemEvent?: boolean;
  isVisible?: boolean;
}

export interface StatusHistoryEntry {
  status: TransferStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
  notes?: string;
}

export interface ITransfer extends BaseEntity {
  transferId: string;
  transferCategory: TransferCategory;
  patientInfo?: PatientInfo;
  transferData: TransferData;
  fromHospital: Types.ObjectId;
  toHospital: Types.ObjectId;
  fromHospitalName: string;
  toHospitalName: string;
  requestedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  reason: string;
  priority: TransferPriority;
  status: TransferStatus;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  medicalDocuments?: string[];
  scheduling: SchedulingConfig;
  statusHistory: StatusHistoryEntry[];
  timeline: TimelineEvent[];
  lastModifiedBy: Types.ObjectId;
  estimatedDuration?: number;
  actualDuration?: number;
}

export interface TransferRequestData {
  transferCategory: TransferCategory;
  patientFirstName?: string;
  patientLastName?: string;
  patientAge?: number;
  patientDossierNumber?: string;
  envelopeNumber?: string;
  senderName?: string;
  recipientName?: string;
  contents?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  patientName?: string;
  fileType?: string;
  fileCount?: number;
  fileUrgency?: 'low' | 'urgent';
  equipmentName?: string;
  serialNumber?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  specialInstructions?: string;
  fromHospital: string;
  toHospital: string;
  fromHospitalId?: string;
  toHospitalId?: string;
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

export interface TransferListResponse {
  transfers: TransferResponse[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TransferActionRequest {
  transferId: string;
  action: 'accept' | 'start' | 'complete' | 'cancel';
  assignedTo?: string;
  notes?: string;
  reason?: string;
}

export interface TransferActionResponse {
  success: boolean;
  message: string;
  transfer?: TransferResponse;
  error?: string;
  errorCode?: string;
}

export interface TransferValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

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

export interface TransferStats {
  total: number;
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  low: number;
  averageCompletionTime?: number;
  completionRate?: number;
}

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

export interface TransferSortOptions {
  field: 'requestedDate' | 'scheduledDate' | 'priority' | 'status' | 'patientName';
  direction: 'asc' | 'desc';
}

export interface TransferQueryOptions {
  filter?: TransferFilterOptions;
  sort?: TransferSortOptions;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface TransferNotificationData {
  id: string;
  type: string;
  priority: 'low' | 'urgent';
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
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export type TransferStatusType = keyof typeof TransferStatus;
export type TransferPriorityType = keyof typeof TransferPriority;
export type TransferTypeType = keyof typeof TransferType;
export type UserRoleType = keyof typeof UserRole;


