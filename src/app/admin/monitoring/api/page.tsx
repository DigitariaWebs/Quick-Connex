"use client";

import { AdminLayout } from "@/components/admin/layouts";
import {
  Zap,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Server,
  Globe,
  BarChart3,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * API Performance Monitoring Page
 *
 * This page provides comprehensive API monitoring including:
 * - Response time tracking for all endpoints
 * - Request volume and throughput
 * - Error rates and status codes
 * - Endpoint health status
 * - Performance trends and analytics
 * - Real-time API metrics
 */

interface APIMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  uptime: number;
  slowEndpoints: number;
  totalErrors: number;
  successRate: number;
}

interface EndpointPerformance {
  endpoint: string;
  method: string;
  responseTime: number;
  requestCount: number;
  errorCount: number;
  status: "healthy" | "degraded" | "down";
  lastRequest: Date;
  averageResponseTime: number;
  successRate: number;
}

interface RequestLog {
  id: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userAgent: string;
  ipAddress: string;
  error?: string;
}

interface StatusCodeDistribution {
  code: number;
  count: number;
  percentage: number;
  description: string;
}

export default function APIPerformancePage() {
  const t = useTranslations("adminMonitoring");
  const tCommon = useTranslations("common");

  const [metrics, setMetrics] = useState<APIMetrics>({
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    requestsPerMinute: 0,
    uptime: 0,
    slowEndpoints: 0,
    totalErrors: 0,
    successRate: 0,
  });

  const [endpoints, setEndpoints] = useState<EndpointPerformance[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestLog[]>([]);
  const [statusCodes, setStatusCodes] = useState<StatusCodeDistribution[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("1h");
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("all");

  // Fetch API data from API
  const fetchAPIData = async () => {
    try {
      const response = await fetch(
        `/api/admin/monitoring/api?timeRange=${timeRange}&endpoint=${selectedEndpoint}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data.metrics);
          setEndpoints(data.data.endpoints);
          setRecentRequests(data.data.recentRequests);
          setStatusCodes(data.data.statusCodes);
        }
      }
    } catch (error) {
      console.error("Failed to fetch API data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchAPIData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchAPIData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [timeRange, selectedEndpoint]);

  // Helper function to ensure timestamp is a Date object
  const parseTimestamp = (timestamp: any): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === "string") {
      return new Date(timestamp);
    }
    return new Date();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAPIData();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
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
      case "healthy":
        return CheckCircle;
      case "degraded":
        return AlertTriangle;
      case "down":
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-green-600 bg-green-50";
    if (code >= 300 && code < 400) return "text-blue-600 bg-blue-50";
    if (code >= 400 && code < 500) return "text-yellow-600 bg-yellow-50";
    if (code >= 500) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (
    value: number,
    thresholds: { good: number; warning: number },
  ) => {
    if (value <= thresholds.good) return "text-green-600";
    if (value <= thresholds.warning) return "text-yellow-600";
    return "text-red-600";
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "text-blue-600 bg-blue-50";
      case "POST":
        return "text-green-600 bg-green-50";
      case "PUT":
        return "text-yellow-600 bg-yellow-50";
      case "DELETE":
        return "text-red-600 bg-red-50";
      case "PATCH":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const filteredEndpoints =
    selectedEndpoint === "all"
      ? endpoints
      : endpoints.filter((ep) => ep.endpoint === selectedEndpoint);

  return (
    <AdminLayout
      pageTitle={t("apiPerformance")}
      pageDescription={t("apiPerformanceDesc")}
    >
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("apiPerformance")}
          </h1>
          <p className="text-gray-600 mt-2">{t("apiPerformanceDesc")}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="1h">{t("1h")}</option>
            <option value="6h">{t("6h")}</option>
            <option value="24h">{t("24h")}</option>
            <option value="7d">{t("7d")}</option>
          </select>

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
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Average Response Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${getPerformanceColor(
                  metrics.averageResponseTime,
                  { good: 200, warning: 500 },
                )}`}
              >
                {formatDuration(metrics.averageResponseTime)}
              </p>
              <p className="text-sm text-gray-500">{t("avgResponseTime")}</p>
            </div>
          </div>
        </motion.div>

        {/* Requests Per Minute */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.requestsPerMinute.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">{t("requestsPerMinute")}</p>
            </div>
          </div>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${getPerformanceColor(
                  100 - metrics.successRate,
                  { good: 5, warning: 10 },
                )}`}
              >
                {metrics.successRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">{t("successRate")}</p>
            </div>
          </div>
        </motion.div>

        {/* Total Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Server className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalRequests.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{t("totalRequests")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Endpoint Performance and Status Codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Endpoint Performance */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("endpointPerformance")}
            </h2>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Endpoints</option>
              {endpoints.map((ep, index) => (
                <option key={index} value={ep.endpoint}>
                  {ep.endpoint}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredEndpoints.map((endpoint, index) => {
              const StatusIcon = getStatusIcon(endpoint.status);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl border"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getMethodColor(
                        endpoint.method,
                      )}`}
                    >
                      <span className="text-xs font-bold">
                        {endpoint.method}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {endpoint.endpoint}
                      </p>
                      <p className="text-xs text-gray-500">
                        {endpoint.requestCount} requests •{" "}
                        {endpoint.successRate.toFixed(1)}% success
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`flex items-center space-x-2 ${getStatusColor(
                        endpoint.status,
                      )}`}
                    >
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-medium capitalize">
                        {endpoint.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDuration(endpoint.averageResponseTime)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Status Code Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("statusCodeDistribution")}
          </h2>
          <div className="space-y-3">
            {statusCodes.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusCodeColor(
                      status.code,
                    )}`}
                  >
                    {status.code}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {status.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {status.count} requests
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {status.percentage.toFixed(1)}%
                  </p>
                  <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("requestLogs")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("method")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("endpoint")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("status")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("avgResponseTime")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("ipAddress")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t("timestamp")}
                </th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request) => (
                <tr key={request.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${getMethodColor(
                        request.method,
                      )}`}
                    >
                      {request.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {request.endpoint}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusCodeColor(
                        request.statusCode,
                      )}`}
                    >
                      {request.statusCode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDuration(request.responseTime)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {request.ipAddress}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {parseTimestamp(request.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
