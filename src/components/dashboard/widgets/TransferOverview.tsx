"use client";

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Hospital,
  Users,
  Calendar,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface TransferStats {
  totalActive: number;
  completedToday: number;
  pendingAcceptance: number;
  urgent: number;
  averageProcessingTime: string;
  successRate: number;
}

interface TransferOverviewProps {
  stats: TransferStats;
  userType: "employee" | "manager" | "admin" | "super_admin";
  loading?: boolean;
  error?: string | null;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-3">{icon}</div>
    </div>
  </motion.div>
);

export default function TransferOverview({
  stats,
  userType,
  loading = false,
  error = null,
}: TransferOverviewProps) {
  const t = useTranslations("dashboardWidgets.transferOverview");
  const tCommon = useTranslations("common");

  const employeeStats = [
    {
      title: t("pendingYourAction"),
      value: stats.pendingAcceptance,
      subtitle: t("pendingSubtitle"),
      icon: <Clock size={24} className="text-amber-600" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: t("urgentTransfers"),
      value: stats.urgent,
      subtitle: t("urgentSubtitle"),
      icon: <AlertTriangle size={24} className="text-red-600" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: t("completedToday"),
      value: stats.completedToday,
      subtitle: t("completedSubtitle"),
      icon: <CheckCircle size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("successRate"),
      value: `${stats.successRate}%`,
      subtitle: t("successRateSubtitle"),
      icon: <Activity size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const managerStats = [
    {
      title: t("activeTransfers"),
      value: stats.totalActive,
      subtitle: t("activeSubtitle"),
      icon: <Hospital size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("avgProcessingTime"),
      value: stats.averageProcessingTime,
      subtitle: t("avgProcessingSubtitle"),
      icon: <Clock size={24} className="text-purple-600" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: t("successRate"),
      value: `${stats.successRate}%`,
      subtitle: t("completedSubtitle"),
      icon: <CheckCircle size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: t("todaySchedule"),
      value: stats.completedToday,
      subtitle: t("todayScheduleSubtitle"),
      icon: <Calendar size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const statsToShow = userType === "manager" ? managerStats : employeeStats;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{t("title")}</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-red-600" />
            <span className="text-red-800">
              {t("failedToLoad")}: {error}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {statsToShow.map((stat, index) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      )}
    </div>
  );
}
