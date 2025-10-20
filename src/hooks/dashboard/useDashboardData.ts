import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/useAuth';

interface DashboardStats {
  totalPending: number;
  totalAccepted: number;
  totalInProgress: number;
  totalCompleted: number;
  totalUrgent: number;
  scheduledToday: number;
  averageProcessingTime: string;
  successRate: number;
}

interface UrgentTransfer {
  id: string;
  transferId: string;
  patientName: string;
  fromHospital: string;
  toHospital: string;
  priority: "urgent" | "stat";
  requestedTime: string;
  reason: string;
  timeElapsed: string;
}

interface ActivityItem {
  id: string;
  type: "transfer_accepted" | "transfer_completed" | "transfer_requested" | "transfer_cancelled" | "document_uploaded";
  transferId: string;
  patientName: string;
  description: string;
  timestamp: string;
  priority?: "low" | "medium" | "high" | "urgent";
  fromHospital?: string;
  toHospital?: string;
  user?: string;
}

interface DashboardData {
  stats: DashboardStats;
  urgentTransfers: UrgentTransfer[];
  recentActivity: ActivityItem[];
  loading: boolean;
  error: string | null;
}

const formatTimestamp = (dateString: string): string => {
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
};

const calculateTimeElapsed = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) return `${diffInMinutes} min`;
  if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d`;
  }
};

// Default fallback data
const getDefaultStats = (): DashboardStats => ({
  totalPending: 0,
  totalAccepted: 0,
  totalInProgress: 0,
  totalCompleted: 0,
  totalUrgent: 0,
  scheduledToday: 0,
  averageProcessingTime: "0h",
  successRate: 0,
});

const getDefaultUrgentTransfers = (): UrgentTransfer[] => [];
const getDefaultRecentActivity = (): ActivityItem[] => [];

export function useDashboardData() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<DashboardData>({
    stats: getDefaultStats(),
    urgentTransfers: getDefaultUrgentTransfers(),
    recentActivity: getDefaultRecentActivity(),
    loading: true,
    error: null,
  });

  // Refs for preventing multiple simultaneous calls
  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Individual API call functions with error handling
  const fetchTransfers = useCallback(async (fetchId: string) => {
    try {
      console.log(`📊 Dashboard [${fetchId}]: Fetching transfers...`);
      const response = await fetch('/api/transfers?status=all', {
        credentials: 'include',
        headers: {
          'X-Request-Source': 'useDashboardData-hook',
          'X-Request-ID': fetchId,
          'X-Request-Type': 'transfers'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Transfers API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Dashboard [${fetchId}]: Transfers fetched successfully`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Dashboard [${fetchId}]: Transfers fetch failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: { transfers: [] } };
    }
  }, []);

  const fetchNotifications = useCallback(async (fetchId: string) => {
    try {
      console.log(`🔔 Dashboard [${fetchId}]: Fetching notifications...`);
      const response = await fetch('/api/notifications?priority=high&limit=10', {
        credentials: 'include',
        headers: {
          'X-Request-Source': 'useDashboardData-hook',
          'X-Request-ID': fetchId,
          'X-Request-Type': 'notifications'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Notifications API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Dashboard [${fetchId}]: Notifications fetched successfully`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Dashboard [${fetchId}]: Notifications fetch failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: { notifications: [] } };
    }
  }, []);

  const fetchProfile = useCallback(async (fetchId: string) => {
    try {
      console.log(`👤 Dashboard [${fetchId}]: Fetching profile...`);
      const response = await fetch('/api/users/profile', {
        credentials: 'include',
        headers: {
          'X-Request-Source': 'useDashboardData-hook',
          'X-Request-ID': fetchId,
          'X-Request-Type': 'profile'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Dashboard [${fetchId}]: Profile API returned 404 - using fallback data`);
          return { success: false, error: 'Profile not found', data: { stats: getDefaultStats(), recentActivity: [] } };
        }
        throw new Error(`Profile API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Dashboard [${fetchId}]: Profile fetched successfully`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Dashboard [${fetchId}]: Profile fetch failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: { stats: getDefaultStats(), recentActivity: [] } };
    }
  }, []);

  const fetchDashboardData = useCallback(async (showLoading = false) => {
    const now = Date.now();
    const fetchId = `fetch_${now}`;
    
    console.log('🔍 Dashboard: fetchDashboardData called', {
      isAuthenticated,
      hasUser: !!user,
      isFetching: isFetchingRef.current,
      showLoading,
      timestamp: new Date().toISOString(),
      timeSinceLastFetch: now - lastFetchRef.current
    });
    
    if (!isAuthenticated || !user) {
      console.log('🔄 Dashboard: No user or not authenticated, skipping fetch');
      return;
    }
    
    // Prevent multiple simultaneous API calls
    if (isFetchingRef.current) {
      console.log('🔄 Dashboard: Already fetching data, skipping...', {
        pathname: window.location.pathname,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Prevent rapid successive calls (debounce)
    if (now - lastFetchRef.current < 1000) {
      console.log('🔄 Dashboard: Too soon since last fetch, skipping...', {
        timeSinceLastFetch: now - lastFetchRef.current
      });
      return;
    }

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the fetch call
    fetchTimeoutRef.current = setTimeout(async () => {
      console.log(`🚀 Dashboard [${fetchId}]: Starting data fetch...`);
      isFetchingRef.current = true;
      lastFetchRef.current = now;
      
      try {
        setData(prev => ({ ...prev, loading: showLoading, error: null }));

        // Fetch all APIs in parallel with individual error handling
        const [transfersResult, notificationsResult, profileResult] = await Promise.allSettled([
          fetchTransfers(fetchId),
          fetchNotifications(fetchId),
          fetchProfile(fetchId)
        ]);

        // Process results with fallbacks
        const transfersData = transfersResult.status === 'fulfilled' ? transfersResult.value : { success: false, data: { transfers: [] } };
        const notificationsData = notificationsResult.status === 'fulfilled' ? notificationsResult.value : { success: false, data: { notifications: [] } };
        const profileData = profileResult.status === 'fulfilled' ? profileResult.value : { success: false, data: { stats: getDefaultStats(), recentActivity: [] } };

        // Log results
        console.log(`📊 Dashboard [${fetchId}]: API Results:`, {
          transfers: transfersData.success ? '✅' : '❌',
          notifications: notificationsData.success ? '✅' : '❌',
          profile: profileData.success ? '✅' : '❌'
        });

        const transfers = transfersData.data?.transfers || [];
        const notifications = notificationsData.data?.notifications || [];
        const profileStats = profileData.data?.stats || getDefaultStats();
        const recentActivity = profileData.data?.recentActivity || [];

        // Calculate stats with fallbacks
        const stats: DashboardStats = {
          totalPending: transfers.filter((t: any) => t.status === 'pending').length,
          totalAccepted: user.userType === 'employee' 
            ? transfers.filter((t: any) => t.status === 'in_progress' && t.assignedTo?._id === user._id).length
            : transfers.filter((t: any) => t.status === 'accepted').length,
          totalInProgress: transfers.filter((t: any) => t.status === 'in_progress').length,
          totalCompleted: transfers.filter((t: any) => t.status === 'completed').length,
          totalUrgent: transfers.filter((t: any) => t.priority === 'urgent' || t.priority === 'stat').length,
          scheduledToday: transfers.filter((t: any) => {
            const today = new Date();
            const scheduledDate = t.scheduledDate ? new Date(t.scheduledDate) : null;
            return scheduledDate && scheduledDate.toDateString() === today.toDateString();
          }).length,
          averageProcessingTime: profileStats.averageCompletionTime 
            ? `${Math.round(profileStats.averageCompletionTime / 60)}h` 
            : "0h",
          successRate: profileStats.successRate || 0,
        };

        // Get urgent transfers with fallback
        const urgentTransfers: UrgentTransfer[] = transfers
          .filter((t: any) => t.priority === 'urgent' || t.priority === 'stat')
          .slice(0, 5)
          .map((transfer: any) => {
            const requestedTime = new Date(transfer.requestedDate);
            const now = new Date();
            const timeElapsed = Math.floor((now.getTime() - requestedTime.getTime()) / (1000 * 60));
            
            return {
              id: transfer._id,
              transferId: transfer.transferId,
              patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
              fromHospital: transfer.fromHospitalName,
              toHospital: transfer.toHospitalName,
              priority: transfer.priority === 'stat' ? 'stat' : 'urgent',
              requestedTime: requestedTime.toISOString(),
              reason: transfer.reason,
              timeElapsed: timeElapsed < 60 ? `${timeElapsed} min` : `${Math.floor(timeElapsed / 60)}h`,
            };
          });

        // Process recent activity with fallback
        const processedRecentActivity: ActivityItem[] = recentActivity.map((activity: any) => {
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
            timestamp: formatTimestamp(activity.date || activity.createdAt || new Date().toISOString()),
            priority: activity.priority || 'medium',
            fromHospital: activity.fromHospital,
            toHospital: activity.toHospital,
            user: activity.user || 'System',
          };
        });

        // Update state with processed data
        setData(prev => ({
          ...prev,
          stats,
          urgentTransfers,
          recentActivity: processedRecentActivity,
          loading: false,
          error: null,
        }));

        console.log(`✅ Dashboard [${fetchId}]: Data processing completed successfully`);

      } catch (error) {
        console.error(`❌ Dashboard [${fetchId}]: Data processing failed:`, error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        }));
      } finally {
        console.log(`✅ Dashboard [${fetchId}]: Data fetch completed`);
        isFetchingRef.current = false;
      }
    }, 100); // 100ms debounce
  }, [isAuthenticated, user, fetchTransfers, fetchNotifications, fetchProfile]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData(true);
    }
  }, [isAuthenticated, user, fetchDashboardData]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...data,
    refetch: fetchDashboardData,
  };
}