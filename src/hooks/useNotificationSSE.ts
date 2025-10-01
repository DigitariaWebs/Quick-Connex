"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface NotificationData {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  read?: boolean;
}

interface SSEConnectionState {
  connected: boolean;
  error: string | null;
  lastMessage: NotificationData | null;
}

interface UseNotificationSSEReturn {
  connected: boolean;
  error: string | null;
  lastMessage: NotificationData | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useNotificationSSE(): UseNotificationSSEReturn {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<SSEConnectionState>({
    connected: false,
    error: null,
    lastMessage: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connect = useCallback(() => {
    console.log('useNotificationSSE: Attempting to connect', { user: !!user, isAuthenticated, hasEventSource: !!eventSourceRef.current });
    
    if (!user || !isAuthenticated || eventSourceRef.current) return;

    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        (eventSourceRef.current as EventSource).close();
        eventSourceRef.current = null;
      }

      const eventSource = new EventSource('/api/notifications/sse', {
        withCredentials: true
      });

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setState(prev => ({
          ...prev,
          connected: true,
          error: null
        }));
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'connection') {
            console.log('SSE connection confirmed:', data);
          } else if (data.type === 'heartbeat') {
            // Just acknowledge heartbeat, don't update state
            return;
          } else {
            // This is a notification
            setState(prev => ({
              ...prev,
              lastMessage: data
            }));
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost'
        }));

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
          setState(prev => ({
            ...prev,
            error: 'Failed to reconnect after multiple attempts'
          }));
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        error: 'Failed to create connection'
      }));
    }
  }, [user, isAuthenticated]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState({
      connected: false,
      error: null,
      lastMessage: null
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect when user is authenticated
  useEffect(() => {
    console.log('useNotificationSSE: useEffect triggered', { user: !!user, isAuthenticated, hasEventSource: !!eventSourceRef.current });
    
    if (user && isAuthenticated) {
      console.log('useNotificationSSE: Attempting to connect...');
      connect();
    } else {
      console.log('useNotificationSSE: Not connecting - missing user or not authenticated');
    }

    return () => {
      console.log('useNotificationSSE: Cleanup - disconnecting');
      disconnect();
    };
  }, [user, isAuthenticated, connect, disconnect]);

  // Handle page visibility changes (refresh, tab switch, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isAuthenticated) {
        console.log('Page became visible, reconnecting SSE...');
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isAuthenticated, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected: state.connected,
    error: state.error,
    lastMessage: state.lastMessage,
    reconnect,
    disconnect
  };
}
