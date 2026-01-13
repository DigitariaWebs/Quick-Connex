"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  Activity,
  FileText,
  Hospital,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ActivityItem {
  id: string;
  type:
    | "transfer_accepted"
    | "transfer_completed"
    | "transfer_requested"
    | "transfer_cancelled"
    | "document_uploaded";
  transferId: string;
  patientName: string;
  description: string;
  timestamp: string;
  priority?: "low" | "medium" | "high" | "urgent";
  fromHospital?: string;
  toHospital?: string;
  user?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  userType: "employee" | "manager" | "admin" | "super_admin";
  maxItems?: number;
  loading?: boolean;
  error?: string | null;
}

const ActivityIcon = ({ type }: { type: ActivityItem["type"] }) => {
  const iconMap = {
    transfer_accepted: <CheckCircle size={16} className="text-green-600" />,
    transfer_completed: <CheckCircle size={16} className="text-blue-600" />,
    transfer_requested: <Clock size={16} className="text-orange-600" />,
    transfer_cancelled: <AlertTriangle size={16} className="text-red-600" />,
    document_uploaded: <FileText size={16} className="text-purple-600" />,
  };

  return iconMap[type] || <Clock size={16} className="text-gray-600" />;
};

const PriorityBadge = ({ priority }: { priority?: string }) => {
  if (!priority) return null;

  const colorMap = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        colorMap[priority as keyof typeof colorMap] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {priority}
    </span>
  );
};

export default function RecentActivity({
  activities,
  userType,
  maxItems = 5,
  loading = false,
  error = null,
}: RecentActivityProps) {
  const t = useTranslations("dashboardWidgets.recentActivity");
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{t("title")}</h3>
        <span className="text-sm text-gray-500">
          {userType === "manager" ? t("systemWide") : t("yourActions")}
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 rounded-lg animate-pulse"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <p className="text-red-600 text-sm mb-2">{t("failedToLoad")}</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      ) : displayActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Activity size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">{t("noActivity")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                <ActivityIcon type={activity.type} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.patientName}
                  </p>
                  <PriorityBadge priority={activity.priority} />
                </div>

                {activity.fromHospital && activity.toHospital && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                    <Hospital size={12} />
                    <span>
                      {typeof activity.fromHospital === "string"
                        ? activity.fromHospital
                        : activity.fromHospital || "Unknown Hospital"}
                    </span>
                    <ArrowRight size={12} />
                    <span>
                      {typeof activity.toHospital === "string"
                        ? activity.toHospital
                        : activity.toHospital || "Unknown Hospital"}
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar size={12} />
                    <span>{activity.timestamp}</span>
                  </div>
                  {activity.user && (
                    <div className="flex items-center space-x-1">
                      <User size={12} />
                      <span>{activity.user}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activities.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
            {t("viewAll")} ({activities.length - maxItems} {t("more")})
          </button>
        </div>
      )}
    </div>
  );
}
