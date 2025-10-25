"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { Bell } from "lucide-react";

interface NotificationIntegrationProps {
  showToasts?: boolean;
  showPanel?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function NotificationIntegration({
  showToasts = true,
  showPanel = false,
  position = "top-right",
}: NotificationIntegrationProps) {
  const { user } = useSession();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          "/api/notifications?status=unread&limit=1",
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (data.success) {
          setUnreadCount(data.data.summary.unread);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <button
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel Dropdown */}
        {showNotificationPanel && (
          <div
            className={`absolute z-50 w-96 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 ${
              position === "top-right"
                ? "top-12 right-0"
                : position === "top-left"
                ? "top-12 left-0"
                : position === "bottom-right"
                ? "bottom-12 right-0"
                : "bottom-12 left-0"
            }`}
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotificationPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-4">
              <p className="text-gray-500 text-center">
                Real-time notifications are currently unavailable.
                <br />
                Please refresh the page to see new notifications.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
