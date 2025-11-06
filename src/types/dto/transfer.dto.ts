/**
 * Transfer DTO Types
 * 
 * Data Transfer Objects for transfer-related API requests and responses.
 */

import { 
  PatientInfo, 
  UserInfo, 
  SchedulingConfig, 
  StatusHistoryEntry,
  TransferPriority,
  TransferStatus
} from '../transfers/transfer.types';

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

// NOTE: TransferNotificationData has been moved to domain types
// Import from '@/types/transfers/transfer.types' instead

