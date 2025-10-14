"use client";

import { useState, useEffect, useCallback } from "react";
import { useSSE } from "@/contexts/SSEContext";
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
      dossierNumber?: string;
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
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false);

  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Create a beep sound using Web Audio API
  const createBeepSound = useCallback(() => {
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2); // 200ms beep

      console.log("🔊 Beep sound played successfully");
    } catch (error) {
      console.log("🔊 Error creating beep sound:", error);
    }
  }, [audioContext]);

  // Initialize audio and request permission
  useEffect(() => {
    console.log(
      "🔊 Initializing audio - soundEnabled:",
      soundEnabled,
      "soundFile:",
      soundFile
    );

    if (typeof window !== "undefined" && soundEnabled) {
      // Initialize Web Audio API instead of using broken audio file
      const initAudioContext = async () => {
        try {
          console.log("🔊 Initializing Web Audio API...");
          const context = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          setAudioContext(context);

          // Resume audio context if it's suspended
          if (context.state === "suspended") {
            await context.resume();
          }

          setAudioPermissionGranted(true);
          console.log("🔊 Web Audio API initialized successfully");
        } catch (error) {
          console.log("🔊 Web Audio API initialization failed:", error);
          setAudioPermissionGranted(false);
        }
      };

      // Try to initialize audio context immediately
      initAudioContext();
    } else {
      console.log(
        "🔊 Audio initialization skipped - window:",
        typeof window !== "undefined",
        "soundEnabled:",
        soundEnabled
      );
    }
  }, [soundEnabled, soundFile]);

  // Request audio permission on user interaction
  const requestAudioPermission = useCallback(async () => {
    if (!audioPermissionGranted) {
      try {
        console.log("🔊 Requesting audio permission after user interaction...");

        if (!audioContext) {
          const context = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          setAudioContext(context);
        }

        // Resume audio context if it's suspended
        if (audioContext && audioContext.state === "suspended") {
          await audioContext.resume();
        }

        setAudioPermissionGranted(true);
        console.log("🔊 Audio permission granted after user interaction");
      } catch (error) {
        console.log("🔊 Audio permission denied:", error);
        setSoundEnabled(false);
      }
    }
  }, [audioContext, audioPermissionGranted]);

  const { connected, error, lastMessage } = useSSE();

  // Play notification sound
  const playSound = useCallback(async () => {
    console.log(
      "🔊 playSound called - soundEnabled:",
      soundEnabled,
      "audioContext:",
      !!audioContext,
      "audioPermissionGranted:",
      audioPermissionGranted
    );

    if (soundEnabled) {
      if (audioPermissionGranted && audioContext) {
        try {
          console.log("🔊 Attempting to play beep sound...");
          createBeepSound();
          console.log("🔊 Beep sound played successfully!");
        } catch (error) {
          console.log("🔊 Beep sound failed:", error);
          // If playback fails, try to request permission again
          setAudioPermissionGranted(false);
        }
      } else {
        console.log(
          "🔊 Audio permission not granted, attempting to request..."
        );
        await requestAudioPermission();
        // Try to play again after requesting permission
        if (audioPermissionGranted && audioContext) {
          try {
            console.log(
              "🔊 Attempting to play beep sound after permission request..."
            );
            createBeepSound();
            console.log(
              "🔊 Beep sound played successfully after permission request!"
            );
          } catch (error) {
            console.log(
              "🔊 Beep sound still failed after permission request:",
              error
            );
          }
        }
      }
    } else {
      console.log("🔊 Cannot play sound - soundEnabled:", soundEnabled);
    }
  }, [
    soundEnabled,
    audioContext,
    audioPermissionGranted,
    requestAudioPermission,
    createBeepSound,
  ]);

  // Add notification to toasts
  const addToastNotification = useCallback(
    (notification: RealtimeNotification) => {
      setToastNotifications((prev) => {
        const newToasts = [notification, ...prev].slice(0, maxToasts);
        return newToasts;
      });

      // Play sound for all notifications (for testing)
      console.log(
        "🔊 Attempting to play sound for notification:",
        notification.type,
        "priority:",
        notification.priority
      );
      playSound();
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

  // Handle SSE messages
  useEffect(() => {
    if (!lastMessage) return;

    const handleNotification = (notification: RealtimeNotification) => {
      console.log("Received notification via SSE:", notification);

      if (showToasts) {
        addToastNotification(notification);
      }

      // Play sound for all notifications (for testing)
      console.log(
        "🔊 Attempting to play sound for SSE notification:",
        notification.type,
        "priority:",
        notification.priority
      );
      playSound();
    };

    // Handle different notification types
    if (
      lastMessage.type === "transfer_status_change" ||
      lastMessage.type === "new_transfer" ||
      lastMessage.type === "urgent_transfer" ||
      lastMessage.type === "transfer_reminder"
    ) {
      handleNotification(lastMessage as RealtimeNotification);
    }
  }, [lastMessage, showToasts, addToastNotification, playSound]);

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
