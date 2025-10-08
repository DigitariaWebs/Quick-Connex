import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { useSSE } from '@/contexts/SSEContext';

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

interface RecentActivityData {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
}

export function useRecentActivity(maxItems: number = 5) {
  const { user, isAuthenticated } = useAuth();
  const { lastMessage } = useSSE();
  const [data, setData] = useState<RecentActivityData>({
    activities: [],
    loading: true,
    error: null,
  });

  const fetchRecentActivity = async (showLoading = false) => {
    if (!isAuthenticated || !user) return;

    try {
      setData(prev => ({ ...prev, loading: showLoading, error: null }));

      // Fetch user profile with recent activity
      const response = await fetch('/api/users/profile', {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.success && !data.recentActivity) {
        throw new Error('Failed to fetch recent activity');
      }

      // Transform profile activity data to our format
      const activities: ActivityItem[] = (data.recentActivity || []).map((activity: any) => {
        // Determine activity type based on status
        let type: ActivityItem['type'] = 'transfer_requested';
        if (activity.status === 'success') {
          type = 'transfer_completed';
        } else if (activity.status === 'warning') {
          type = 'transfer_cancelled';
        }

        // Use structured data from API if available, otherwise fallback to title parsing
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
          id: activity.id,
          type,
          transferId: activity.transferId || activity.id,
          patientName,
          description: activity.description,
          timestamp: formatTimestamp(activity.date),
          priority: activity.status === 'success' ? 'low' : activity.status === 'warning' ? 'high' : 'medium',
          fromHospital: activity.fromHospital,
          toHospital: activity.toHospital,
          user: user.userType === 'manager' ? 'You' : 'System',
        };
      });

      setData({
        activities: activities.slice(0, maxItems),
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recent activity',
      }));
    }
  };

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Handle SSE messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'activity_update') {
        // Update recent activity from SSE
        setData(prev => ({
          ...prev,
          activities: lastMessage.data?.activities || prev.activities
        }));
      } else if (lastMessage.type === 'transfer_status_change' || 
                 lastMessage.type === 'new_transfer') {
        // Add new activity item for transfer events
        const newActivity: ActivityItem = {
          id: lastMessage.data?.id || `activity_${Date.now()}`,
          type: lastMessage.type === 'new_transfer' ? 'transfer_requested' : 'transfer_accepted',
          transferId: lastMessage.data?.transferId || '',
          patientName: lastMessage.data?.transfer?.patient?.name || lastMessage.data?.patientName || 'Unknown Patient',
          description: lastMessage.message || lastMessage.data?.message || 'Activity update',
          timestamp: lastMessage.timestamp || new Date().toISOString(),
          user: lastMessage.data?.changedBy?.name || 'System',
          // transfer: lastMessage.data?.transfer // Removed - not in ActivityItem interface
        };
        
        setData(prev => ({
          ...prev,
          activities: [newActivity, ...prev.activities].slice(0, maxItems)
        }));
      }
    }
  }, [lastMessage, maxItems]);

  useEffect(() => {
    // Initial load with loading state
    fetchRecentActivity(true);
  }, [isAuthenticated, user, maxItems]);

  return {
    ...data,
    refetch: fetchRecentActivity,
  };
}
