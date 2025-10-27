"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useNotifications } from "@/hooks/realtime";
import { Bell, Settings } from "lucide-react";
import NotificationPanel from "@/components/realtime/NotificationPanel";

interface NotificationBellProps {
  showToasts?: boolean;
  showPanel?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function NotificationBell({
  showToasts = true,
  showPanel = false,
  position = "top-right",
}: NotificationBellProps) {
  const { user } = useSession();
  const { isConnected, connectionError } = useRealtime();
  const { notifications, unreadCount, isLoading, error } = useNotifications({
    unreadOnly: false,
    limit: 20,
  });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

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
          title={`Notifications ${
            isConnected ? "(Connected)" : "(Disconnected)"
          }`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {!isConnected && (
            <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-3 w-3"></span>
          )}
        </button>

        {/* Connection Error Tooltip */}
        {connectionError && (
          <div className="absolute top-full left-0 mt-1 bg-red-100 border border-red-300 text-red-700 px-2 py-1 rounded text-xs whitespace-nowrap z-50">
            Connection Error: {connectionError}
          </div>
        )}

        {/* Notification Panel Dropdown */}
        {showNotificationPanel && (
          <NotificationPanel
            notifications={notifications}
            unreadCount={unreadCount}
            isLoading={isLoading}
            error={error}
            onClose={() => setShowNotificationPanel(false)}
            position={position}
          />
        )}
      </div>
    </>
  );
}
