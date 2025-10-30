"use client";

/**
 * Notification Panel Component
 *
 * Displays a dropdown panel with real-time notifications.
 * Handles notification interactions and real-time updates.
 */

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/realtime";
import {
  NotificationAPI,
  NotificationType,
  NotificationPriority,
} from "@/lib/realtime/core/types";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "@/lib/realtime/core/constants";
import {
  Bell,
  X,
  Check,
  Trash2,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
} from "lucide-react";

interface NotificationPanelProps {
  notifications: NotificationAPI[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  isLoading,
  error,
  onClose,
  position = "top-right",
}: NotificationPanelProps) {
  const { markAsRead, markAsDismissed, clearAll } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | NotificationType>(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | NotificationPriority
  >("all");

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    // Type filter
    if (filter !== "all" && notification.type !== filter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && notification.priority !== priorityFilter) {
      return false;
    }

    // Unread filter
    if ((filter as string) === "unread") {
      const delivery = notification.deliveries.find(
        (d) => d.userId === "current-user"
      );
      return !delivery?.readAt;
    }

    return true;
  });

  // Get notification icon
  const getNotificationIcon = (
    type: NotificationType,
    priority: NotificationPriority
  ) => {
    if (priority === "urgent")
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (priority === "high")
      return <AlertCircle className="h-4 w-4 text-orange-500" />;

    switch (type) {
      case NOTIFICATION_TYPES.TRANSFER_CREATED:
        return <Bell className="h-4 w-4 text-green-500" />;
      case NOTIFICATION_TYPES.TRANSFER_UPDATED:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case NOTIFICATION_TYPES.TRANSFER_URGENT:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return "border-l-red-500 bg-red-50";
      case NOTIFICATION_PRIORITIES.HIGH:
        return "border-l-orange-500 bg-orange-50";
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return "border-l-blue-500 bg-blue-50";
      case NOTIFICATION_PRIORITIES.LOW:
        return "border-l-gray-500 bg-gray-50";
      default:
        return "border-l-gray-300 bg-white";
    }
  };

  // Handle notification actions
  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDismiss = async (notificationId: string) => {
    await markAsDismissed(notificationId);
  };

  const handleClearAll = async () => {
    await clearAll();
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
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
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-800">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearAll}
              className="text-gray-400 hover:text-gray-600"
              title="Clear all"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value={NOTIFICATION_TYPES.TRANSFER_CREATED}>
              Transfers
            </option>
            <option value={NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT}>
              System
            </option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Priority</option>
            <option value={NOTIFICATION_PRIORITIES.URGENT}>Urgent</option>
            <option value={NOTIFICATION_PRIORITIES.HIGH}>High</option>
            <option value={NOTIFICATION_PRIORITIES.MEDIUM}>Medium</option>
            <option value={NOTIFICATION_PRIORITIES.LOW}>Low</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">Error loading notifications</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === "unread"
                ? "No unread notifications"
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const delivery = notification.deliveries.find(
                (d) => d.userId === "current-user"
              );
              const isRead = delivery?.readAt;
              const isDismissed = delivery?.dismissedAt;

              return (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getPriorityColor(
                    notification.priority
                  )} ${isRead ? "opacity-60" : ""} ${
                    isDismissed ? "hidden" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(
                        notification.type,
                        notification.priority
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-sm font-medium ${
                            isRead ? "text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-sm mt-1 ${
                          isRead ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {notification.message}
                      </p>

                      {/* Transfer data */}
                      {notification.data?.transfer && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <p>
                            <strong>Patient:</strong>{" "}
                            {notification.data.transfer.patient?.firstName}{" "}
                            {notification.data.transfer.patient?.lastName}
                          </p>
                          <p>
                            <strong>From:</strong>{" "}
                            {notification.data.transfer.fromHospital}
                          </p>
                          <p>
                            <strong>To:</strong>{" "}
                            {notification.data.transfer.toHospital}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-2 flex items-center space-x-2">
                        {!isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Check size={12} />
                            <span>Mark as read</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        >
                          <X size={12} />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                /* Navigate to full notifications page */
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
