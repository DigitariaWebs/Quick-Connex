"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/layouts";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";

/**
 * Transfer Analytics Page
 *
 * Comprehensive analytics and reporting for transfers:
 * - Transfer statistics and trends
 * - Performance metrics
 * - Hospital analysis
 * - User activity analysis
 * - Export functionality
 */

interface AnalyticsData {
  overview: {
    dateRange: string;
    period: {
      start: string;
      end: string;
    };
    stats: {
      total: number;
      pending: number;
      accepted: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      urgent: number;
      high: number;
      medium: number;
      low: number;
      patient: number;
      envelope: number;
      medical_instruments: number;
    };
  };
  trends: {
    daily: Array<{
      _id: {
        year: number;
        month: number;
        day: number;
      };
      count: number;
      completed: number;
      cancelled: number;
    }>;
    statusDistribution: Array<{
      _id: {
        status: string;
        month: number;
        year: number;
      };
      count: number;
    }>;
    priorityDistribution: Array<{
      _id: string;
      count: number;
    }>;
    categoryDistribution: Array<{
      _id: string;
      count: number;
    }>;
  };
  performance: {
    metrics: {
      avgCompletionTime: number;
      minCompletionTime: number;
      maxCompletionTime: number;
      totalCompleted: number;
    };
    hospitalAnalysis: Array<{
      hospitalId: string;
      hospitalName: string;
      totalFrom: number;
      completedFrom: number;
      cancelledFrom: number;
      completionRate: number;
    }>;
    userActivity: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      userType: string;
      total: number;
      completed: number;
      cancelled: number;
      urgent: number;
      completionRate: number;
    }>;
  };
}

export default function TransferAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState("30d");
  const [hospitalId, setHospitalId] = useState("");
  const [userId, setUserId] = useState("");

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.set("dateRange", dateRange);
      if (hospitalId) queryParams.set("hospitalId", hospitalId);
      if (userId) queryParams.set("userId", userId);

      const response = await fetch(
        `/api/admin/transfers/analytics?${queryParams.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch analytics");
      }

      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch analytics"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, hospitalId, userId]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  // Handle export
  const handleExport = async (format: "csv" | "json") => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("export", format);
      queryParams.set("dateRange", dateRange);
      if (hospitalId) queryParams.set("hospitalId", hospitalId);
      if (userId) queryParams.set("userId", userId);

      const response = await fetch(
        `/api/admin/transfers/analytics?${queryParams.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transfer-analytics-${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      setError(error instanceof Error ? error.message : "Export failed");
    }
  };

  if (loading && !analytics) {
    return (
      <AdminLayout pageTitle="Transfer Analytics">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error || !analytics) {
    return (
      <AdminLayout pageTitle="Transfer Analytics">
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Analytics Error
          </h3>
          <p className="text-gray-600 mb-4">
            {error || "Failed to load analytics data"}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Transfer Analytics">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Transfer Analytics
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analytics and insights for transfer management
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter size={16} />
              <span>Filters</span>
              {showFilters ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExport("json")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Download size={16} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital
                </label>
                <input
                  type="text"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  placeholder="Hospital ID"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="User ID"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transfers</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.overview.stats.total}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.overview.stats.completed}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.overview.stats.inProgress}
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.overview.stats.pending}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-600">
                {analytics.overview.stats.urgent}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-gray-600">
                {analytics.overview.stats.cancelled}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Average Completion Time
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {analytics.performance.metrics.avgCompletionTime
                  ? `${Math.round(
                      analytics.performance.metrics.avgCompletionTime
                    )} min`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fastest Completion</span>
              <span className="text-lg font-semibold text-green-600">
                {analytics.performance.metrics.minCompletionTime
                  ? `${Math.round(
                      analytics.performance.metrics.minCompletionTime
                    )} min`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slowest Completion</span>
              <span className="text-lg font-semibold text-red-600">
                {analytics.performance.metrics.maxCompletionTime
                  ? `${Math.round(
                      analytics.performance.metrics.maxCompletionTime
                    )} min`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Completed</span>
              <span className="text-lg font-semibold text-blue-600">
                {analytics.performance.metrics.totalCompleted}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Category Distribution
          </h2>
          <div className="space-y-3">
            {analytics.trends.categoryDistribution.map((category) => (
              <div
                key={category._id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 capitalize">
                    {category._id.replace("_", " ")}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {category.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hospital Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Hospital Performance
        </h2>
        {analytics.performance.hospitalAnalysis.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Hospital
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Total Transfers
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Completed
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Cancelled
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.performance.hospitalAnalysis.map((hospital) => (
                  <tr
                    key={hospital.hospitalId}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {hospital.hospitalName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {hospital.totalFrom}
                    </td>
                    <td className="py-3 px-4 text-green-600">
                      {hospital.completedFrom}
                    </td>
                    <td className="py-3 px-4 text-red-600">
                      {hospital.cancelledFrom}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${hospital.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {hospital.completionRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hospital data available</p>
          </div>
        )}
      </div>

      {/* User Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          User Activity
        </h2>
        {analytics.performance.userActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Total Transfers
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Completed
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Cancelled
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Urgent
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.performance.userActivity.map((user) => (
                  <tr key={user.userId} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.userType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{user.total}</td>
                    <td className="py-3 px-4 text-green-600">
                      {user.completed}
                    </td>
                    <td className="py-3 px-4 text-red-600">{user.cancelled}</td>
                    <td className="py-3 px-4 text-orange-600">{user.urgent}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${user.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {user.completionRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No user activity data available</p>
          </div>
        )}
      </div>

      {/* Daily Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Trends
        </h2>
        {analytics.trends.daily.length > 0 ? (
          <div className="space-y-3">
            {analytics.trends.daily.slice(-7).map((day, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {new Date(
                      day._id.year,
                      day._id.month - 1,
                      day._id.day
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="font-medium text-gray-900">
                      {day.count}
                    </span>
                  </div>
                  <div className="text-sm text-green-600">
                    Completed:{" "}
                    <span className="font-medium">{day.completed}</span>
                  </div>
                  <div className="text-sm text-red-600">
                    Cancelled:{" "}
                    <span className="font-medium">{day.cancelled}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No trend data available</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
