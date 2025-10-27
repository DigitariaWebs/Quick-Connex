"use client";

/**
 * Realtime Context
 *
 * React context for managing real-time notifications and Socket.io connections.
 * Provides global state management for notifications, Web Push, and socket events.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "@/contexts/SessionContext";
import { ActorType } from "@/models/AuditLog";
import { toStringId } from "@/lib/realtime/utils/converters";
import { log } from "@/lib/logging";
import {
  NotificationAPI,
  SocketEventType,
  NotificationToast,
  NotificationPreferences,
  WebPushSubscription,
} from "@/lib/realtime/core/types";
import {
  SOCKET_EVENTS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "@/lib/realtime/core/constants";
import { REALTIME_CONFIG } from "@/lib/realtime/core/config";

// ===== CONTEXT TYPES =====

export interface RealtimeContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Notifications
  notifications: NotificationAPI[];
  unreadCount: number;

  // Web Push
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;

  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  emitEvent: (event: SocketEventType, payload: any) => void;

  // Notification methods
  markAsRead: (notificationId: string) => Promise<void>;
  markAsDismissed: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Web Push methods
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;

  // Toast methods
  showToast: (notification: NotificationAPI) => void;
  hideToast: (toastId: string) => void;

  // Utility methods
  clearError: () => void;
}

// ===== CONTEXT =====

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

// ===== PROVIDER =====

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useSession();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationAPI[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Web Push
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");

  // Toasts
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // ===== SOCKET CONNECTION =====

  const connect = useCallback(async () => {
    if (!isAuthenticated || !user || isConnecting || isConnected) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Get authentication token
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Create socket connection
      const socket = io(REALTIME_CONFIG.socket.cors.origin as string, {
        path: REALTIME_CONFIG.socket.path,
        transports: REALTIME_CONFIG.socket.transports,
        auth: {
          token: token,
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: REALTIME_CONFIG.socket.pingTimeout,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on("connect", () => {
        console.log("🔌 Socket connected");
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      });

      socket.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason);
        setIsConnected(false);
        setIsConnecting(false);

        // Attempt reconnection for certain disconnect reasons
        if (reason === "io server disconnect") {
          // Server initiated disconnect, don't reconnect
          setConnectionError("Server disconnected");
        } else {
          // Client-side disconnect, attempt reconnection
          scheduleReconnect();
        }
      });

      socket.on("connect_error", (error) => {
        console.error("🔌 Socket connection error:", error);
        setIsConnecting(false);
        setConnectionError(error.message);
        scheduleReconnect();
      });

      // Notification event handlers
      socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (data) => {
        console.log("📨 New notification received:", data);
        handleNewNotification(data.notification);
      });

      socket.on(SOCKET_EVENTS.NOTIFICATION_READ, (data) => {
        console.log("✅ Notification marked as read:", data);
        handleNotificationRead(data.notificationId);
      });

      socket.on(SOCKET_EVENTS.NOTIFICATION_DISMISSED, (data) => {
        console.log("❌ Notification dismissed:", data);
        handleNotificationDismissed(data.notificationId);
      });

      // Transfer event handlers
      socket.on(SOCKET_EVENTS.TRANSFER_CREATED, (data) => {
        console.log("🚚 Transfer created:", data);
        handleTransferEvent("created", data);
      });

      socket.on(SOCKET_EVENTS.TRANSFER_UPDATED, (data) => {
        console.log("🔄 Transfer updated:", data);
        handleTransferEvent("updated", data);
      });

      // Dashboard event handlers
      socket.on(SOCKET_EVENTS.DASHBOARD_STATS_UPDATE, (data) => {
        console.log("📊 Dashboard stats updated:", data);
        handleDashboardUpdate(data);
      });

      // System event handlers
      socket.on(SOCKET_EVENTS.SYSTEM_ANNOUNCEMENT, (data) => {
        console.log("📢 System announcement:", data);
        handleSystemAnnouncement(data);
      });
    } catch (error) {
      console.error("Failed to connect to Socket.io:", error);
      setIsConnecting(false);
      setConnectionError(
        error instanceof Error ? error.message : "Connection failed"
      );
    }
  }, [isAuthenticated, user, isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const maxAttempts = 5;
    const delay = Math.min(
      1000 * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );

    if (reconnectAttemptsRef.current < maxAttempts) {
      reconnectAttemptsRef.current++;
      console.log(
        `🔄 Scheduling reconnection attempt ${reconnectAttemptsRef.current} in ${delay}ms`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated && user) {
          connect();
        }
      }, delay);
    } else {
      console.error("🔌 Max reconnection attempts reached");
      setConnectionError("Connection failed after multiple attempts");
    }
  }, [connect, isAuthenticated, user]);

  // ===== NOTIFICATION HANDLERS =====

  const handleNewNotification = useCallback((notification: NotificationAPI) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Show toast for high priority notifications
    if (
      notification.priority === "high" ||
      notification.priority === "urgent"
    ) {
      showToast(notification);
    }
  }, []);

  const handleNotificationRead = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? {
                ...notif,
                deliveries: notif.deliveries.map((d) =>
                  d.userId === user?._id ? { ...d, readAt: new Date() } : d
                ),
              }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [user]
  );

  const handleNotificationDismissed = useCallback(
    (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? {
                ...notif,
                deliveries: notif.deliveries.map((d) =>
                  d.userId === user?._id ? { ...d, dismissedAt: new Date() } : d
                ),
              }
            : notif
        )
      );
    },
    [user]
  );

  const handleTransferEvent = useCallback((eventType: string, data: any) => {
    // Handle transfer events - this will be expanded in transfer integration
    console.log(`Transfer ${eventType}:`, data);
  }, []);

  const handleDashboardUpdate = useCallback((data: any) => {
    // Handle dashboard updates - this will be expanded in dashboard integration
    console.log("Dashboard update:", data);
  }, []);

  const handleSystemAnnouncement = useCallback((data: any) => {
    // Show system announcements as toasts
    const announcement: NotificationAPI = {
      id: `announcement-${Date.now()}`,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      title: data.title || "System Announcement",
      message: data.message || "A new system announcement is available",
      targetUsers: [],
      targetRoles: [],
      excludeUsers: [],
      deliveries: [],
      settings: {
        persistent: false,
        requireAcknowledgment: false,
        channels: ["realtime"],
      },
      status: "delivered",
      deliveryAttempts: 0,
      createdBy: "system",
      createdByType: ActorType.SYSTEM,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    showToast(announcement);
  }, []);

  // ===== NOTIFICATION METHODS =====

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch("/api/realtime/notifications/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId }),
        });

        if (response.ok) {
          handleNotificationRead(notificationId);
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [handleNotificationRead]
  );

  const markAsDismissed = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch("/api/realtime/notifications/dismiss", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId }),
        });

        if (response.ok) {
          handleNotificationDismissed(notificationId);
        }
      } catch (error) {
        console.error("Failed to dismiss notification:", error);
      }
    },
    [handleNotificationDismissed]
  );

  const clearAllNotifications = useCallback(async () => {
    try {
      // Mark all notifications as read
      for (const notification of notifications) {
        await markAsRead(toStringId(notification.id)!);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }, [notifications, markAsRead]);

  // ===== WEB PUSH METHODS =====

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: Implement push subscription
      // if (!pushManagerRef.current) {
      //   pushManagerRef.current = ClientPushManager.getInstance();
      // }

      // const subscription = await pushManagerRef.current.subscribe(user!._id);

      // if (subscription) {
      //   setIsPushSubscribed(true);
      //   setPushPermission("granted");
      //   return true;
      // }

      return false;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return false;
    }
  }, [user]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: Implement push unsubscription
      // if (!pushManagerRef.current) {
      //   pushManagerRef.current = ClientPushManager.getInstance();
      // }

      // await pushManagerRef.current.unsubscribe(user!._id);
      setIsPushSubscribed(false);
      setPushPermission("denied");
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      return false;
    }
  }, [user]);

  // ===== TOAST METHODS =====

  const showToast = useCallback((notification: NotificationAPI) => {
    const toast: NotificationToast = {
      id: `toast-${Date.now()}`,
      notification,
      duration: notification.priority === "urgent" ? 10000 : 5000,
      position: "top-right",
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-hide toast
    setTimeout(() => {
      hideToast(toast.id);
    }, toast.duration);
  }, []);

  const hideToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  // ===== UTILITY METHODS =====

  const emitEvent = useCallback(
    (event: SocketEventType, payload: any) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit(event, payload);
      }
    },
    [isConnected]
  );

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // ===== EFFECTS =====

  // Initialize push manager and check support
  useEffect(() => {
    if (typeof window !== "undefined") {
      // TODO: Implement push manager initialization
      // pushManagerRef.current = ClientPushManager.getInstance();

      // pushManagerRef.current.getSubscriptionInfo().then((info) => {
      //   setIsPushSupported(info.supported);
      //   setIsPushSubscribed(info.subscribed);
      //   setPushPermission(info.permission);
      // });

      // For now, set basic values
      setIsPushSupported(false);
      setIsPushSubscribed(false);
      setPushPermission("default");
    }
  }, []);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ===== CONTEXT VALUE =====

  const value: RealtimeContextType = {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,

    // Notifications
    notifications,
    unreadCount,

    // Web Push
    isPushSupported,
    isPushSubscribed,
    pushPermission,

    // Methods
    connect,
    disconnect,
    emitEvent,

    // Notification methods
    markAsRead,
    markAsDismissed,
    clearAllNotifications,

    // Web Push methods
    subscribeToPush,
    unsubscribeFromPush,

    // Toast methods
    showToast,
    hideToast,

    // Utility methods
    clearError,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </RealtimeContext.Provider>
  );
}

// ===== TOAST CONTAINER =====

function ToastContainer({
  toasts,
  onHide,
}: {
  toasts: NotificationToast[];
  onHide: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">
                {toast.notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {toast.notification.message}
              </p>
            </div>
            <button
              onClick={() => onHide(toast.id)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== HOOK =====

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
