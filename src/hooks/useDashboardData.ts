import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNotificationSSE } from './useNotificationSSE';

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

export function useDashboardData() {
  const { user, isAuthenticated } = useAuth();
  const { lastMessage } = useNotificationSSE();
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

  const fetchDashboardData = async (showLoading = false) => {
    if (!isAuthenticated || !user) return;

    try {
      setData(prev => ({ ...prev, loading: showLoading, error: null }));

      // Fetch transfers data
      const transfersResponse = await fetch('/api/transfers?status=all', {
        credentials: 'include',
      });
      const transfersData = await transfersResponse.json();

      // Fetch notifications for urgent alerts
      const notificationsResponse = await fetch('/api/notifications?priority=high&limit=10', {
        credentials: 'include',
      });
      const notificationsData = await notificationsResponse.json();

      // Fetch user profile with stats
      const profileResponse = await fetch('/api/users/profile', {
        credentials: 'include',
      });
      const profileData = await profileResponse.json();

      if (!transfersData.success || !notificationsData.success || !profileData.stats) {
        throw new Error('Failed to fetch dashboard data');
      }

      const transfers = transfersData.data.transfers || [];
      
      // Calculate stats
      const stats: DashboardStats = {
        totalPending: transfers.filter((t: any) => t.status === 'pending').length,
        totalAccepted: transfers.filter((t: any) => t.status === 'accepted').length,
        totalInProgress: transfers.filter((t: any) => t.status === 'in_progress').length,
        totalCompleted: transfers.filter((t: any) => t.status === 'completed').length,
        totalUrgent: transfers.filter((t: any) => t.priority === 'urgent' || t.priority === 'stat').length,
        scheduledToday: transfers.filter((t: any) => {
          const today = new Date();
          const scheduledDate = new Date(t.scheduledDate);
          return scheduledDate.toDateString() === today.toDateString();
        }).length,
        averageProcessingTime: profileData.stats.averageCompletionTime 
          ? `${Math.round(profileData.stats.averageCompletionTime / 60)}h` 
          : "0h",
        successRate: profileData.stats.successRate || 0,
      };

      // Get urgent transfers (STAT and urgent priority)
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
            patientName: `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`,
            fromHospital: transfer.fromHospitalName,
            toHospital: transfer.toHospitalName,
            priority: transfer.priority === 'stat' ? 'stat' : 'urgent',
            requestedTime: requestedTime.toISOString(),
            reason: transfer.reason,
            timeElapsed: timeElapsed < 60 ? `${timeElapsed} min` : `${Math.floor(timeElapsed / 60)}h`,
          };
        });

      // Get recent activity from profile data
      const recentActivity: ActivityItem[] = (profileData.recentActivity || []).map((activity: any) => ({
        id: activity.id,
        type: activity.type === 'transfer_request' ? 'transfer_requested' : 'transfer_completed',
        transferId: activity.id,
        patientName: activity.title.split(': ')[1] || 'Unknown Patient',
        description: activity.description,
        timestamp: activity.date,
        priority: activity.status === 'success' ? 'low' : activity.status === 'warning' ? 'high' : 'medium',
        user: user.userType === 'manager' ? 'You' : 'System',
      }));

      setData({
        stats,
        urgentTransfers,
        recentActivity,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      }));
    }
  };

  // Handle SSE messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'dashboard_update') {
        // Update dashboard data from SSE
        setData(prev => ({
          ...prev,
          stats: lastMessage.data?.stats || prev.stats,
          urgentTransfers: lastMessage.data?.urgentTransfers || prev.urgentTransfers,
          recentActivity: lastMessage.data?.recentActivity || prev.recentActivity
        }));
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    // Initial load with loading state
    fetchDashboardData(true);
  }, [isAuthenticated, user]);

  return {
    ...data,
    refetch: fetchDashboardData,
  };
}
