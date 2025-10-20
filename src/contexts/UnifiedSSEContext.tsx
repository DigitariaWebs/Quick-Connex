"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { sseClient } from "@/lib/sse";
import type { SSEMessage, ConnectionState } from "@/lib/sse/original/SSETypes";

/**
 * Unified SSE Context
 *
 * This is the new simplified SSE context that uses the unified client manager.
 * It replaces the old SSEContext with a cleaner, more efficient implementation.
 */

interface UnifiedSSEContextType {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: SSEMessage | null;
  connectionQuality: ConnectionState["connectionQuality"];
  retryCount: number;
  subscribers: number;
  connectionState: ConnectionState;
}

const UnifiedSSEContext = createContext<UnifiedSSEContextType | null>(null);

export function UnifiedSSEProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useSession();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionState["connectionQuality"]>("critical");
  const [retryCount, setRetryCount] = useState(0);
  const [subscribers, setSubscribers] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
    reconnectAttempts: 0,
    connectionQuality: "critical",
    subscribers: 0,
  });

  // Set user in unified client manager when user changes
  useEffect(() => {
    if (user && isAuthenticated) {
      // Connect to SSE with user information
      sseClient.connect(user._id, user.userType);
    } else {
      // Disconnect from SSE
      sseClient.disconnect();
    }
  }, [user, isAuthenticated]);

  // Subscribe to unified SSE client (only once for the entire app)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // If user is not authenticated, ensure SSE is disconnected
      setConnected(false);
      setConnecting(false);
      setConnectionQuality("critical");
      setError("Disconnected");
      setLastMessage(null);
      return;
    }

    // Subscribe to unified SSE client
    const unsubscribe = sseClient.subscribe(
      "unified-sse-context",
      (message: SSEMessage) => {
        setLastMessage(message);
      }
    );

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      const state = sseClient.getConnectionState();

      setConnected(state.connected);
      setConnecting(false); // Simplified for now
      setSubscribers(state.subscribers);
      setRetryCount(state.retryCount);
      setConnectionQuality("good"); // Simplified for now
      setConnectionState({
        ...state,
        status: state.connected ? "connected" : "disconnected",
        reconnectAttempts: state.retryCount,
        connectionQuality: "good",
      });

      // Set error state
      if (!state.connected) {
        setError("Disconnected");
      } else {
        setError(null);
      }
    }, 2000); // Check every 2 seconds (reduced from 1 second)

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [isAuthenticated, user]);

  const contextValue: UnifiedSSEContextType = {
    connected,
    connecting,
    error,
    lastMessage,
    connectionQuality,
    retryCount,
    subscribers,
    connectionState,
  };

  return (
    <UnifiedSSEContext.Provider value={contextValue}>
      {children}
    </UnifiedSSEContext.Provider>
  );
}

export function useUnifiedSSE(): UnifiedSSEContextType {
  const context = useContext(UnifiedSSEContext);
  if (!context) {
    throw new Error("useUnifiedSSE must be used within a UnifiedSSEProvider");
  }
  return context;
}

// Export the context for direct access if needed
export { UnifiedSSEContext };
