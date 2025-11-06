/**
 * Transfer Service Types
 * 
 * Service layer types for transfer operations (validation, permissions, queries).
 */

import { TransferStatus, TransferPriority } from '@/lib/transfers/core/constants';

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

