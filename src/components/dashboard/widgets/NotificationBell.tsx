"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  showToasts?: boolean;
  showPanel?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function NotificationBell({
  showToasts = false,
  showPanel = false,
  position = "top-right",
}: NotificationBellProps) {
  const { user } = useSession();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const unreadCount = 0;

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
          title={`Notifications`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* No realtime UI for now */}
      </div>
    </>
  );
}
