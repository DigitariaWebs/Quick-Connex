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
    const getIconContainerClass = () => {
      switch (priority) {
        case "high":
          return "bg-red-100 text-red-600 border-red-200";
        case "medium":
          return "bg-amber-100 text-amber-600 border-amber-200";
        case "low":
          return "bg-emerald-100 text-emerald-600 border-emerald-200";
        default:
          return "bg-slate-100 text-slate-600 border-slate-200";
      }
    };

    const iconContainerClass = `p-2 rounded-xl border ${getIconContainerClass()}`;

    switch (type) {
      case "transfer_status_change":
        return (
          <div className={iconContainerClass}>
            <CheckCircle2 size={18} />
          </div>
        );
      case "new_transfer":
        return (
          <div className={iconContainerClass}>
            <Bell size={18} />
          </div>
        );
      case "urgent_transfer":
        return (
          <div className="p-2 rounded-xl border bg-red-100 text-red-600 border-red-200">
            <AlertTriangle size={18} />
          </div>
        );
      case "transfer_reminder":
        return (
          <div className={iconContainerClass}>
            <Clock size={18} />
          </div>
        );
      default:
        return (
          <div className={iconContainerClass}>
            <Bell size={18} />
          </div>
        );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-gradient-to-r from-red-50 to-red-100/50 border-red-200/60 shadow-red-100/50";
      case "medium":
        return "bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/60 shadow-amber-100/50";
      case "low":
        return "bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200/60 shadow-emerald-100/50";
      default:
        return "bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/60 shadow-slate-100/50";
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
          initial={{ opacity: 0, x: 300, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
          exit={{ opacity: 0, x: 300, scale: 0.95, y: -20 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`fixed top-4 right-4 z-50 w-96 max-w-sm border backdrop-blur-sm p-5 rounded-2xl shadow-xl ${getPriorityColor(
            priority
          )} ${
            priority === "high"
              ? "ring-2 ring-red-200/50 shadow-2xl shadow-red-200/20"
              : "shadow-lg"
          }`}
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full flex-shrink-0 shadow-sm ${
                      priority === "high"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : priority === "medium"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
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
                    className="mt-4 pt-4 border-t border-gray-200/60"
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
                        <div className="mt-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 shadow-sm">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-gray-600 font-medium">
                              Status:
                            </span>
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium">
                              {transfer.oldStatus}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span
                              className={`px-3 py-1.5 rounded-lg font-medium ${
                                transfer.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : transfer.status === "cancelled"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : transfer.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
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
                <div className="flex items-center space-x-3 mt-4">
                  {showDetails && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-all duration-200"
                    >
                      {isExpanded ? "Show Less" : "Show Details"}
                    </button>
                  )}

                  {onMarkAsRead && (
                    <button
                      onClick={handleMarkAsRead}
                      className="px-3 py-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg transition-all duration-200"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 flex-shrink-0 group"
              title="Dismiss"
            >
              <X
                size={16}
                className="text-gray-400 group-hover:text-gray-600 transition-colors"
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
