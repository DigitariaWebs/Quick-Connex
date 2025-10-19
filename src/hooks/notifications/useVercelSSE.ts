/**
 * Vercel SSE Hook
 * 
 * React hook for Vercel-compatible SSE notifications.
 * Uses polling instead of server-side state management.
 */

import { useState, useEffect, useCallback } from 'react';
import { vercelSSEClient, VercelSSEClient } from '@/lib/sse/VercelSSEClient';
import { TransferNotification } from '@/lib/sse/VercelNotificationService';

export interface VercelSSEState {
  connected: boolean;
  userId: string | null;
  userType: string | null;
  retryCount: number;
  subscribers: number;
  lastNotification: TransferNotification | null;
  error: string | null;
}

export function useVercelSSE(userId?: string, userType?: string) {
  const [state, setState] = useState<VercelSSEState>({
    connected: false,
    userId: null,
    userType: null,
    retryCount: 0,
    subscribers: 0,
    lastNotification: null,
    error: null
  });

  // Connect to SSE
  const connect = useCallback(async (userId: string, userType: string) => {
    try {
      const result = await vercelSSEClient.connect(userId, userType);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          connected: true,
          userId,
          userType,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Connection failed'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection error'
      }));
    }
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    vercelSSEClient.disconnect();
    setState(prev => ({
      ...prev,
      connected: false,
      userId: null,
      userType: null,
      error: null
    }));
  }, []);

  // Subscribe to notifications
  const subscribe = useCallback((
    id: string,
    callback: (notification: TransferNotification) => void
  ) => {
    return vercelSSEClient.subscribe(id, callback);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await vercelSSEClient.markAsRead(notificationId);
      return result;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { success: false, error: 'Failed to mark as read' };
    }
  }, []);

  // Get notification statistics
  const getStats = useCallback(async () => {
    try {
      return await vercelSSEClient.getNotificationStats();
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return null;
    }
  }, []);

  // Auto-connect when user data is provided
  useEffect(() => {
    if (userId && userType && !state.connected) {
      connect(userId, userType);
    }
  }, [userId, userType, state.connected, connect]);

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const connectionState = vercelSSEClient.getConnectionState();
      setState(prev => ({
        ...prev,
        connected: connectionState.connected,
        userId: connectionState.userId,
        userType: connectionState.userType,
        retryCount: connectionState.retryCount,
        subscribers: connectionState.subscribers
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to notifications
  useEffect(() => {
    if (!state.connected) return;

    const unsubscribe = subscribe('vercel-sse-hook', (notification) => {
      setState(prev => ({
        ...prev,
        lastNotification: notification,
        error: null
      }));
    });

    return unsubscribe;
  }, [state.connected, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      vercelSSEClient.cleanup();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    subscribe,
    markAsRead,
    getStats
  };
}
