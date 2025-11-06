/**
 * Dashboard DTO Types
 * 
 * Data Transfer Objects for dashboard-related API responses.
 */

import { DashboardStats, SSEStats, RecentActivity } from '../dashboard/dashboard.types';

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
  message?: string;
}

export interface SSEStatsResponse {
  success: boolean;
  data: SSEStats;
  message?: string;
}

export interface RecentActivityResponse {
  success: boolean;
  data: {
    activities: RecentActivity[];
    total: number;
    page: number;
    limit: number;
  };
  message?: string;
}

