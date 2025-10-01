"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  User,
  MapPin,
  Calendar,
  Car,
  Info,
  AlertCircle,
} from "lucide-react";

interface NotificationPopupProps {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  transferId?: string;
  data?: any;
  timestamp: string;
  onClose: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

export default function NotificationPopup({
  id,
  type,
  priority,
  title,
  message,
  transferId,
  data,
  timestamp,
  onClose,
  autoHide = true,
  hideDelay = 5000,
}: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide notification
  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleClose();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const getNotificationIcon = () => {
    const iconClass = getPriorityColor(priority).icon;

    switch (type) {
      case "transfer_status_change":
        return <CheckCircle2 size={20} className={iconClass} />;
      case "new_transfer":
        return <Bell size={20} className={iconClass} />;
      case "urgent_transfer":
        return <AlertTriangle size={20} className="text-red-600" />;
      case "transfer_reminder":
        return <Clock size={20} className={iconClass} />;
      case "test_notification":
        return <Info size={20} className={iconClass} />;
      default:
        return <Bell size={20} className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-50 border-red-200",
          icon: "text-red-600",
          badge: "bg-red-100 text-red-800",
          accent: "border-l-red-500",
        };
      case "medium":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          icon: "text-yellow-600",
          badge: "bg-yellow-100 text-yellow-800",
          accent: "border-l-yellow-500",
        };
      case "low":
        return {
          bg: "bg-green-50 border-green-200",
          icon: "text-green-600",
          badge: "bg-green-100 text-green-800",
          accent: "border-l-green-500",
        };
      default:
        return {
          bg: "bg-gray-50 border-gray-200",
          icon: "text-gray-600",
          badge: "bg-gray-100 text-gray-800",
          accent: "border-l-gray-500",
        };
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

  const colors = getPriorityColor(priority);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed top-4 right-4 z-50 w-96 max-w-sm bg-white rounded-lg shadow-lg border-2 ${colors.bg} ${colors.accent} border-l-4`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getNotificationIcon()}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-800">{title}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${colors.badge}`}
                    >
                      {priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{message}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock size={12} className="mr-1" />
                    {formatTimeAgo(timestamp)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Transfer Details */}
          {transferId && (
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>Transfer: {transferId}</span>
              </div>
            </div>
          )}

          {/* Additional Data */}
          {data && (
            <div className="px-4 py-3">
              {data.transfer && (
                <div className="space-y-2">
                  {data.transfer.patient && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User size={14} />
                      <span>
                        {data.transfer.patient.firstName}{" "}
                        {data.transfer.patient.lastName}
                      </span>
                    </div>
                  )}
                  {data.transfer.fromHospital && data.transfer.toHospital && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>
                        {data.transfer.fromHospital} →{" "}
                        {data.transfer.toHospital}
                      </span>
                    </div>
                  )}
                  {data.transfer.status && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          data.transfer.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : data.transfer.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : data.transfer.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {data.transfer.status}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {data.changedBy && (
                <div className="mt-2 text-xs text-gray-500">
                  Changed by: {data.changedBy.name}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={handleClose}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Dismiss
              </button>
              {transferId && (
                <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  View Transfer
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

