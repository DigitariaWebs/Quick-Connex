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
} from "lucide-react";

interface NotificationToastProps {
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
  timestamp: string;
  onDismiss: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  autoHide?: boolean;
  hideDelay?: number;
  showDetails?: boolean;
}

export default function NotificationToast({
  id,
  type,
  priority,
  title,
  message,
  transferId,
  transfer,
  changedBy,
  timestamp,
  onDismiss,
  onMarkAsRead,
  autoHide = true,
  hideDelay = 5000,
  showDetails = false,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(id), 300); // Wait for animation to complete
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, id, onDismiss]);

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

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed top-4 right-4 z-50 w-96 max-w-sm border-l-4 p-4 rounded-lg shadow-lg ${getPriorityColor(
            priority
          )} ${priority === "high" ? "ring-2 ring-red-200" : ""}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getNotificationIcon(type, priority)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-800 text-sm truncate">
                    {title}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                      priority === "high"
                        ? "bg-red-200 text-red-800"
                        : priority === "medium"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-green-200 text-green-800"
                    }`}
                  >
                    {priority.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-700 text-sm mb-2 line-clamp-2">
                  {message}
                </p>

                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Calendar size={12} />
                    <span className="truncate">{transferId}</span>
                  </span>
                  <span className="text-gray-400">
                    {formatTimeAgo(timestamp)}
                  </span>
                </div>

                {/* Expanded Details */}
                {isExpanded && showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-200"
                  >
                    {transfer?.patient && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                        <User size={12} />
                        <span>
                          {transfer.patient.firstName}{" "}
                          {transfer.patient.lastName}
                          {transfer.patient.dossierNumber && (
                            <span className="ml-2 text-gray-500">
                              (Dossier: {transfer.patient.dossierNumber})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {transfer?.fromHospital && transfer?.toHospital && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600 mb-2">
                        <MapPin size={12} />
                        <span>
                          {transfer.fromHospital} → {transfer.toHospital}
                        </span>
                      </div>
                    )}

                    {changedBy && (
                      <div className="text-xs text-gray-500">
                        by {changedBy.name}
                      </div>
                    )}

                    {/* Status Change Details */}
                    {type === "transfer_status_change" &&
                      transfer?.oldStatus &&
                      transfer?.status && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-600">Status:</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {transfer.oldStatus}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span
                              className={`px-2 py-1 rounded ${
                                transfer.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : transfer.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : transfer.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {transfer.status}
                            </span>
                          </div>
                        </div>
                      )}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 mt-3">
                  {showDetails && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isExpanded ? "Show Less" : "Show Details"}
                    </button>
                  )}

                  {onMarkAsRead && (
                    <button
                      onClick={handleMarkAsRead}
                      className="text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
