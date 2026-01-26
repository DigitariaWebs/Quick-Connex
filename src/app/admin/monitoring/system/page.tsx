"use client";

import { AdminLayout } from "@/components/admin/layouts";
import {
  Activity,
  Server,
  Database,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * System Overview Monitoring Page
 *
 * This page provides a comprehensive view of system health including:
 * - System metrics (CPU, Memory, Disk)
 * - Service status indicators
 * - Active connections and users
 * - Recent alerts and warnings
 * - Performance trends
 */

interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeUsers: number;
  sseConnections: number;
  databaseConnections: number;
  apiRequestsPerMinute: number;
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  responseTime?: number;
  lastCheck: Date;
  description: string;
}

interface SystemAlert {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export default function SystemOverviewPage() {
  const t = useTranslations("adminMonitoring");
  const tCommon = useTranslations("common");

  const [metrics, setMetrics] = useState<SystemMetrics>({
    uptime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    activeUsers: 0,
    sseConnections: 0,
    databaseConnections: 0,
    apiRequestsPerMinute: 0,
  });

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "API Server",
      status: "operational",
      responseTime: 45,
      lastCheck: new Date(),
      description: "Main application server",
    },
    {
      name: "Database",
      status: "operational",
      responseTime: 12,
      lastCheck: new Date(),
      description: "MongoDB database",
    },
    {
      name: "SSE Service",
      status: "operational",
      responseTime: 8,
      lastCheck: new Date(),
      description: "Server-Sent Events service",
    },
    {
      name: "Email Service",
      status: "degraded",
      responseTime: 1200,
      lastCheck: new Date(),
      description: "SMTP email delivery",
    },
  ]);

  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: "1",
      type: "warning",
      title: "High Memory Usage",
      message:
        "Memory usage is at 85%. Consider monitoring for potential memory leaks.",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      resolved: false,
    },
    {
      id: "2",
      type: "info",
      title: "System Update Available",
      message: "A new system update is available. Schedule maintenance window.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolved: false,
    },
    {
      id: "3",
      type: "success",
      title: "Backup Completed",
      message: "Daily database backup completed successfully.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      resolved: true,
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real-time data from API
  const fetchSystemData = async () => {
    try {
      const response = await fetch("/api/admin/monitoring/system");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data.metrics);
          setServices(data.data.services);
        }
      }
    } catch (error) {
      console.error("Failed to fetch system data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSystemData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchSystemData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSystemData();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-600 bg-green-50";
      case "degraded":
        return "text-yellow-600 bg-yellow-50";
      case "down":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return CheckCircle;
      case "degraded":
        return AlertTriangle;
      case "down":
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return AlertTriangle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Activity;
      case "success":
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <AdminLayout
      pageTitle={t("systemOverview")}
      pageDescription={t("systemOverviewDesc")}
    >
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("systemOverview")}
          </h1>
          <p className="text-gray-600 mt-2">{t("realtimeMonitoring")}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{tCommon("refresh")}</span>
        </motion.button>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Uptime */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatUptime(metrics.uptime)}
              </p>
              <p className="text-sm text-gray-500">{t("uptime")}</p>
            </div>
          </div>
        </motion.div>

        {/* CPU Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.cpuUsage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">{t("cpuUsage")}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.cpuUsage}%` }}
            />
          </div>
        </motion.div>

        {/* Memory Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.memoryUsage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">{t("memoryUsage")}</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.memoryUsage}%` }}
            />
          </div>
        </motion.div>

        {/* Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeUsers}
              </p>
              <p className="text-sm text-gray-500">{t("activeUsers")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Services Status and Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("serviceStatus")}
          </h2>
          <div className="space-y-3">
            {services.map((service, index) => {
              const StatusIcon = getStatusIcon(service.status);
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 rounded-xl border"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getStatusColor(
                        service.status,
                      )}`}
                    >
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {service.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {service.status}
                    </p>
                    {service.responseTime && (
                      <p className="text-xs text-gray-500">
                        {service.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* System Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("recentAlerts")}
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border ${getAlertColor(
                    alert.type,
                  )}`}
                >
                  <div className="flex items-start space-x-3">
                    <AlertIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {alert.resolved && (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("connectionMetrics")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {metrics.sseConnections}
            </p>
            <p className="text-sm text-gray-500">{t("sseConnections")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {metrics.databaseConnections}
            </p>
            <p className="text-sm text-gray-500">{t("databaseConnections")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {metrics.apiRequestsPerMinute}
            </p>
            <p className="text-sm text-gray-500">{t("apiRequestsPerMin")}</p>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
