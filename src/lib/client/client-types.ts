/**
 * Shared Client Types
 * 
 * Common types used across client-side services.
 */

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'admin' | 'super_admin' | 'manager' | 'employee';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface Message {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export interface FieldErrors {
  [field: string]: string[];
}

export interface FetchOptions {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'up' | 'down';
    api: 'up' | 'down';
    auth: 'up' | 'down';
  };
  uptime: number;
  lastCheck: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: 'up' | 'down';
    api: 'up' | 'down';
    auth: 'up' | 'down';
  };
  uptime: number;
  lastCheck: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface DashboardStats {
  totalPending: number;
  totalAccepted: number;
  totalInProgress: number;
  totalCompleted: number;
  totalUrgent: number;
  scheduledToday: number;
  averageProcessingTime: string;
  successRate: number;
}

export interface UrgentTransfer {
  id: string;
  transferId: string;
  patientName: string;
  fromHospital: string;
  toHospital: string;
  priority: 'urgent' | 'stat';
  requestedTime: string;
  reason: string;
  timeElapsed: string;
}

export interface ActivityItem {
  id: string;
  type: 'transfer_accepted' | 'transfer_completed' | 'transfer_requested' | 'transfer_cancelled' | 'document_uploaded';
  transferId: string;
  patientName: string;
  description: string;
  timestamp: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  fromHospital?: string;
  toHospital?: string;
  user?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  urgentTransfers: UrgentTransfer[];
  recentActivity: ActivityItem[];
  loading: boolean;
  error: string | null;
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

// Notification interface preserved for future implementation
export interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

export interface UserProfile {
  user: User;
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

// Re-export commonly used types
export type { ApiResponse, ApiClientOptions, RequestOptions } from './api-client';
