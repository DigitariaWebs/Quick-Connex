"use client";

import { useState, useEffect } from "react";
import { useNotificationSSE } from "@/hooks/useNotificationSSE";
import NotificationPopup from "./NotificationPopup";

interface NotificationData {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
}

interface NotificationPopupManagerProps {
  maxNotifications?: number;
  autoHide?: boolean;
  hideDelay?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  enableSound?: boolean;
  soundFile?: string;
}

export default function NotificationPopupManager({
  maxNotifications = 5,
  autoHide = true,
  hideDelay = 5000,
  position = "top-right",
  enableSound = true,
  soundFile = "/notification-sound.mp3",
}: NotificationPopupManagerProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { connected, lastMessage } = useNotificationSSE();

  // Initialize audio
  useEffect(() => {
    if (enableSound && typeof window !== "undefined") {
      const audioElement = new Audio(soundFile);
      audioElement.volume = 0.3;
      audioElement.preload = "auto";
      setAudio(audioElement);
    }
  }, [enableSound, soundFile]);

  // Handle SSE messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log("NotificationPopupManager received message:", lastMessage);

    // Filter for notification types that should show popups
    const shouldShowPopup = [
      "transfer_status_change",
      "new_transfer",
      "urgent_transfer",
      "transfer_reminder",
      "test_notification",
    ].includes(lastMessage.type);

    console.log(
      "Should show popup:",
      shouldShowPopup,
      "for type:",
      lastMessage.type
    );

    if (shouldShowPopup) {
      const notification: NotificationData = {
        id: lastMessage.id,
        type: lastMessage.type,
        priority: lastMessage.priority as "high" | "medium" | "low",
        title: lastMessage.title,
        message: lastMessage.message,
        transferId: lastMessage.transferId,
        data: lastMessage.data,
        timestamp: lastMessage.timestamp,
      };

      // Add notification to list
      setNotifications((prev) => {
        const newNotifications = [notification, ...prev].slice(
          0,
          maxNotifications
        );
        return newNotifications;
      });

      // Play sound for high priority notifications
      if (
        audio &&
        (lastMessage.priority === "high" ||
          lastMessage.type === "urgent_transfer")
      ) {
        audio.play().catch(console.error);
      }
    }
  }, [lastMessage, maxNotifications, audio]);

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "top-4 right-4";
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-2`}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: 50 - index,
          }}
        >
          <NotificationPopup
            {...notification}
            onClose={() => removeNotification(notification.id)}
            autoHide={autoHide}
            hideDelay={hideDelay}
          />
        </div>
      ))}
    </div>
  );
}
