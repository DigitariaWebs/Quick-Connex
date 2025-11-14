"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart,
  Users,
  ArrowRightLeft,
  Download,
  RefreshCw,
  Calendar,
  AlertCircle,
  FileText,
  Search,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/layouts";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";
import UserReportView from "@/components/admin/reports/UserReportView";
import TransferReportView from "@/components/admin/reports/TransferReportView";
import TransferSummaryView from "@/components/admin/reports/TransferSummaryView";
import {
  UserReportData,
  TransferReportData,
  TransferSummaryReportData,
  TimeRange,
} from "@/types/reports/report.types";
import { CARD_STYLES } from "@/constants";

type ReportType = "users" | "transfer" | "transfer-summary";
type TransferReportMode = "individual" | "summary";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("users");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userReportData, setUserReportData] = useState<UserReportData | null>(
    null
  );
  const [transferReportData, setTransferReportData] =
    useState<TransferReportData | null>(null);
  const [transferSummaryData, setTransferSummaryData] =
    useState<TransferSummaryReportData | null>(null);
  const [transferId, setTransferId] = useState("");
  const [transferReportMode, setTransferReportMode] =
    useState<TransferReportMode>("summary");

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "all", label: "All time" },
  ];

  const fetchUserReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/reports/users?timeRange=${timeRange}`
      );
      const result = await response.json();
      if (result.success) {
        setUserReportData(result.data);
      } else {
        setError(result.message || "Failed to fetch user report");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user report"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferReport = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/reports/transfers/${id}`);
      const result = await response.json();
      if (result.success) {
        setTransferReportData(result.data);
      } else {
        setError(result.message || "Failed to fetch transfer report");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transfer report"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/reports/transfers/summary?timeRange=${timeRange}`
      );
      const result = await response.json();
      if (result.success) {
        setTransferSummaryData(result.data);
      } else {
        setError(result.message || "Failed to fetch transfer summary");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transfer summary"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    setError(null);
    if (type === "users") {
      setUserReportData(null);
    } else if (type === "transfer") {
      setTransferReportData(null);
      setTransferReportMode("individual");
    } else {
      setTransferSummaryData(null);
      setTransferReportMode("summary");
    }
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // Auto-load individual transfer report when transferId is entered
  useEffect(() => {
    if (reportType === "transfer" && transferReportMode === "individual") {
      if (transferId) {
        fetchTransferReport(transferId);
      } else {
        // Clear error and data when transferId is cleared
        setError(null);
        setTransferReportData(null);
      }
    }
  }, [transferId, reportType, transferReportMode]);

  const handleDownloadPDF = async () => {
    try {
      let response;
      let filename;

      if (reportType === "users") {
        response = await fetch("/api/admin/reports/users/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeRange }),
        });
        filename = `user-report-${timeRange}-${
          new Date().toISOString().split("T")[0]
        }.pdf`;
      } else if (
        reportType === "transfer" &&
        transferReportMode === "individual" &&
        transferId
      ) {
        response = await fetch(
          `/api/admin/reports/transfers/${transferId}/pdf`
        );
        filename = `transfer-report-${transferId}-${
          new Date().toISOString().split("T")[0]
        }.pdf`;
      } else if (
        reportType === "transfer-summary" ||
        transferReportMode === "summary"
      ) {
        response = await fetch("/api/admin/reports/transfers/summary/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeRange }),
        });
        filename = `transfer-summary-${timeRange}-${
          new Date().toISOString().split("T")[0]
        }.pdf`;
      } else {
        setError("Cannot download PDF: Invalid report configuration");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  // Auto-load reports when time range or report type changes
  useEffect(() => {
    if (reportType === "users") {
      fetchUserReport();
    } else if (
      reportType === "transfer-summary" ||
      (reportType === "transfer" && transferReportMode === "summary")
    ) {
      fetchTransferSummary();
    }
  }, [reportType, transferReportMode, timeRange]);

  return (
    <AdminLayout pageTitle="Reports">
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Sidebar - Report Type Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-3 lg:max-w-48">
              {/* User Reports Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => handleReportTypeChange("users")}
                className={`bg-blue-50 border border-blue-200 p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  reportType === "users"
                    ? "ring-2 ring-blue-500 ring-opacity-50"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                  {loading && reportType === "users" && (
                    <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
                <p className="text-[9px] lg:text-[10px] text-blue-700 font-medium uppercase tracking-wider mb-1">
                  User Reports
                </p>
                <p className="text-lg lg:text-2xl font-bold text-blue-600">
                  {userReportData?.totalUsers || "—"}
                </p>
              </motion.div>

              {/* Individual Transfer Report Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => handleReportTypeChange("transfer")}
                className={`bg-purple-50 border border-purple-200 p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  reportType === "transfer"
                    ? "ring-2 ring-purple-500 ring-opacity-50"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ArrowRightLeft className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                  {loading && reportType === "transfer" && (
                    <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
                <p className="text-[9px] lg:text-[10px] text-purple-700 font-medium uppercase tracking-wider mb-1">
                  Transfer
                </p>
                <p className="text-lg lg:text-2xl font-bold text-purple-600">
                  {transferReportData ? "✓" : "—"}
                </p>
              </motion.div>

              {/* Transfer Summary Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => handleReportTypeChange("transfer-summary")}
                className={`bg-indigo-50 border border-indigo-200 p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  reportType === "transfer-summary"
                    ? "ring-2 ring-indigo-500 ring-opacity-50"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileBarChart className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600" />
                  {loading && reportType === "transfer-summary" && (
                    <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
                <p className="text-[9px] lg:text-[10px] text-indigo-700 font-medium uppercase tracking-wider mb-1">
                  Summary
                </p>
                <p className="text-lg lg:text-2xl font-bold text-indigo-600">
                  {transferSummaryData?.statistics.total || "—"}
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-10">
          <div className={CARD_STYLES.rounded}>
            {/* Header */}
            <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200">
              <div className="flex items-center space-x-2 lg:space-x-4">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 flex items-center">
                  <FileBarChart className="w-5 h-5 lg:w-6 lg:h-6 mr-2 text-teal-600" />
                  {reportType === "users" && "User Reports"}
                  {reportType === "transfer" && "Individual Transfer Report"}
                  {reportType === "transfer-summary" &&
                    "Transfer Summary Report"}
                </h2>
              </div>
            </div>

            {/* Controls Section */}
            <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                {reportType === "users" && (
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-900 mb-2 uppercase tracking-wider">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Time Range
                    </label>
                    <select
                      value={timeRange}
                      onChange={(e) =>
                        handleTimeRangeChange(e.target.value as TimeRange)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                    >
                      {timeRangeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {reportType === "transfer" && (
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-900 mb-2 uppercase tracking-wider">
                      Transfer ID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={transferId}
                        onChange={(e) => setTransferId(e.target.value)}
                        placeholder="Enter transfer ID"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {reportType === "transfer-summary" && (
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-900 mb-2 uppercase tracking-wider">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Time Range
                    </label>
                    <select
                      value={timeRange}
                      onChange={(e) =>
                        handleTimeRangeChange(e.target.value as TimeRange)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-sm"
                    >
                      {timeRangeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-6 lg:p-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="p-6 lg:p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium mb-2">{error}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {reportType === "transfer" && !transferId
                    ? "Please enter a transfer ID"
                    : "The report will reload automatically when you change the filters"}
                </p>
              </div>
            ) : (
              <div className="p-4 lg:p-6">
                <AnimatePresence mode="wait">
                  {reportType === "users" && userReportData && (
                    <motion.div
                      key="user-report"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <UserReportView data={userReportData} />
                    </motion.div>
                  )}
                  {reportType === "transfer" && transferReportData && (
                    <motion.div
                      key="transfer-report"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TransferReportView data={transferReportData} />
                    </motion.div>
                  )}
                  {(reportType === "transfer-summary" ||
                    transferReportMode === "summary") &&
                    transferSummaryData && (
                      <motion.div
                        key="transfer-summary"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TransferSummaryView data={transferSummaryData} />
                      </motion.div>
                    )}
                  {!userReportData &&
                    !transferReportData &&
                    !transferSummaryData && (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">
                          No report loaded
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                          Select a report type and load data to view reports
                        </p>
                      </div>
                    )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Download PDF Button */}
      {((reportType === "users" && userReportData) ||
        (reportType === "transfer" && transferReportData) ||
        (reportType === "transfer-summary" && transferSummaryData)) && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleDownloadPDF}
          className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 lg:w-16 lg:h-16 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-50 hover:shadow-xl"
          title="Download PDF"
        >
          <Download className="w-6 h-6 lg:w-7 lg:h-7" />
        </motion.button>
      )}
    </AdminLayout>
  );
}
