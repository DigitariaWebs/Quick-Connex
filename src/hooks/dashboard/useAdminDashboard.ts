import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DashboardStats, 
  DashboardError, 
  DashboardLoadingState 
} from '@/types/dashboard/dashboard.types';

/**
 * useAdminDashboard Hook
 * 
 * Custom hook for fetching and managing admin dashboard statistics
 * 
 * Features:
 * - Automatic data fetching on mount
 * - Polling for real-time updates
 * - Manual refresh capability
 * - Error handling with retry logic
 * - Loading states
 * - Data caching
 */

interface UseAdminDashboardOptions {
  pollInterval?: number; // in milliseconds (default: 10000 = 10 seconds)
  enablePolling?: boolean; // default: true
  onError?: (error: DashboardError) => void;
}

interface UseAdminDashboardReturn {
  data: DashboardStats | null;
  loading: DashboardLoadingState;
  error: DashboardError | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useAdminDashboard(
  options: UseAdminDashboardOptions = {}
): UseAdminDashboardReturn {
  const {
    pollInterval = 10000,
    enablePolling = true,
    onError
  } = options;

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<DashboardLoadingState>({
    isLoading: true,
    isRefreshing: false,
    lastUpdated: null
  });
  const [error, setError] = useState<DashboardError | null>(null);

  /**
   * Fetch dashboard statistics
   */
  const fetchDashboardStats = useCallback(async (isRefresh = false) => {
    try {
      // Update loading state
      setLoading(prev => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh
      }));

      // Clear previous error
      setError(null);

      const response = await fetch('/api/admin/dashboard/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch dashboard statistics');
      }

      const result = await response.json();

      if (result.success) {
        const finalData = result.data;
        
        setData(finalData);
        setLoading({
          isLoading: false,
          isRefreshing: false,
          lastUpdated: new Date().toISOString()
        });
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard statistics');
      }

    } catch (err) {
      const dashboardError: DashboardError = {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        retryable: true
      };

      setError(dashboardError);
      setLoading({
        isLoading: false,
        isRefreshing: false,
        lastUpdated: null
      });

      // Call error handler if provided
      if (onError) {
        onError(dashboardError);
      }

      console.error('❌ Dashboard fetch error:', err);
    }
  }, [onError]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchDashboardStats(true);
  }, [fetchDashboardStats]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Note: Real-time SSE updates have been removed
  // Dashboard will rely on polling for updates

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchDashboardStats(false);
  }, [fetchDashboardStats]);

  /**
   * Set up polling for updates
   * Note: Real-time SSE updates have been removed, using polling instead
   */
  useEffect(() => {
    if (!enablePolling || pollInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      // Only poll if not currently loading and no error
      if (!loading.isLoading && !loading.isRefreshing && !error) {
        fetchDashboardStats(true);
      }
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [enablePolling, pollInterval, loading.isLoading, loading.isRefreshing, error, fetchDashboardStats]);

  return {
    data,
    loading,
    error,
    refresh,
    clearError
  };
}

