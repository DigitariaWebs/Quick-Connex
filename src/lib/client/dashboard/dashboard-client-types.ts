/**
 * Dashboard Client Types
 * 
 * Types specific to dashboard client operations.
 */

import { 
  DashboardStats, 
  UrgentTransfer, 
  ActivityItem, 
  DashboardData, 
  SystemHealth,
  Notification,
  UserProfile,
  FetchOptions,
  PaginatedResult
} from '../client-types';

export interface DashboardClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export interface Transfer {
  _id: string;
  transferId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'stat';
  patientInfo: {
    firstName: string;
    lastName: string;
  };
  fromHospitalName: string;
  toHospitalName: string;
  requestedDate: string;
  scheduledDate?: string;
  reason: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}


export interface TransferFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SystemHealthOptions {
  pollInterval?: number;
  enablePolling?: boolean;
}

export interface DashboardClientResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface DashboardStatsResult extends DashboardClientResult<DashboardStats> {}
export interface UrgentTransfersResult extends DashboardClientResult<UrgentTransfer[]> {}
export interface RecentActivityResult extends DashboardClientResult<ActivityItem[]> {}
export interface SystemHealthResult extends DashboardClientResult<SystemHealth> {
  isHealthy: boolean;
  isDegraded: boolean;
  isDown: boolean;
  lastCheck: string | null;
  refresh: () => Promise<void>;
}

export interface DashboardDataResult extends DashboardClientResult<DashboardData> {
  stats: DashboardStats;
  urgentTransfers: UrgentTransfer[];
  recentActivity: ActivityItem[];
}

// Utility types for data transformation
export interface ProcessedTransfer extends Transfer {
  timeElapsed: string;
  patientName: string;
}

export interface ProcessedActivity extends ActivityItem {
  formattedTimestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

