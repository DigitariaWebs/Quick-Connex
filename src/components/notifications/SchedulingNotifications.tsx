"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  RefreshCw,
  Calendar,
  Car,
  User,
  MapPin,
  Eye,
} from "lucide-react";
import { useNotificationSSE } from "@/hooks/useNotificationSSE";

interface Notification {
  id: string;
  type: "upcoming" | "conflict" | "overdue" | "resource" | "reminder";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  transferId: string;
  scheduledDate?: string;
  patient?: {
    firstName: string;
    lastName: string;
    patientId: string;
  };
  fromHospital?: string;
  toHospital?: string;
  conflicts?: any[];
  missingResources?: string[];
  overdueMinutes?: number;
  createdAt: string;
  read: boolean;
}

interface NotificationSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  unread: number;
}

interface SchedulingNotificationsProps {
  limit?: number;
  showSummary?: boolean;
}

export default function SchedulingNotifications({
  limit = 10,
  showSummary = true,
}: SchedulingNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    unread: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );

  // Use SSE for real-time notifications
  const { connected, error: sseError, lastMessage } = useNotificationSSE();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle SSE messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "notification_count_update") {
        // Update summary with new count
        setSummary((prev) => ({
          ...prev,
          unread: lastMessage.data?.unreadCount || prev.unread,
        }));
      } else if (lastMessage.type === "scheduling_notification") {
        // Add new scheduling notification
        setNotifications((prev) =>
          [lastMessage as any, ...prev].slice(0, limit)
        );
        setSummary((prev) => ({
          ...prev,
          total: prev.total + 1,
          unread: prev.unread + 1,
          [lastMessage.priority]:
            prev[lastMessage.priority as keyof NotificationSummary] + 1,
        }));
      }
    }
  }, [lastMessage, limit]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: "all",
        limit: limit.toString(),
      });

      const response = await fetch(`/api/notifications/schedule?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data.notifications);
        setSummary(data.data.summary);
      } else {
        setError(data.error || "Failed to fetch notifications");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_read",
          notificationIds: [notificationId],
        }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const dismissConflict = async (transferId: string) => {
    try {
      const response = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "dismiss_conflict",
          transferId,
        }),
      });

      if (response.ok) {
        // Remove conflict notifications for this transfer
        setNotifications((prev) =>
          prev.filter(
            (notification) =>
              !(
                notification.type === "conflict" &&
                notification.transferId === transferId
              )
          )
        );
      }
    } catch (error) {
      console.error("Error dismissing conflict:", error);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass =
      priority === "high"
        ? "text-red-600"
        : priority === "medium"
        ? "text-yellow-600"
        : "text-green-600";

    switch (type) {
      case "upcoming":
        return <Clock size={20} className={iconClass} />;
      case "conflict":
        return <AlertTriangle size={20} className={iconClass} />;
      case "overdue":
        return <AlertTriangle size={20} className="text-red-600" />;
      case "resource":
        return <Car size={20} className={iconClass} />;
      case "reminder":
        return <Bell size={20} className={iconClass} />;
      default:
        return <Bell size={20} className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50";
      case "low":
        return "border-l-green-500 bg-green-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter !== "all" && notification.priority !== filter) {
      return false;
    }
    return true;
  });

  const formatTimeUntil = (scheduledDate: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diff = scheduled.getTime() - now.getTime();

    if (diff < 0) {
      const overdueMinutes = Math.floor(Math.abs(diff) / (1000 * 60));
      return `Overdue by ${overdueMinutes}m`;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    } else {
      return `In ${minutes}m`;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">
              Scheduling Notifications
            </h2>
            {summary.unread > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {summary.unread}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {showSummary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {summary.total}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.high}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.medium}
              </div>
              <div className="text-sm text-gray-600">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.low}
              </div>
              <div className="text-sm text-gray-600">Low Priority</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {(["all", "high", "medium", "low"] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? filterType === "high"
                    ? "bg-red-100 text-red-800"
                    : filterType === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : filterType === "low"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="p-6 min-h-[400px]">
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500">
              {filter === "all"
                ? "You're all caught up!"
                : `No ${filter} priority notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`border-l-4 p-4 rounded-lg ${getPriorityColor(
                    notification.priority
                  )} ${notification.read ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(
                        notification.type,
                        notification.priority
                      )}

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-800">
                            {notification.title}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              notification.priority === "high"
                                ? "bg-red-200 text-red-800"
                                : notification.priority === "medium"
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-green-200 text-green-800"
                            }`}
                          >
                            {notification.priority.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>Transfer: {notification.transferId}</span>
                          </span>

                          {notification.scheduledDate && (
                            <span className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>
                                {formatTimeUntil(notification.scheduledDate)}
                              </span>
                            </span>
                          )}

                          {notification.patient && (
                            <span className="flex items-center space-x-1">
                              <User size={14} />
                              <span>
                                {notification.patient.firstName}{" "}
                                {notification.patient.lastName}
                              </span>
                            </span>
                          )}

                          {notification.fromHospital &&
                            notification.toHospital && (
                              <span className="flex items-center space-x-1">
                                <MapPin size={14} />
                                <span>
                                  {notification.fromHospital} →{" "}
                                  {notification.toHospital}
                                </span>
                              </span>
                            )}
                        </div>

                        {/* Conflict Details */}
                        {notification.conflicts &&
                          notification.conflicts.length > 0 && (
                            <div className="mt-3 p-3 bg-white rounded-lg border">
                              <h5 className="font-medium text-gray-800 mb-2">
                                Conflicts:
                              </h5>
                              <div className="space-y-2">
                                {notification.conflicts.map(
                                  (conflict: any, index: number) => (
                                    <div key={index} className="text-sm">
                                      <span className="font-medium">
                                        {conflict.conflictType}:
                                      </span>
                                      <span className="ml-2 text-gray-600">
                                        {conflict.description}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Missing Resources */}
                        {notification.missingResources &&
                          notification.missingResources.length > 0 && (
                            <div className="mt-3 p-3 bg-white rounded-lg border">
                              <h5 className="font-medium text-gray-800 mb-2">
                                Missing Resources:
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {notification.missingResources.map(
                                  (resource: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                                    >
                                      {resource}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                      )}

                      {notification.type === "conflict" && (
                        <button
                          onClick={() =>
                            dismissConflict(notification.transferId)
                          }
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Dismiss conflict"
                        >
                          <X size={16} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
