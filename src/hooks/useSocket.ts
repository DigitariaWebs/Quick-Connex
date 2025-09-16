"use client";

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  token?: string;
  userId?: string;
  userType?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

export function useSocket({
  token,
  userId,
  userType,
  autoConnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 1000,
}: UseSocketOptions): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!token || !userId || socket?.connected) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // We'll handle reconnection manually
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      
      // Attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < reconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay * reconnectAttemptsRef.current);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'Socket error occurred');
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setError(null);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const emit = (event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  useEffect(() => {
    if (autoConnect && token && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, userId, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    connected,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}
