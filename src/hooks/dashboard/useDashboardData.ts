import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { dashboardClient } from '@/lib/client';
import { DashboardData } from '@/lib/client';
import { SOCKET_EVENTS } from '@/lib/realtime/core/constants';

/**
 * useDashboardData Hook
 * 
 * Thin React hook that manages dashboard data state and delegates business logic to DashboardClient.
 * Follows Clean Architecture by separating UI concerns from business logic.
 */
export function useDashboardData() {
  const { user, isAuthenticated } = useSession();
  const { isConnected, emitEvent } = useRealtime();
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
    if (!isAuthenticated || !user) {
      console.log('🔄 Dashboard: No user or not authenticated, skipping fetch');
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
  }, [isAuthenticated, user]);

  // Real-time update handlers
  const handleStatsUpdate = useCallback((statsData: any) => {
    console.log('📊 Dashboard stats updated via real-time:', statsData);
    setData(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        ...statsData
      }
    }));
  }, []);

  const handleActivityUpdate = useCallback((activityData: any) => {
    console.log('📈 Dashboard activity updated via real-time:', activityData);
    setData(prev => ({
      ...prev,
      recentActivity: [activityData, ...prev.recentActivity].slice(0, 10) // Keep last 10 activities
    }));
  }, []);

  const handleUrgentAlert = useCallback((alertData: any) => {
    console.log('🚨 Urgent transfer alert:', alertData);
    setData(prev => ({
      ...prev,
      urgentTransfers: [alertData, ...prev.urgentTransfers].slice(0, 5) // Keep last 5 urgent transfers
    }));
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!isConnected || !user) return;

    console.log('🔌 Setting up dashboard real-time listeners');

    // Listen for dashboard updates
    const handleDashboardStatsUpdate = (event: any) => {
      handleStatsUpdate(event.stats);
    };

    const handleDashboardActivityNew = (event: any) => {
      handleActivityUpdate(event.activity);
    };

    const handleDashboardUrgentAlert = (event: any) => {
      handleUrgentAlert(event.transfer);
    };

    // Register event listeners
    emitEvent('dashboard:subscribe', { userId: user._id });

    // Return cleanup function
    return () => {
      console.log('🔌 Cleaning up dashboard real-time listeners');
      emitEvent('dashboard:unsubscribe', { userId: user._id });
    };
  }, [isConnected, user, emitEvent, handleStatsUpdate, handleActivityUpdate, handleUrgentAlert]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    }
  }, [isAuthenticated, user, fetchData]);

  return {
    ...data,
    refetch: fetchData,
    isConnected,
  };
}