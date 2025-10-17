"use client";

import { AdminLayout } from "@/components/features/admin";
import {
  AlertTriangle,
  Activity,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Bug,
  Database,
  Server,
  Globe,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

/**
 * Error Logs Viewer Page
 *
 * This page provides comprehensive error logging and analysis including:
 * - Real-time error streaming
 * - Error categorization and filtering
 * - Stack trace viewing
 * - Error frequency analysis
 * - Search and filtering capabilities
 * - Error export functionality
 */

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: "error" | "warning" | "info" | "debug";
  category: "api" | "database" | "auth" | "sse" | "system" | "client";
  message: string;
  stack?: string;
  source: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  resolved: boolean;
  tags: string[];
}

interface ErrorStats {
  totalErrors: number;
  errorsLast24h: number;
  errorsLastHour: number;
  criticalErrors: number;
  resolvedErrors: number;
  errorRate: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  topSources: Array<{ source: string; count: number; percentage: number }>;
}

export default function ErrorLogsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats>({
    totalErrors: 0,
    errorsLast24h: 0,
    errorsLastHour: 0,
    criticalErrors: 0,
    resolvedErrors: 0,
    errorRate: 0,
    topCategories: [],
    topSources: [],
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"timestamp" | "level" | "category">(
    "timestamp"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  // Fetch error data from API
  const fetchErrorData = async () => {
    try {
      const response = await fetch("/api/admin/monitoring/errors");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Convert timestamp strings to Date objects
          const processedErrors = data.data.errors.map((error: any) => ({
            ...error,
            timestamp: parseTimestamp(error.timestamp),
          }));
          setErrors(processedErrors);
          setStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch error data:", error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchErrorData();

    // Set up interval for real-time updates
    const interval = setInterval(fetchErrorData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchErrorData();
    setIsRefreshing(false);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "debug":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return AlertTriangle;
      case "warning":
        return AlertTriangle;
      case "info":
        return Activity;
      case "debug":
        return Bug;
      default:
        return Activity;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "api":
        return Globe;
      case "database":
        return Database;
      case "auth":
        return Activity;
      case "sse":
        return Zap;
      case "system":
        return Server;
      case "client":
        return Globe;
      default:
        return Activity;
    }
  };

  const toggleExpanded = (errorId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedErrors(newExpanded);
  };

  const filteredErrors = errors
    .filter((error) => {
      const matchesSearch =
        error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (error.userEmail &&
          error.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLevel =
        selectedLevel === "all" || error.level === selectedLevel;
      const matchesCategory =
        selectedCategory === "all" || error.category === selectedCategory;
      const matchesResolved = showResolved || !error.resolved;

      return (
        matchesSearch && matchesLevel && matchesCategory && matchesResolved
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "timestamp":
          // Ensure timestamps are Date objects and handle invalid dates
          const aTime = parseTimestamp(a.timestamp).getTime();
          const bTime = parseTimestamp(b.timestamp).getTime();
          comparison = aTime - bTime;
          break;
        case "level":
          const levelOrder = { error: 0, warning: 1, info: 2, debug: 3 };
          comparison = levelOrder[a.level] - levelOrder[b.level];
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

  const handleExport = () => {
    const csvContent = [
      [
        "Timestamp",
        "Level",
        "Category",
        "Message",
        "Source",
        "User",
        "IP Address",
        "Resolved",
      ].join(","),
      ...filteredErrors.map((error) =>
        [
          parseTimestamp(error.timestamp).toISOString(),
          error.level,
          error.category,
          `"${error.message.replace(/"/g, '""')}"`,
          error.source,
          error.userEmail || "N/A",
          error.ipAddress,
          error.resolved ? "Yes" : "No",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      pageTitle="Error Logs"
      pageDescription="Monitor and analyze system errors, warnings, and debug information"
    >
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-600 mt-2">
            Monitor and analyze system errors and warnings
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </motion.button>

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
      </div>

      {/* Error Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Errors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalErrors}
              </p>
              <p className="text-sm text-gray-500">Total Errors</p>
            </div>
          </div>
        </motion.div>

        {/* Errors Last 24h */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {stats.errorsLast24h}
              </p>
              <p className="text-sm text-gray-500">Last 24h</p>
            </div>
          </div>
        </motion.div>

        {/* Critical Errors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <Bug className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">
                {stats.criticalErrors}
              </p>
              <p className="text-sm text-gray-500">Critical</p>
            </div>
          </div>
        </motion.div>

        {/* Resolved Errors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {stats.resolvedErrors}
              </p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="api">API</option>
            <option value="database">Database</option>
            <option value="auth">Authentication</option>
            <option value="sse">SSE</option>
            <option value="system">System</option>
            <option value="client">Client</option>
          </select>

          {/* Sort Options */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="timestamp">Sort by Time</option>
              <option value="level">Sort by Level</option>
              <option value="category">Sort by Category</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">Show resolved errors</span>
          </label>
        </div>
      </motion.div>

      {/* Error List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Error Logs ({filteredErrors.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredErrors.map((error) => {
            const LevelIcon = getLevelIcon(error.level);
            const CategoryIcon = getCategoryIcon(error.category);
            const isExpanded = expandedErrors.has(error.id);

            return (
              <div
                key={error.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`p-2 rounded-lg ${getLevelColor(error.level)}`}
                    >
                      <LevelIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${getLevelColor(
                            error.level
                          )}`}
                        >
                          {error.level.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-1 text-gray-500">
                          <CategoryIcon className="w-4 h-4" />
                          <span className="text-sm">{error.category}</span>
                        </div>
                        {error.resolved && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold text-green-600 bg-green-50">
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {error.message}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{error.source}</span>
                        <span>{error.timestamp.toLocaleString()}</span>
                        {error.userEmail && <span>{error.userEmail}</span>}
                        {error.ipAddress && <span>{error.ipAddress}</span>}
                      </div>

                      {error.tags && error.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {error.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {error.stack && (
                      <button
                        onClick={() => toggleExpanded(error.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && error.stack && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Stack Trace:
                    </h4>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                      {error.stack}
                    </pre>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {filteredErrors.length === 0 && (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No errors found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters or search terms.
            </p>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}
