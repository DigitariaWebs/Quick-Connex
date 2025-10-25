/**
 * Dashboard Client Service
 * 
 * Client-side dashboard service that handles all dashboard-related API calls
 * and data transformation logic. Extracted from hooks to follow Clean Architecture.
 */

import { ApiClient, ApiError } from '../api-client';
import {
  DashboardStats,
  UrgentTransfer,
  ActivityItem,
  DashboardData,
  SystemHealth,
  UserProfile,
  Transfer,
  FetchOptions,
  PaginatedResult,
} from '../client-types';
import {
  DashboardClientOptions,
  TransferFilters,
  ProcessedTransfer,
  ProcessedActivity,
} from './dashboard-client-types';

export class DashboardClient {
  private apiClient: ApiClient;

  constructor(options: DashboardClientOptions = {}) {
    this.apiClient = new ApiClient({
      baseURL: options.baseURL || '',
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
    });
  }

  /**
   * Fetch transfers with optional filters
   */
  async fetchTransfers(filters: TransferFilters = {}): Promise<Transfer[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }

      const queryString = params.toString();
      const url = `/api/transfers${queryString ? `?${queryString}` : ''}`;
      
      const result = await this.apiClient.get<{ transfers: Transfer[] }>(url);
      return result.transfers || [];
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      return [];
    }
  }


  /**
   * Fetch user profile
   */
  async fetchProfile(): Promise<UserProfile> {
    try {
      const result = await this.apiClient.get<UserProfile>('/api/users/profile');
      return result;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch profile',
        500
      );
    }
  }

  /**
   * Fetch system health status
   */
  async fetchSystemHealth(): Promise<SystemHealth> {
    try {
      const result = await this.apiClient.get<{ systemHealth: SystemHealth }>('/api/admin/dashboard/stats');
      return result.systemHealth;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch system health',
        500
      );
    }
  }

  /**
   * Calculate dashboard stats from transfers
   */
  calculateStats(transfers: Transfer[], userType?: string, userId?: string): DashboardStats {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const stats: DashboardStats = {
      totalPending: transfers.filter(t => t.status === 'pending').length,
      totalAccepted: userType === 'employee' 
        ? transfers.filter(t => t.status === 'in_progress' && t.assignedTo?._id === userId).length
        : transfers.filter(t => t.status === 'accepted').length,
      totalInProgress: transfers.filter(t => t.status === 'in_progress').length,
      totalCompleted: transfers.filter(t => t.status === 'completed').length,
      totalUrgent: transfers.filter(t => t.priority === 'urgent' || t.priority === 'stat').length,
      scheduledToday: transfers.filter(t => {
        if (!t.scheduledDate) return false;
        const scheduledDate = new Date(t.scheduledDate);
        return scheduledDate.toDateString() === today.toDateString();
      }).length,
      averageProcessingTime: "0h", // This would need to be calculated from historical data
      successRate: 0, // This would need to be calculated from historical data
    };

    return stats;
  }

  /**
   * Get urgent transfers from transfer list
   */
  getUrgentTransfers(transfers: Transfer[]): UrgentTransfer[] {
    return transfers
      .filter(t => t.priority === 'urgent' || t.priority === 'stat')
      .slice(0, 5)
      .map(transfer => {
        const requestedTime = new Date(transfer.requestedDate);
        const now = new Date();
        const timeElapsed = Math.floor((now.getTime() - requestedTime.getTime()) / (1000 * 60));
        
        return {
          id: transfer._id,
          transferId: transfer.transferId,
          patientName: transfer.patientInfo 
            ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` 
            : 'Unknown Patient',
          fromHospital: transfer.fromHospitalName,
          toHospital: transfer.toHospitalName,
          priority: transfer.priority === 'stat' ? 'stat' : 'urgent',
          requestedTime: requestedTime.toISOString(),
          reason: transfer.reason,
          timeElapsed: timeElapsed < 60 ? `${timeElapsed} min` : `${Math.floor(timeElapsed / 60)}h`,
        };
      });
  }

  /**
   * Process recent activity from raw data
   */
  processRecentActivity(activities: any[]): ActivityItem[] {
    return activities.map(activity => {
      const patientName = activity.patientName || (() => {
        if (activity.title) {
          const titleParts = activity.title.split(': ');
          if (titleParts.length > 1) {
            return titleParts[1].trim();
          } else if (activity.title.includes('Transfer')) {
            const nameMatch = activity.title.match(/(?:Transfer Request|Assigned Transfer)\s+(.+)/);
            if (nameMatch && nameMatch[1]) {
              return nameMatch[1].trim();
            }
          }
        }
        return 'Unknown Patient';
      })();

      return {
        id: activity.id || activity._id || `activity_${Date.now()}`,
        type: activity.type || 'transfer_requested',
        transferId: activity.transferId || activity.id || 'unknown',
        patientName,
        description: activity.description || activity.title || 'Transfer activity',
        timestamp: this.formatTimestamp(activity.date || activity.createdAt || new Date().toISOString()),
        priority: activity.priority || 'medium',
        fromHospital: activity.fromHospital,
        toHospital: activity.toHospital,
        user: activity.user || 'System',
      };
    });
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Fetch complete dashboard data
   */
  async fetchDashboardData(userType?: string, userId?: string): Promise<DashboardData> {
    try {
      // Fetch all data in parallel
      const [transfersResult, profileResult] = await Promise.allSettled([
        this.fetchTransfers({ status: 'all' }),
        this.fetchProfile().catch(() => ({ stats: this.getDefaultStats(), recentActivity: [] }))
      ]);

      // Process results with fallbacks
      const transfers = transfersResult.status === 'fulfilled' ? transfersResult.value : [];
      const profile = profileResult.status === 'fulfilled' ? profileResult.value : { stats: this.getDefaultStats(), recentActivity: [] };

      // Calculate stats
      const stats = this.calculateStats(transfers, userType, userId);
      const urgentTransfers = this.getUrgentTransfers(transfers);
      const recentActivity = this.processRecentActivity(profile.recentActivity || []);

      return {
        stats,
        urgentTransfers,
        recentActivity,
        loading: false,
        error: null,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      return {
        stats: this.getDefaultStats(),
        urgentTransfers: [],
        recentActivity: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      };
    }
  }

  /**
   * Get default stats for fallback
   */
  private getDefaultStats(): DashboardStats {
    return {
      totalPending: 0,
      totalAccepted: 0,
      totalInProgress: 0,
      totalCompleted: 0,
      totalUrgent: 0,
      scheduledToday: 0,
      averageProcessingTime: "0h",
      successRate: 0,
    };
  }

  /**
   * Fetch admin dashboard data
   */
  async fetchAdminDashboardData(): Promise<any> {
    try {
      const result = await this.apiClient.get('/api/admin/dashboard/stats');
      return result;
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch admin dashboard data',
        500
      );
    }
  }

  /**
   * Fetch recent activity
   */
  async fetchRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    try {
      const result = await this.apiClient.get<{ activities: any[] }>(`/api/activity/recent?limit=${limit}`);
      return this.processRecentActivity(result.activities || []);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  }

}

// Default instance
export const dashboardClient = new DashboardClient();
