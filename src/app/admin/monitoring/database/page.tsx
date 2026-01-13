"use client";

import { AdminLayout } from "@/components/admin/layouts";
import {
  Database,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  HardDrive,
  Zap,
  BarChart3,
  Server,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Database Performance Monitoring Page
 *
 * This page provides comprehensive database monitoring including:
 * - Query execution times and performance
 * - Connection pool status
 * - Database size and growth metrics
 * - Slow query identification
 * - Index performance analysis
 * - Real-time database health
 */

interface DatabaseMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  databaseSize: number;
  indexHitRatio: number;
  cacheHitRatio: number;
  queriesPerSecond: number;
  uptime: number;
  version: string;
  host: string;
  port: number;
}

interface QueryPerformance {
  query: string;
  executionTime: number;
  timestamp: Date;
  type: "select" | "insert" | "update" | "delete" | "aggregate";
  collection: string;
  slow: boolean;
}

interface ConnectionInfo {
  id: string;
  status: "active" | "idle" | "waiting";
  connectedAt: Date;
  lastQuery: Date;
  queryCount: number;
  totalTime: number;
  user: string;
}

interface IndexPerformance {
  name: string;
  collection: string;
  size: number;
  usage: number;
  efficiency: number;
  lastUsed: Date;
}

export default function DatabasePerformancePage() {
  const t = useTranslations("adminMonitoring");
  const tCommon = useTranslations("common");
  const [metrics, setMetrics] = useState<DatabaseMetrics>({
    totalQueries: 0,
    averageQueryTime: 0,
    slowQueries: 0,
    connectionPoolSize: 0,
    activeConnections: 0,
    idleConnections: 0,
    databaseSize: 0,
    indexHitRatio: 0,
    cacheHitRatio: 0,
    queriesPerSecond: 0,
    uptime: 0,
    version: "",
    host: "",
    port: 0,
  });

  const [recentQueries, setRecentQueries] = useState<QueryPerformance[]>([]);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [indexes, setIndexes] = useState<IndexPerformance[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("1h");
  const [health, setHealth] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [collectionStats, setCollectionStats] = useState<any[]>([]);

  // Fetch database data from API
  const fetchDatabaseData = async () => {
    try {
      const response = await fetch(
        `/api/admin/monitoring/database?timeRange=${timeRange}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data.metrics);
          setRecentQueries(data.data.recentQueries);
          setConnections(data.data.connections);
          setIndexes(data.data.indexes);
          setHealth(data.data.health);
          setDbStats(data.data.dbStats);
          setCollectionStats(data.data.collectionStats || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch database data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchDatabaseData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchDatabaseData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

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
    await fetchDatabaseData();
    setIsRefreshing(false);
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case "select":
        return "text-blue-600 bg-blue-50";
      case "insert":
        return "text-green-600 bg-green-50";
      case "update":
        return "text-yellow-600 bg-yellow-50";
      case "delete":
        return "text-red-600 bg-red-50";
      case "aggregate":
        return "text-purple-600 bg-purple-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50";
      case "idle":
        return "text-blue-600 bg-blue-50";
      case "waiting":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

  return (
    <AdminLayout
      pageTitle={t("databasePerformance")}
      pageDescription={t("overview")}
    >
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("databasePerformance")}
          </h1>
          <p className="text-gray-600 mt-2">{t("overview")}</p>
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
            <span>{isRefreshing ? t("refreshing") : t("refresh")}</span>
          </motion.button>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Average Query Time */}
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
                  metrics.averageQueryTime,
                  { good: 100, warning: 500 },
                )}`}
              >
                {formatDuration(metrics.averageQueryTime)}
              </p>
              <p className="text-sm text-gray-500">{t("avgQueryTime")}</p>
            </div>
          </div>
        </motion.div>

        {/* Queries Per Second */}
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
                {metrics.queriesPerSecond.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">{t("queriesPerSecond")}</p>
            </div>
          </div>
        </motion.div>

        {/* Database Size */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(metrics.databaseSize)}
              </p>
              <p className="text-sm text-gray-500">{t("databaseSize")}</p>
            </div>
          </div>
        </motion.div>

        {/* Cache Hit Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.cacheHitRatio.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">{t("indexHitRatio")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Connection Pool and Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Connection Pool Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {t("connectionPool")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{t("connectionPoolSize")}</p>
              <span className="font-medium">{metrics.connectionPoolSize}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Connections</span>
              <span className="font-medium text-green-600">
                {metrics.activeConnections}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Idle Connections</span>
              <span className="font-medium text-blue-600">
                {metrics.idleConnections}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (metrics.activeConnections / metrics.connectionPoolSize) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Summary
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{t("slowQueries")}</p>
              <span className="font-medium">
                {metrics.totalQueries.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slow Queries</span>
              <span
                className={`font-medium ${
                  metrics.slowQueries > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {metrics.slowQueries}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">{t("cacheHitRatio")}</p>
              <span
                className={`font-medium ${getPerformanceColor(
                  metrics.indexHitRatio,
                  { good: 95, warning: 85 },
                )}`}
              >
                {metrics.indexHitRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Queries and Active Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Queries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Queries
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentQueries.map((query, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl border"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${getQueryTypeColor(
                      query.type,
                    )}`}
                  >
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {query.collection}
                    </p>
                    <p className="text-xs text-gray-500">
                      {query.query.substring(0, 50)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      query.slow ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {formatDuration(query.executionTime)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {parseTimestamp(query.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Connections
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-3 rounded-xl border"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${getConnectionStatusColor(
                      connection.status,
                    )}`}
                  >
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {connection.user}
                    </p>
                    <p className="text-xs text-gray-500">
                      {connection.queryCount} queries •{" "}
                      {formatDuration(connection.totalTime)} total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getConnectionStatusColor(
                      connection.status,
                    )}`}
                  >
                    {connection.status}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDuration(
                      Date.now() -
                        parseTimestamp(connection.connectedAt).getTime(),
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Database Health Status */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
          className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Database Health Status
          </h2>
          <div className="flex items-center space-x-4 mb-4">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                health.status === "healthy"
                  ? "bg-green-100 text-green-800"
                  : health.status === "degraded"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {health.status.toUpperCase()}
            </div>
            <div className="text-sm text-gray-600">
              MongoDB {metrics.version} on {metrics.host}:{metrics.port}
            </div>
            <div className="text-sm text-gray-600">
              Uptime: {formatDuration(metrics.uptime * 1000)}
            </div>
          </div>

          {health.issues.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Issues Detected:
              </h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {health.issues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {health.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Recommendations:
              </h3>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                {health.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Database Statistics */}
      {dbStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0 }}
          className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Database Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {dbStats.collections}
              </div>
              <div className="text-sm text-gray-600">Collections</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {dbStats.documents.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {dbStats.indexes}
              </div>
              <p className="text-sm text-gray-600">{t("idle")}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {formatBytes(dbStats.dataSize)}
              </div>
              <div className="text-sm text-gray-600">Data Size</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Collection Statistics */}
      {collectionStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Collection Statistics
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Collection
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Documents
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Size
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Avg Object Size
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Storage Size
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Index Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {collectionStats.map((collection, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {collection.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {collection.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatBytes(collection.size)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatBytes(collection.avgObjSize)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatBytes(collection.storageSize)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatBytes(collection.totalIndexSize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Index Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Index Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Index Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Collection
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Size
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Usage
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Efficiency
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody>
              {indexes.map((index, indexKey) => (
                <tr key={indexKey} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {index.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {index.collection}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatBytes(index.size)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {index.usage}%
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`font-medium ${getPerformanceColor(
                        index.efficiency,
                        { good: 80, warning: 60 },
                      )}`}
                    >
                      {index.efficiency}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {index.lastUsed.toLocaleString()}
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
