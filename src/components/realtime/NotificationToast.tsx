"use client";

/**
 * Notification Toast Component
 *
 * Displays toast notifications for real-time alerts.
 * Supports different positions, durations, and priority levels.
 */

import { useState, useEffect } from "react";
import {
  RealtimeNotification,
  NotificationToast,
} from "@/lib/realtime/core/types";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "@/lib/realtime/core/constants";
import {
  X,
  AlertCircle,
  Info,
  CheckCircle,
  Bell,
  Settings,
  Clock,
} from "lucide-react";

interface NotificationToastProps {
  toast: NotificationToast;
  onHide: (toastId: string) => void;
}

export default function NotificationToastComponent({
  toast,
  onHide,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const notification = toast.notification;

  // Show toast with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleHide();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleHide = () => {
    setIsExiting(true);
    setTimeout(() => {
      onHide(toast.id);
    }, 300);
  };

  // Get notification icon
  const getNotificationIcon = () => {
    if (notification.priority === NOTIFICATION_PRIORITIES.URGENT) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (notification.priority === NOTIFICATION_PRIORITIES.HIGH) {
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }

    switch (notification.type) {
      case NOTIFICATION_TYPES.TRANSFER_STATUS_CHANGE:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case NOTIFICATION_TYPES.NEW_TRANSFER:
        return <Bell className="h-5 w-5 text-green-500" />;
      case NOTIFICATION_TYPES.URGENT_TRANSFER:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case NOTIFICATION_TYPES.SYSTEM:
        return <Settings className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // Get priority styling
  const getPriorityStyling = () => {
    switch (notification.priority) {
      case NOTIFICATION_PRIORITIES.URGENT:
        return {
          container: "bg-red-50 border-red-200 shadow-red-100",
          title: "text-red-900",
          message: "text-red-700",
          accent: "bg-red-500",
        };
      case NOTIFICATION_PRIORITIES.HIGH:
        return {
          container: "bg-orange-50 border-orange-200 shadow-orange-100",
          title: "text-orange-900",
          message: "text-orange-700",
          accent: "bg-orange-500",
        };
      case NOTIFICATION_PRIORITIES.MEDIUM:
        return {
          container: "bg-blue-50 border-blue-200 shadow-blue-100",
          title: "text-blue-900",
          message: "text-blue-700",
          accent: "bg-blue-500",
        };
      case NOTIFICATION_PRIORITIES.LOW:
        return {
          container: "bg-gray-50 border-gray-200 shadow-gray-100",
          title: "text-gray-900",
          message: "text-gray-700",
          accent: "bg-gray-500",
        };
      default:
        return {
          container: "bg-white border-gray-200 shadow-gray-100",
          title: "text-gray-900",
          message: "text-gray-700",
          accent: "bg-gray-500",
        };
    }
  };

  const styling = getPriorityStyling();

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`
        relative max-w-sm w-full bg-white border rounded-lg shadow-lg transition-all duration-300 ease-in-out
        ${styling.container}
        ${
          isVisible && !isExiting
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }
        ${isExiting ? "opacity-0 translate-x-full" : ""}
        ${
          notification.priority === NOTIFICATION_PRIORITIES.URGENT
            ? "animate-pulse"
            : ""
        }
      `}
    >
      {/* Priority accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${styling.accent} rounded-t-lg`}
      />

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">{getNotificationIcon()}</div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-semibold ${styling.title}`}>
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {formatTime(notification.createdAt)}
                </span>
                <button
                  onClick={handleHide}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <p className={`text-sm mt-1 ${styling.message}`}>
              {notification.message}
            </p>

            {/* Transfer data */}
            {notification.data?.transfer && (
              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
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
                  <strong>To:</strong> {notification.data.transfer.toHospital}
                </p>
                {notification.data.transfer.status && (
                  <p>
                    <strong>Status:</strong> {notification.data.transfer.status}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex items-center space-x-2">
              {notification.data?.transferId && (
                <button
                  onClick={() => {
                    // Navigate to transfer details
                    window.location.href = `/transfers/${notification.data?.transferId}`;
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                >
                  View Transfer
                </button>
              )}

              {notification.type === NOTIFICATION_TYPES.SYSTEM && (
                <button
                  onClick={() => {
                    // Navigate to admin panel
                    window.location.href = "/admin/notifications";
                  }}
                  className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className={`h-full ${styling.accent} transition-all ease-linear`}
            style={{
              width: "100%",
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ===== TOAST CONTAINER =====

interface ToastContainerProps {
  toasts: NotificationToast[];
  onHide: (toastId: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export function ToastContainer({
  toasts,
  onHide,
  position = "top-right",
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "fixed top-4 right-4 z-50";
      case "top-left":
        return "fixed top-4 left-4 z-50";
      case "bottom-right":
        return "fixed bottom-4 right-4 z-50";
      case "bottom-left":
        return "fixed bottom-4 left-4 z-50";
      default:
        return "fixed top-4 right-4 z-50";
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={`${getPositionClasses()} space-y-2`}>
      {toasts.map((toast) => (
        <NotificationToastComponent
          key={toast.id}
          toast={toast}
          onHide={onHide}
        />
      ))}
    </div>
  );
}

// ===== CSS ANIMATIONS =====

const styles = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
