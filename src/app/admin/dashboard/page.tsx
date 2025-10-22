"use client";

import { AdminLayout } from "@/components/features/admin";
import {
  Activity,
  Users,
  ArrowRightLeft,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminDashboard } from "@/hooks/dashboard";
import { StatCard } from "@/types/dashboard";

/**
 * Admin Dashboard - Main Overview
 *
 * This page serves as the central hub for admin operations, displaying:
 * - Real-time system health overview
 * - Key metrics with live data
 * - Recent activity feed from audit logs
 * - Active SSE connections count
 * - Live updates every 10 seconds
 */

export default function AdminDashboard() {
  // Fetch dashboard data with automatic polling
  const { data, loading, error, refresh } = useAdminDashboard({
    pollInterval: 10000, // Poll every 10 seconds
    enablePolling: true,
  });

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Get trend icon
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get trend color
  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Prepare stat cards from real data
  const stats: StatCard[] = data
    ? [
        {
          name: "Active Users",
          value: formatNumber(data.activeUsers),
          change: data.trends.activeUsers.change,
          trend: data.trends.activeUsers.trend,
          icon: Users,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          isLive: true, // Special indicator for live data
        },
        {
          name: "Transfers Today",
          value: formatNumber(data.transfersToday),
          change: data.trends.transfers.change,
          trend: data.trends.transfers.trend,
          icon: ArrowRightLeft,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          name: "Notifications Sent",
          value: formatNumber(data.notificationsSent),
          change: data.trends.notifications.change,
          trend: data.trends.notifications.trend,
          icon: Bell,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
        },
        {
          name: "System Health",
          value: `${data.systemHealth.overallScore}%`,
          change: data.trends.systemHealth.change,
          trend: data.trends.systemHealth.trend,
          icon: Activity,
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
      ]
    : [];

  // Get status icon and color for services
  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bg: "bg-green-50",
        };
      case "degraded":
        return { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" };
      case "down":
        return { icon: XCircle, color: "text-red-500", bg: "bg-red-50" };
      default:
        return { icon: AlertCircle, color: "text-gray-500", bg: "bg-gray-50" };
    }
  };

  // Get activity type icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return Users;
      case "transfer":
        return ArrowRightLeft;
      case "notification":
        return Bell;
      case "security":
        return AlertCircle;
      default:
        return Activity;
    }
  };

  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case "user":
        return { text: "text-blue-600", bg: "bg-blue-50" };
      case "transfer":
        return { text: "text-purple-600", bg: "bg-purple-50" };
      case "notification":
        return { text: "text-orange-600", bg: "bg-orange-50" };
      case "security":
        return { text: "text-red-600", bg: "bg-red-50" };
      default:
        return { text: "text-gray-600", bg: "bg-gray-50" };
    }
  };

  // Format time ago
  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <AdminLayout pageTitle="Admin Dashboard">
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">
                  Error Loading Dashboard
                </h3>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
              <button
                onClick={refresh}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        {loading.isLoading && !data
          ? // Loading Skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="w-16 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            ))
          : stats.map((stat, index) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={stat.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Live Indicator */}
                  {stat.isLive && (
                    <div className="absolute top-3 right-3 flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-green-600">
                        LIVE
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div className={`p-2 lg:p-3 rounded-xl ${stat.bgColor}`}>
                      <StatIcon
                        className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`}
                      />
                    </div>
                    <div className="flex items-center space-x-1 text-xs lg:text-sm">
                      {getTrendIcon(stat.trend)}
                      <span
                        className={`font-medium ${getTrendColor(stat.trend)}`}
                      >
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-xs lg:text-sm font-medium mb-1">
                    {stat.name}
                  </h3>
                  <p className="text-xl lg:text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </motion.div>
              );
            })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
            System Status
          </h2>

          {loading.isLoading && !data ? (
            // Loading skeleton
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded-xl animate-pulse"
                ></div>
              ))}
            </div>
          ) : data?.systemHealth ? (
            <div className="space-y-3">
              {Object.entries(data.systemHealth.services).map(
                ([key, service]) => {
                  const statusInfo = getServiceStatusIcon(service.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center justify-between p-2 lg:p-3 ${statusInfo.bg} rounded-xl`}
                    >
                      <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                        <StatusIcon
                          className={`w-4 h-4 lg:w-5 lg:h-5 ${statusInfo.color} flex-shrink-0`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs lg:text-sm font-medium text-gray-700 truncate">
                            {service.name}
                          </span>
                          {service.metadata?.activeConnections !==
                            undefined && (
                            <p className="text-xs text-gray-500 truncate">
                              {service.metadata.activeConnections} active
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-xs font-semibold ${statusInfo.color} capitalize`}
                        >
                          {service.status}
                        </span>
                        {service.latency && (
                          <p className="text-xs text-gray-500">
                            {service.latency}ms
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          ) : null}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">
            Recent Activity
          </h2>

          {loading.isLoading && !data ? (
            // Loading skeleton
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-3 pb-3 border-b border-gray-100"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : data?.recentActivity.length ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {data.recentActivity.map((activity, index) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  const colors = getActivityColor(activity.type);

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-start space-x-2 lg:space-x-3 pb-3 ${
                        index < data.recentActivity.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      <div
                        className={`p-1.5 lg:p-2 ${colors.bg} rounded-lg flex-shrink-0`}
                      >
                        <ActivityIcon
                          className={`w-3 h-3 lg:w-4 lg:h-4 ${colors.text}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs lg:text-sm font-medium text-gray-900 truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-1 lg:space-x-2 mt-1">
                          <p className="text-xs text-gray-400">
                            {timeAgo(activity.timestamp)}
                          </p>
                          <span className="text-xs text-gray-300">•</span>
                          <p className="text-xs text-gray-400 truncate">
                            {activity.actor.name}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-6 lg:py-8 text-gray-500">
              <Activity className="w-10 h-10 lg:w-12 lg:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs lg:text-sm">No recent activity</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* System Alert */}
      {data && data.systemHealth.status === "degraded" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-4 lg:mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 lg:p-6"
        >
          <div className="flex items-start space-x-2 lg:space-x-3">
            <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs lg:text-sm font-semibold text-amber-900 mb-1">
                System Alert
              </h3>
              <p className="text-xs lg:text-sm text-amber-700">
                Some services are experiencing degraded performance. Monitoring
                the situation.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AdminLayout>
  );
}
