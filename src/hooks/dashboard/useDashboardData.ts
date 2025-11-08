import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { dashboardClient } from '@/lib/client';
import { DashboardData } from '@/lib/client';

/**
 * useDashboardData Hook
 * 
 * Thin React hook that manages dashboard data state and delegates business logic to DashboardClient.
 * Follows Clean Architecture by separating UI concerns from business logic.
 */
export function useDashboardData() {
  const { user } = useSession();
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalPending: 0,
      totalAccepted: 0,
      totalInProgress: 0,
      totalCompleted: 0,
      totalUrgent: 0,
      scheduledToday: 0,
      averageProcessingTime: "0h",
      successRate: 0,
    },
    urgentTransfers: [],
    recentActivity: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!user) {
      console.log('🔄 Dashboard: No user, skipping fetch');
      return;
    }
    
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🚀 Dashboard: Starting data fetch...');
      const result = await dashboardClient.fetchDashboardData(user.userType, user._id);
      
      setData({ ...result, loading: false, error: null });
      console.log('✅ Dashboard: Data fetch completed successfully');
      
    } catch (error) {
      console.error('❌ Dashboard: Data fetch failed:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' 
      }));
    }
  }, [user]);

  // Realtime removed: no listeners; future realtime can be reintroduced cleanly

  // Initial data fetch
  // Middleware protects routes, so if page loads, user should be authenticated
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  return {
    ...data,
    refetch: fetchData,
    isConnected: false,
  };
}