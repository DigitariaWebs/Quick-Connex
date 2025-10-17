"use client";

import { AdminLayout } from "@/components/features/admin";
import {
  Radio,
  Users,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

/**
 * SSE Connections Monitoring Page
 *
 * This page provides detailed monitoring of Server-Sent Events connections including:
 * - Live connection count and status
 * - Connection quality metrics
 * - Reconnection attempts and failures
 * - Connection duration tracking
 * - Real-time connection events
 */

interface SSEConnection {
  id: string;
  userId: string;
  userEmail: string;
  connectedAt: Date;
  lastPing: Date;
  status: "connected" | "disconnected" | "reconnecting";
  quality: "excellent" | "good" | "poor" | "critical";
  reconnectionAttempts: number;
  totalEvents: number;
  userAgent: string;
  ipAddress: string;
}

interface SSEMetrics {
  totalConnections: number;
  activeConnections: number;
  disconnectedConnections: number;
  reconnectingConnections: number;
  averageConnectionDuration: number;
  totalEventsToday: number;
  eventsPerMinute: number;
  connectionQuality: {
    excellent: number;
    good: number;
    poor: number;
    critical: number;
  };
}

interface ConnectionEvent {
  id: string;
  type: "connect" | "disconnect" | "reconnect" | "error" | "ping";
  userId: string;
  userEmail: string;
  timestamp: Date;
  details: string;
  connectionId: string;
}

export default function SSEConnectionsPage() {
  const [connections, setConnections] = useState<SSEConnection[]>([]);
  const [metrics, setMetrics] = useState<SSEMetrics>({
    totalConnections: 0,
    activeConnections: 0,
    disconnectedConnections: 0,
    reconnectingConnections: 0,
    averageConnectionDuration: 0,
    totalEventsToday: 0,
    eventsPerMinute: 0,
    connectionQuality: {
      excellent: 0,
      good: 0,
      poor: 0,
      critical: 0,
    },
  });
  const [recentEvents, setRecentEvents] = useState<ConnectionEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [eventCount, setEventCount] = useState<number>(0);
  const [filter, setFilter] = useState<
    "all" | "active" | "disconnected" | "reconnecting"
  >("all");

  // Fetch SSE data from API
  const fetchSSEData = async () => {
    try {
      const response = await fetch("/api/admin/monitoring/sse");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnections(data.data.connections);
          setMetrics(data.data.metrics);
          setRecentEvents(data.data.recentEvents);
          setEventCount(data.data.recentEvents.length);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error("Failed to fetch SSE data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSSEData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchSSEData, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

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
    await fetchSSEData();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-50";
      case "disconnected":
        return "text-red-600 bg-red-50";
      case "reconnecting":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return Wifi;
      case "disconnected":
        return WifiOff;
      case "reconnecting":
        return Activity;
      default:
        return Radio;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "text-green-600 bg-green-50";
      case "good":
        return "text-blue-600 bg-blue-50";
      case "poor":
        return "text-yellow-600 bg-yellow-50";
      case "critical":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "connect":
        return CheckCircle;
      case "disconnect":
        return WifiOff;
      case "reconnect":
        return RefreshCw;
      case "error":
        return AlertTriangle;
      case "ping":
        return Activity;
      default:
        return Radio;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "connect":
        return "text-green-600 bg-green-50 border-green-200";
      case "disconnect":
        return "text-red-600 bg-red-50 border-red-200";
      case "reconnect":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "ping":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDuration = (startTime: Date | string) => {
    const now = new Date();
    const startDate = parseTimestamp(startTime);
    const diff = now.getTime() - startDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const filteredConnections = connections.filter((conn) => {
    if (filter === "all") return true;
    return conn.status === filter;
  });

  return (
    <AdminLayout
      pageTitle="SSE Connections"
      pageDescription="Monitor Server-Sent Events connections and real-time communication status"
    >
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SSE Connections</h1>
          <p className="text-gray-600 mt-2">
            Monitor real-time Server-Sent Events connections
          </p>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">
                Live data • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Auto-refresh every 3 seconds • {eventCount} events tracked
            </div>
          </div>
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
          <span>Refresh</span>
        </motion.button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Radio className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalConnections}
              </p>
              <p className="text-sm text-gray-500">Total Connections</p>
            </div>
          </div>
        </motion.div>

        {/* Active Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeConnections}
              </p>
              <p className="text-sm text-gray-500">Active Connections</p>
            </div>
          </div>
        </motion.div>

        {/* Total Events Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-xl">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalEventsToday}
              </p>
              <p className="text-sm text-gray-500">Events Today</p>
            </div>
          </div>
        </motion.div>

        {/* Average Duration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.averageConnectionDuration)}m
              </p>
              <p className="text-sm text-gray-500">Avg Duration</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Connection Quality Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Connection Quality Distribution
          </h2>
          <div className="text-sm text-gray-500">
            {metrics.totalConnections > 0
              ? `${metrics.totalConnections} total connections`
              : "No connections"}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {metrics.connectionQuality.excellent}
            </div>
            <div className="text-sm text-gray-500">Excellent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.connectionQuality.good}
            </div>
            <div className="text-sm text-gray-500">Good</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.connectionQuality.poor}
            </div>
            <div className="text-sm text-gray-500">Poor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {metrics.connectionQuality.critical}
            </div>
            <div className="text-sm text-gray-500">Critical</div>
          </div>
        </div>
      </motion.div>

      {/* Connections List and Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Connections */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Connections
            </h2>
            <div className="text-sm text-gray-500">
              {filteredConnections.length} of {connections.length} connections
            </div>
            <div className="flex space-x-2">
              {(["all", "active", "disconnected", "reconnecting"] as const).map(
                (filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filter === filterType
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredConnections.map((connection) => {
              const StatusIcon = getStatusIcon(connection.status);
              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 rounded-xl border"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getStatusColor(
                        connection.status
                      )}`}
                    >
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {connection.userEmail}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDuration(connection.connectedAt)} •{" "}
                        {connection.totalEvents} events
                      </p>
                      <p className="text-xs text-gray-400">
                        Last ping: {formatDuration(connection.lastPing)} ago
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(
                        connection.quality
                      )}`}
                    >
                      {connection.quality}
                    </div>
                    {connection.reconnectionAttempts > 0 && (
                      <p className="text-xs text-yellow-600 mt-1">
                        {connection.reconnectionAttempts} retries
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Events
            </h2>
            <div className="text-sm text-gray-500">
              {recentEvents.length} events
            </div>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentEvents.map((event) => {
              const EventIcon = getEventIcon(event.type);
              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-xl border ${getEventColor(
                    event.type
                  )}`}
                >
                  <div className="flex items-start space-x-3">
                    <EventIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{event.userEmail}</p>
                      <p className="text-xs mt-1 opacity-80">{event.details}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {parseTimestamp(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
