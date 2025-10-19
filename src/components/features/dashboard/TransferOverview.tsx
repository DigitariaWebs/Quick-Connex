"use client";

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Hospital,
  Users,
  Calendar,
  Activity,
} from "lucide-react";

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
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "neutral";
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
      <div className={`p-3 rounded-lg ${bgColor}`}>{icon}</div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center">
        <TrendingUp
          size={16}
          className={`mr-1 ${
            trend === "up"
              ? "text-green-500"
              : trend === "down"
              ? "text-red-500"
              : "text-gray-500"
          }`}
        />
        <span
          className={`text-sm ${
            trend === "up"
              ? "text-green-600"
              : trend === "down"
              ? "text-red-600"
              : "text-gray-600"
          }`}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} vs last week
        </span>
      </div>
    )}
  </motion.div>
);

export default function TransferOverview({
  stats,
  userType,
  loading = false,
  error = null,
}: TransferOverviewProps) {
  const employeeStats = [
    {
      title: "Pending Your Action",
      value: stats.pendingAcceptance,
      subtitle: "Transfers awaiting confirmation",
      icon: <Clock size={24} className="text-amber-600" />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      trend: "neutral" as const,
    },
    {
      title: "Urgent Transfers",
      value: stats.urgent,
      subtitle: "Require immediate attention",
      icon: <AlertTriangle size={24} className="text-red-600" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
      trend: stats.urgent > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      subtitle: "Transfers processed",
      icon: <CheckCircle size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up" as const,
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      subtitle: "This month",
      icon: <Activity size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up" as const,
    },
  ];

  const managerStats = [
    {
      title: "Active Transfers",
      value: stats.totalActive,
      subtitle: "Currently in system",
      icon: <Hospital size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up" as const,
    },
    {
      title: "Avg Processing Time",
      value: stats.averageProcessingTime,
      subtitle: "From request to completion",
      icon: <Clock size={24} className="text-purple-600" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: "down" as const,
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      subtitle: "Completed successfully",
      icon: <CheckCircle size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up" as const,
    },
    {
      title: "Today's Schedule",
      value: stats.completedToday,
      subtitle: "Transfers scheduled",
      icon: <Calendar size={24} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "neutral" as const,
    },
  ];

  const statsToShow = userType === "manager" ? managerStats : employeeStats;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Overview</h2>
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
              Failed to load statistics: {error}
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
