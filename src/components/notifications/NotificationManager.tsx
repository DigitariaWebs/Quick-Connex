"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import RealtimeNotifications from "./RealtimeNotifications";
import NotificationToast from "./NotificationToast";

interface RealtimeNotification {
  id: string;
  type:
    | "transfer_status_change"
    | "new_transfer"
    | "urgent_transfer"
    | "transfer_reminder";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  transferId: string;
  transfer?: {
    id: string;
    transferId: string;
    patient?: {
      firstName: string;
      lastName: string;
    };
    fromHospital?: string;
    toHospital?: string;
    status?: string;
    oldStatus?: string;
    priority?: string;
    scheduledDate?: string;
  };
  changedBy?: {
    id: string;
    name: string;
    userType: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    userType: string;
  };
  timestamp: string;
  read: boolean;
}

interface NotificationManagerProps {
  userId?: string;
  userType?: string;
  token?: string;
  showToasts?: boolean;
  showPanel?: boolean;
  maxToasts?: number;
  toastAutoHide?: boolean;
  toastHideDelay?: number;
  enableSound?: boolean;
  soundFile?: string;
}

export default function NotificationManager({
  userId,
  userType,
  token,
  showToasts = true,
  showPanel = true,
  maxToasts = 3,
  toastAutoHide = true,
  toastHideDelay = 5000,
  enableSound = true,
  soundFile = "/notification-sound.mp3",
}: NotificationManagerProps) {
  const [toastNotifications, setToastNotifications] = useState<
    RealtimeNotification[]
  >([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set()
  );
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  const audioRef = useState<HTMLAudioElement | null>(null)[0];

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined" && soundEnabled) {
      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      audio.preload = "auto";
      setAudioRef(audio);
    }
  }, [soundEnabled, soundFile]);

  const setAudioRef = (audio: HTMLAudioElement) => {
    // This is a workaround for the useState hook
    (audioRef as any) = audio;
  };

  const { socket, connected, error, on, off } = useSocket({
    token,
    userId,
    userType,
    autoConnect: true,
  });

  // Play notification sound
  const playSound = useCallback(() => {
    if (soundEnabled && audioRef) {
      audioRef.play().catch(console.error);
    }
  }, [soundEnabled, audioRef]);

  // Add notification to toasts
  const addToastNotification = useCallback(
    (notification: RealtimeNotification) => {
      setToastNotifications((prev) => {
        const newToasts = [notification, ...prev].slice(0, maxToasts);
        return newToasts;
      });

      // Play sound for high priority notifications
      if (notification.priority === "high") {
        playSound();
      }
    },
    [maxToasts, playSound]
  );

  // Remove toast notification
  const removeToastNotification = useCallback((notificationId: string) => {
    setToastNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setReadNotifications((prev) => new Set([...prev, notificationId]));
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !connected) return;

    const handleTransferStatusChange = (notification: RealtimeNotification) => {
      console.log(
        "Received transfer status change notification:",
        notification
      );
      if (showToasts) {
        addToastNotification(notification);
      }
    };

    const handleNewTransfer = (notification: RealtimeNotification) => {
      console.log("Received new transfer notification:", notification);
      if (showToasts) {
        addToastNotification(notification);
      }
    };

    const handleUrgentTransfer = (notification: RealtimeNotification) => {
      console.log("Received urgent transfer notification:", notification);
      if (showToasts) {
        addToastNotification(notification);
      }
      // Always play sound for urgent transfers
      playSound();
    };

    const handleTransferReminder = (notification: RealtimeNotification) => {
      console.log("Received transfer reminder:", notification);
      if (showToasts) {
        addToastNotification(notification);
      }
    };

    // Register event listeners
    on("transfer_status_change", handleTransferStatusChange);
    on("new_transfer", handleNewTransfer);
    on("urgent_transfer", handleUrgentTransfer);
    on("transfer_reminder", handleTransferReminder);

    // Cleanup event listeners
    return () => {
      off("transfer_status_change", handleTransferStatusChange);
      off("new_transfer", handleNewTransfer);
      off("urgent_transfer", handleUrgentTransfer);
      off("transfer_reminder", handleTransferReminder);
    };
  }, [socket, connected, showToasts, addToastNotification, playSound, on, off]);

  // Join transfer rooms when socket connects
  useEffect(() => {
    if (socket && connected) {
      // You can add logic here to join specific transfer rooms
      // based on user's current context or active transfers
      console.log("Socket connected, ready to receive notifications");
    }
  }, [socket, connected]);

  // Clear old toast notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setToastNotifications((prev) => {
        const now = new Date();
        return prev.filter((notification) => {
          const notificationTime = new Date(notification.timestamp);
          const diffInMinutes =
            (now.getTime() - notificationTime.getTime()) / (1000 * 60);
          return diffInMinutes < 10; // Keep notifications for 10 minutes
        });
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Toast Notifications */}
      {showToasts && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toastNotifications.map((notification) => (
            <NotificationToast
              key={notification.id}
              {...notification}
              onDismiss={removeToastNotification}
              onMarkAsRead={markNotificationAsRead}
              autoHide={toastAutoHide}
              hideDelay={toastHideDelay}
              showDetails={true}
            />
          ))}
        </div>
      )}

      {/* Main Notifications Panel */}
      {showPanel && (
        <RealtimeNotifications
          userId={userId}
          userType={userType}
          token={token}
          maxNotifications={20}
          autoHide={false}
          showSettings={true}
        />
      )}
    </>
  );
}
