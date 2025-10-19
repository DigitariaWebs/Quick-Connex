import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DashboardStats, 
  DashboardError, 
  DashboardLoadingState 
} from '@/types/dashboard';
import { useUnifiedSSE } from '@/contexts/UnifiedSSEContext';
import { unifiedSSEClient } from '@/lib/sse/unified-client-manager';

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
  const { connected } = useUnifiedSSE();
  const pendingActiveUsers = useRef<number | null>(null); // Store SSE updates that arrive early
  const lastSSEUpdate = useRef<number>(0); // Timestamp of last SSE update

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
        let finalData = result.data;
        const apiTimestamp = Date.now();
        
        // Priority 1: Apply pending SSE updates that arrived before initial load
        if (pendingActiveUsers.current !== null) {
          console.log('📊 Dashboard: Applying pending activeUsers update:', pendingActiveUsers.current);
          finalData = {
            ...finalData,
            activeUsers: pendingActiveUsers.current
          };
          pendingActiveUsers.current = null;
        } 
        // Priority 2: If we have a recent SSE update (within last 5 seconds), prefer it over API
        else if (lastSSEUpdate.current > 0 && (apiTimestamp - lastSSEUpdate.current) < 5000 && data) {
          console.log('📊 Dashboard: Using recent SSE activeUsers instead of API data:', data.activeUsers);
          finalData = {
            ...finalData,
            activeUsers: data.activeUsers
          };
        }
        
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

  /**
   * Set up real-time SSE connection for live updates using unified SSE system
   */
  useEffect(() => {
    if (!connected) {
      console.log('📊 Dashboard: SSE not connected, skipping subscription');
      return;
    }

    // Subscribe to dashboard updates using unified SSE system
    const handleDashboardUpdate = (eventData: any) => {
      try {
        // Handle dashboard updates (real-time active users count)
        if (eventData.type === 'dashboard_update' && eventData.data) {
          const newActiveUsers = eventData.data.activeUsers;
          lastSSEUpdate.current = Date.now(); // Track when we received this update
          
          console.log('📊 Dashboard: Real-time SSE update received - Active users:', newActiveUsers);
          
          setData(prev => {
            // If data hasn't loaded yet, store the update for later
            if (!prev) {
              console.log('📊 Dashboard: Data not loaded yet, storing pending update');
              pendingActiveUsers.current = newActiveUsers;
              return prev;
            }
            
            // Update active users count in real-time
            console.log('📊 Dashboard: Updating activeUsers from', prev.activeUsers, 'to', newActiveUsers);
            return {
              ...prev,
              activeUsers: newActiveUsers,
              timestamp: eventData.data.timestamp
            };
          });
        }
      } catch (err) {
        console.error('📊 Dashboard: Error parsing SSE event:', err);
      }
    };

    // Subscribe to dashboard updates using unifiedSSEClient
    const unsubscribe = unifiedSSEClient.subscribe(
      'dashboard-update',
      handleDashboardUpdate,
      'high' // High priority for dashboard updates
    );

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [connected]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchDashboardStats(false);
  }, [fetchDashboardStats]);

  /**
   * Set up polling for real-time updates
   * Note: activeUsers is prioritized from SSE if recent update exists
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

