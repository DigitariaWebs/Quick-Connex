/**
 * Real-time Hooks
 * 
 * Custom React hooks for managing real-time notifications and updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { useSession } from '@/contexts/SessionContext';
import { 
  NotificationAPI,
  SocketEventType,
  NotificationType,
  NotificationPriority,
  NotificationPreferences
} from '@/lib/realtime/core/types';
import { log } from '@/lib/logging';

// ===== USE NOTIFICATIONS HOOK =====

export function useNotifications(options: {
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
} = {}) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAsDismissed,
    clearAllNotifications 
  } = useRealtime();
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter notifications based on options
  const filteredNotifications = notifications.filter(notification => {
    if (options.unreadOnly) {
      const delivery = notification.deliveries.find(d => d.userId === user?._id);
      return !delivery?.readAt;
    }
    
    if (options.type && notification.type !== options.type) {
      return false;
    }
    
    if (options.priority && notification.priority !== options.priority) {
      return false;
    }
    
    return true;
  }).slice(0, options.limit || 50);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.unreadOnly) params.append('unreadOnly', 'true');
      if (options.type) params.append('type', options.type);
      if (options.priority) params.append('priority', options.priority);
      if (options.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/realtime/notifications?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        // Notifications are managed by the context, so we don't need to update state here
        console.log('Notifications fetched:', data.data);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [markAsRead]);

  // Mark notification as dismissed
  const handleMarkAsDismissed = useCallback(async (notificationId: string) => {
    try {
      await markAsDismissed(notificationId);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [markAsDismissed]);

  // Clear all notifications
  const handleClearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [clearAllNotifications]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications: filteredNotifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: handleMarkAsRead,
    markAsDismissed: handleMarkAsDismissed,
    clearAll: handleClearAll,
    refetch: fetchNotifications
  };
}

// ===== USE REALTIME UPDATES HOOK =====

export function useRealtimeUpdates() {
  const { isConnected, emitEvent } = useRealtime();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Listen for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const handleUpdate = () => {
      setLastUpdate(new Date());
      setUpdateCount(prev => prev + 1);
    };

    // This would be expanded to listen for specific update events
    // For now, we'll just track connection status changes
    handleUpdate();

  }, [isConnected]);

  // Emit custom event
  const emitCustomEvent = useCallback((event: SocketEventType, payload: any) => {
    emitEvent(event, payload);
  }, [emitEvent]);

  return {
    isConnected,
    lastUpdate,
    updateCount,
    emitEvent: emitCustomEvent
  };
}

// ===== USE WEB PUSH HOOK =====

export function useWebPush() {
  const { 
    isPushSupported, 
    isPushSubscribed, 
    pushPermission,
    subscribeToPush,
    unsubscribeFromPush 
  } = useRealtime();
  const { user } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user || !isPushSupported) {
      setError('Push notifications not supported');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const success = await subscribeToPush();
      return success;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isPushSupported, subscribeToPush]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const success = await unsubscribeFromPush();
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, unsubscribeFromPush]);

  // Test push notification
  const testNotification = useCallback(async () => {
    if (!isPushSupported || pushPermission !== 'granted') {
      setError('Push notifications not available');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/realtime/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test_notification',
          targetUsers: [user?._id],
          message: 'Test push notification'
        })
      });

      if (response.ok) {
        return true;
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Failed to test push notification:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isPushSupported, pushPermission, user]);

  return {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    permission: pushPermission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    testNotification
  };
}

// ===== USE SOCKET CONNECTION HOOK =====

export function useSocketConnection() {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    connect, 
    disconnect, 
    clearError 
  } = useRealtime();
  const { isAuthenticated } = useSession();

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && !isConnected && !isConnecting) {
      connect();
    }
  }, [isAuthenticated, isConnected, isConnecting, connect]);

  // Manual connection controls
  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    isConnected,
    isConnecting,
    error: connectionError,
    connect: handleConnect,
    disconnect: handleDisconnect,
    clearError: handleClearError
  };
}

// ===== USE NOTIFICATION PREFERENCES HOOK =====

export function useNotificationPreferences() {
  const { user } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // This would fetch from an API endpoint
      // For now, we'll use default preferences
      const defaultPreferences: NotificationPreferences = {
        userId: user._id,
        channels: {
          realtime: true,
          email: true,
          sms: false,
          push: true
        },
        types: {
          transfer_created: true,
          transfer_updated: true,
          transfer_assigned: true,
          transfer_completed: true,
          transfer_cancelled: true,
          transfer_urgent: true,
          user_approved: true,
          user_rejected: true,
          user_suspended: true,
          system_announcement: true,
          system_maintenance: true,
          system_alert: true
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      };

      setPreferences(defaultPreferences);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save preferences
  const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // This would save to an API endpoint
      // For now, we'll just update local state
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    savePreferences,
    refetch: loadPreferences
  };
}
