"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, MapPin, User, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface UrgentTransfer {
  id: string;
  transferId: string;
  patientName: string;
  fromHospital: string;
  toHospital: string;
  priority: "urgent" | "stat";
  requestedTime: string;
  reason: string;
  timeElapsed: string;
}

interface UrgentAlertsProps {
  urgentTransfers: UrgentTransfer[];
  onDismiss?: (id: string) => void;
  onViewTransfer?: (id: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function UrgentAlerts({
  urgentTransfers,
  onDismiss,
  onViewTransfer,
  loading = false,
  error = null,
}: UrgentAlertsProps) {
  const t = useTranslations("dashboardWidgets.urgentAlerts");
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const handleDismiss = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
    onDismiss?.(id);
  };

  const visibleAlerts = urgentTransfers.filter(
    (alert) => !dismissedAlerts.includes(alert.id),
  );

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle size={20} className="text-red-600" />
          <span className="text-red-800 text-sm">
            {t("failedToLoad")}: {error}
          </span>
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {visibleAlerts.map((transfer) => (
          <motion.div
            key={transfer.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`relative overflow-hidden rounded-xl border-l-4 ${
              transfer.priority === "stat"
                ? "border-red-500 bg-red-50"
                : "border-orange-500 bg-orange-50"
            } p-4 shadow-sm`}
          >
            {/* Animated pulse background for STAT transfers */}
            {transfer.priority === "stat" && (
              <div className="absolute inset-0 bg-red-100 opacity-30 animate-pulse"></div>
            )}

            <div className="relative flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    transfer.priority === "stat"
                      ? "bg-red-100"
                      : "bg-orange-100"
                  }`}
                >
                  <AlertTriangle
                    size={20}
                    className={
                      transfer.priority === "stat"
                        ? "text-red-600"
                        : "text-orange-600"
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                        transfer.priority === "stat"
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {t(transfer.priority)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {transfer.transferId}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {transfer.patientName}
                  </h3>

                  <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>
                        {transfer.fromHospital} → {transfer.toHospital}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span className="font-medium text-red-600">
                        {transfer.timeElapsed} {t("ago")}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {transfer.reason}
                  </p>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => onViewTransfer?.(transfer.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        transfer.priority === "stat"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-orange-600 text-white hover:bg-orange-700"
                      }`}
                    >
                      {t("viewTransfer")}
                    </button>
                    <button
                      onClick={() => handleDismiss(transfer.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {t("dismiss")}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDismiss(transfer.id)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
