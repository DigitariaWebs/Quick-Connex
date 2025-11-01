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
import {
  isSupported as swIsSupported,
  getExistingSubscription,
  subscribePush as swSubscribePush,
  unregisterSubscriptionWithServer,
  registerSubscriptionWithServer,
} from "@/lib/sw/registrar";

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
  const socketRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const recentToastKeysRef = useRef<Map<string, number>>(new Map());
  const maxConcurrentToastsRef = useRef<number>(4);

  // ===== SOCKET CONNECTION =====

  const connect = useCallback(async () => {
    // No-op: Ably EventBus handles connection; flags set on start/stop
    return;
  }, [isAuthenticated, user, isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    socketRef.current = null;

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
      log.info("Scheduling reconnection attempt", {
        attempt: reconnectAttemptsRef.current,
        delay,
        userId: user?._id,
      });

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
      if (typeof window === "undefined") return false;
      if (!swIsSupported()) return false;

      // Respect user gesture; assume caller invoked from UI
      let permission: NotificationPermission =
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default";
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      setPushPermission(permission);
      if (permission !== "granted") return false;

      // Get VAPID key from API, fallback to env public key
      let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as
        | string
        | undefined;
      try {
        const res = await fetch("/api/realtime/token/public-key");
        if (res.ok) {
          const data = await res.json();
          if (data?.publicKey) publicKey = data.publicKey as string;
        }
      } catch {}
      if (!publicKey) return false;

      const subscription = await swSubscribePush(publicKey);
      if (!subscription) return false;

      const ok = await registerSubscriptionWithServer(subscription);
      if (!ok) return false;

      setIsPushSubscribed(true);
      setIsPushSupported(true);
      setPushPermission("granted");
      return true;
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return false;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    try {
      const existing = await getExistingSubscription();
      if (existing) {
        try {
          await unregisterSubscriptionWithServer(existing);
        } catch {}
        await existing.unsubscribe();
      }
      setIsPushSubscribed(false);
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      return false;
    }
  }, []);

  // ===== TOAST METHODS =====

  const showToast = useCallback((notification: NotificationAPI) => {
    const keyParts = [
      notification.type,
      (notification as any)?.data?.transferId || notification.id,
    ];
    const key = keyParts.join(":");
    const now = Date.now();
    const windowMs = notification.priority === "urgent" ? 3000 : 10000;

    // Dedupe within a short window by key
    const last = recentToastKeysRef.current.get(key) || 0;
    if (now - last < windowMs) {
      return;
    }
    recentToastKeysRef.current.set(key, now);

    // Trim map
    if (recentToastKeysRef.current.size > 200) {
      const entries = Array.from(recentToastKeysRef.current.entries()).sort(
        (a, b) => a[1] - b[1]
      );
      for (let i = 0; i < entries.length - 100; i++) {
        recentToastKeysRef.current.delete(entries[i][0]);
      }
    }

    const duration = notification.priority === "urgent" ? 10000 : 5000;

    setToasts((prev) => {
      // Limit concurrent toasts
      const next = [...prev];
      if (next.length >= maxConcurrentToastsRef.current) {
        next.shift();
      }
      next.push({
        id: `toast-${now}`,
        notification,
        duration,
        position: "top-right",
      });
      return next;
    });

    setTimeout(() => {
      setToasts((prev) =>
        prev.filter((t) => now.toString() !== t.id.replace("toast-", ""))
      );
    }, duration);
  }, []);

  const hideToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  // ===== UTILITY METHODS =====

  const emitEvent = useCallback((event: any, payload: any) => {}, []);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  // ===== EFFECTS =====

  // Initialize push manager and check support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = swIsSupported();
      setIsPushSupported(supported);
      setPushPermission(
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default"
      );
      if (!supported) return;
      getExistingSubscription()
        .then((s) => {
          setIsPushSubscribed(
            !!s &&
              (typeof Notification === "undefined" ||
                Notification.permission === "granted")
          );
        })
        .catch(() => {});
    }
  }, []);

  // Update app badge when unread count changes
  useEffect(() => {
    try {
      const n = unreadCount;
      const nav = navigator as any;
      if (nav.setAppBadge) {
        if (n > 0) nav.setAppBadge(n);
        else nav.clearAppBadge();
      }
    } catch {}
  }, [unreadCount]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, user, connect, disconnect]);

  // Centralized EventBus subscription
  useEffect(() => {
    let bus: any;
    async function start() {
      try {
        const { EventBus } = await import("@/lib/realtime/client/EventBus");
        const { createTransfersHandler } = await import(
          "@/lib/realtime/client/handlers/transfersHandler"
        );
        bus = new EventBus();
        bus.register(
          createTransfersHandler((envelope) => {
            showToast({
              id: envelope.id,
              type: NOTIFICATION_TYPES.TRANSFER_CREATED,
              priority: "high" as any,
              title: "New transfer created",
              message: `Transfer ${envelope.entityId} created`,
              targetUsers: [],
              targetRoles: [],
              excludeUsers: [],
              deliveries: [],
              settings: {
                channels: ["realtime"],
                persistent: false,
                requireAcknowledgment: false,
              },
              status: "delivered" as any,
              deliveryAttempts: 0,
              createdBy: envelope.actorId || "system",
              createdByType: 0 as any,
              createdAt: new Date(envelope.ts),
              updatedAt: new Date(envelope.ts),
            });
          })
        );
        await bus.start();
      } catch (e) {
        console.error("Failed to start EventBus", e);
      }
    }
    if (isAuthenticated && user) start();
    return () => {
      if (bus) bus.stop();
    };
  }, [isAuthenticated, user, showToast]);

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
