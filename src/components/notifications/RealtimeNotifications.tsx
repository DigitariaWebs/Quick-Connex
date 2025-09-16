"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Eye,
  EyeOff,
  Settings,
  User,
  MapPin,
  Calendar,
  Car,
} from "lucide-react";

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

interface RealtimeNotificationsProps {
  userId?: string;
  userType?: string;
  token?: string;
  maxNotifications?: number;
  autoHide?: boolean;
  hideDelay?: number;
  showSettings?: boolean;
}

export default function RealtimeNotifications({
  userId,
  userType,
  token,
  maxNotifications = 10,
  autoHide = true,
  hideDelay = 5000,
  showSettings = true,
}: RealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    []
  );
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );
  const [showRead, setShowRead] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize audio for notification sounds
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/notification-sound.mp3");
      audioRef.current.volume = 0.3;
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token || !userId) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      console.log("Connected to real-time notifications");
      setConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from real-time notifications:", reason);
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setError("Failed to connect to real-time notifications");
      setConnected(false);
    });

    newSocket.on("connected", (data) => {
      console.log("Socket connection confirmed:", data);
    });

    // Listen for transfer status changes
    newSocket.on(
      "transfer_status_change",
      (notification: RealtimeNotification) => {
        console.log(
          "Received transfer status change notification:",
          notification
        );
        addNotification(notification);
      }
    );

    // Listen for new transfer notifications
    newSocket.on("new_transfer", (notification: RealtimeNotification) => {
      console.log("Received new transfer notification:", notification);
      addNotification(notification);
    });

    // Listen for urgent transfer notifications
    newSocket.on("urgent_transfer", (notification: RealtimeNotification) => {
      console.log("Received urgent transfer notification:", notification);
      addNotification(notification);
      // Play sound for urgent notifications
      if (soundEnabled && audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    });

    // Listen for transfer reminders
    newSocket.on("transfer_reminder", (notification: RealtimeNotification) => {
      console.log("Received transfer reminder:", notification);
      addNotification(notification);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      // Clear all hide timeouts
      hideTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      hideTimeouts.current.clear();
    };
  }, [token, userId, soundEnabled]);

  const addNotification = (notification: RealtimeNotification) => {
    setNotifications((prev) => {
      const newNotifications = [notification, ...prev].slice(
        0,
        maxNotifications
      );
      return newNotifications;
    });

    // Auto-hide notification after delay
    if (autoHide) {
      const timeout = setTimeout(() => {
        removeNotification(notification.id);
      }, hideDelay);

      hideTimeouts.current.set(notification.id, timeout);
    }
  };

  const removeNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

    // Clear timeout if it exists
    const timeout = hideTimeouts.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      hideTimeouts.current.delete(notificationId);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    // Clear all timeouts
    hideTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    hideTimeouts.current.clear();
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass =
      priority === "high"
        ? "text-red-600"
        : priority === "medium"
        ? "text-yellow-600"
        : "text-green-600";

    switch (type) {
      case "transfer_status_change":
        return <CheckCircle2 size={20} className={iconClass} />;
      case "new_transfer":
        return <Bell size={20} className={iconClass} />;
      case "urgent_transfer":
        return <AlertTriangle size={20} className="text-red-600" />;
      case "transfer_reminder":
        return <Clock size={20} className={iconClass} />;
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - notificationTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter !== "all" && notification.priority !== filter) {
      return false;
    }
    if (!showRead && notification.read) {
      return false;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!connected && !error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Connecting to real-time notifications...
            </p>
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
            <div className="relative">
              <Bell className="h-6 w-6 text-blue-600" />
              {connected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Real-time Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {showSettings && (
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-600"
                }`}
                title={soundEnabled ? "Sound enabled" : "Sound disabled"}
              >
                <Settings size={16} />
              </button>
            )}

            <button
              onClick={() => setShowRead(!showRead)}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showRead ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>{showRead ? "Hide Read" : "Show Read"}</span>
            </button>

            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Mark All Read
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-4 flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {connected ? "Connected" : "Disconnected"}
          </span>
          {error && <span className="text-sm text-red-600 ml-2">{error}</span>}
        </div>

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
      <div className="p-6">
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Real-time notifications are currently unavailable
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.timestamp)}
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

                          {notification.transfer?.patient && (
                            <span className="flex items-center space-x-1">
                              <User size={14} />
                              <span>
                                {notification.transfer.patient.firstName}{" "}
                                {notification.transfer.patient.lastName}
                              </span>
                            </span>
                          )}

                          {notification.transfer?.fromHospital &&
                            notification.transfer?.toHospital && (
                              <span className="flex items-center space-x-1">
                                <MapPin size={14} />
                                <span>
                                  {notification.transfer.fromHospital} →{" "}
                                  {notification.transfer.toHospital}
                                </span>
                              </span>
                            )}

                          {notification.changedBy && (
                            <span className="text-xs text-gray-500">
                              by {notification.changedBy.name}
                            </span>
                          )}
                        </div>

                        {/* Status Change Details */}
                        {notification.type === "transfer_status_change" &&
                          notification.transfer?.oldStatus &&
                          notification.transfer?.status && (
                            <div className="mt-3 p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600">Status:</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {notification.transfer.oldStatus}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    notification.transfer.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : notification.transfer.status ===
                                        "cancelled"
                                      ? "bg-red-100 text-red-700"
                                      : notification.transfer.status ===
                                        "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {notification.transfer.status}
                                </span>
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

                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Dismiss"
                      >
                        <X size={16} className="text-gray-500" />
                      </button>
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
