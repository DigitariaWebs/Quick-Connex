"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { globalSSEManager } from "@/lib/notifications/global-sse-manager";

interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  userId?: string;
  userType?: string;
  timestamp?: string;
}

interface SSEContextType {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastMessage: SSEMessage | null;
  connectionQuality: "excellent" | "good" | "poor" | "disconnected";
  retryCount: number;
  subscribers: number;
}

const SSEContext = createContext<SSEContextType | null>(null);

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<
    "excellent" | "good" | "poor" | "disconnected"
  >("disconnected");
  const [retryCount, setRetryCount] = useState(0);
  const [subscribers, setSubscribers] = useState(0);

  // Set user in global manager when user changes
  useEffect(() => {
    if (user && isAuthenticated) {
      globalSSEManager.setUser(user);
    } else {
      // Clear user and disconnect when not authenticated
      globalSSEManager.clearUser();
    }
  }, [user, isAuthenticated]);

  // Subscribe to global SSE manager (only once for the entire app)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // If user is not authenticated, ensure SSE is disconnected
      console.log("🔗 SSE Context: User not authenticated, disconnecting SSE");
      globalSSEManager.disconnect();
      setConnected(false);
      setConnecting(false);
      setConnectionQuality("disconnected");
      setError("Disconnected");
      setLastMessage(null);
      return;
    }

    console.log("🔗 SSE Context: Subscribing to global SSE manager", {
      userId: user._id,
    });

    const unsubscribe = globalSSEManager.subscribe(
      "app-context",
      (message: SSEMessage) => {
        console.log("📨 SSE Context: Message received", {
          messageType: message.type,
        });
        setLastMessage(message);
      }
    );

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      const status = globalSSEManager.getConnectionStatus();
      setConnected(status.isConnected);
      setConnecting(status.isConnecting);
      setSubscribers(status.subscribers);
      setRetryCount(status.reconnectAttempts);

      // Determine connection quality
      if (status.isConnected) {
        const timeSinceLastMessage = Date.now() - status.lastSuccessfulMessage;
        if (timeSinceLastMessage < 30000) {
          setConnectionQuality("excellent");
        } else if (timeSinceLastMessage < 60000) {
          setConnectionQuality("good");
        } else {
          setConnectionQuality("poor");
        }
        setError(null);
      } else if (status.isConnecting) {
        setConnectionQuality("disconnected");
        setError("Connecting...");
      } else {
        setConnectionQuality("disconnected");
        setError("Disconnected");
      }
    }, 1000);

    return () => {
      console.log("🔗 SSE Context: Unsubscribing from global SSE manager");
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [isAuthenticated, user]);

  const contextValue: SSEContextType = {
    connected,
    connecting,
    error,
    lastMessage,
    connectionQuality,
    retryCount,
    subscribers,
  };

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
}

export function useSSE(): SSEContextType {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSE must be used within an SSEProvider");
  }
  return context;
}
