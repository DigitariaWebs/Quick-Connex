"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  MapPin,
  FileText,
  TrendingUp,
  BarChart3,
  Zap,
  ArrowRight,
  RefreshCw,
  User,
  Package,
  Stethoscope,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/layouts";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";
import { TransferDetailsModal } from "@/components/transfers/modals";
import ExpandableSearchBar from "@/components/shared/ui/expandable-search-bar";
import {
  CARD_STYLES,
  getTransferCategoryConfig,
  getTransferStatusConfig,
  getTransferPriorityConfig,
  STAT_CARD_COLORS,
} from "@/constants";

/**
 * Admin Transfers Page
 *
 * Comprehensive transfer management for administrators:
 * - Advanced filtering and search
 * - Bulk operations
 * - Real-time updates
 * - Export functionality
 * - Quick actions
 */

interface TransferRequest {
  _id: string;
  transferId: string;
  transferCategory: "patient" | "envelope" | "medical_instruments";
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };
  transferData?: {
    patientInfo?: {
      firstName: string;
      lastName: string;
      age: number;
      dossierNumber?: string;
    };
    envelopeInfo?: {
      envelopeNumber?: string;
      senderName: string;
      recipientName: string;
      contents: string;
    };
    equipmentInfo?: {
      equipmentName: string;
      serialNumber?: string;
      model: string;
      condition: string;
    };
  };
  fromHospital: {
    _id: string;
    name: string;
    address: string;
    organization: {
      type: string;
      name: string;
      region: string;
    };
  };
  toHospital: {
    _id: string;
    name: string;
    address: string;
    organization: {
      type: string;
      name: string;
      region: string;
    };
  };
  requestedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
  };
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
  };
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TransferStats {
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
}

interface TransferFilters {
  status: string[];
  priority: string[];
  category: string[];
  fromHospital: string[];
  toHospital: string[];
  requestedBy: string[];
  assignedTo: string[];
  dateRange: {
    start: string;
    end: string;
  } | null;
  search: string;
}

export default function AdminTransfersPage() {
  const t = useTranslations("adminTransfers");
  const tCommon = useTranslations("common");
  const tTransfers = useTranslations("transfers");

  // State management
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [allTransfers, setAllTransfers] = useState<TransferRequest[]>([]); // Store all transfers for client-side filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [originalStats, setOriginalStats] = useState<TransferStats | null>(
    null,
  );
  const [hasLoadedInitialStats, setHasLoadedInitialStats] = useState(false);

  // UI state
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>("all");

  // Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null,
  );
  const [selectedTransferData, setSelectedTransferData] =
    useState<TransferRequest | null>(null);

  // Filtering state (kept for API compatibility, but UI removed)
  const [filters, setFilters] = useState<TransferFilters>({
    status: [],
    priority: [],
    category: [],
    fromHospital: [],
    toHospital: [],
    requestedBy: [],
    assignedTo: [],
    dateRange: null,
    search: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState("requestedDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch transfers from API
  const fetchTransfers = async (page = 1, resetFilters = false) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();

      // Add filters
      if (filters.status.length > 0) {
        queryParams.set("status", filters.status.join(","));
      }
      if (filters.priority.length > 0) {
        queryParams.set("priority", filters.priority.join(","));
      }
      if (filters.category.length > 0) {
        queryParams.set("category", filters.category.join(","));
      }
      if (filters.fromHospital.length > 0) {
        queryParams.set("fromHospital", filters.fromHospital.join(","));
      }
      if (filters.toHospital.length > 0) {
        queryParams.set("toHospital", filters.toHospital.join(","));
      }
      if (filters.requestedBy.length > 0) {
        queryParams.set("requestedBy", filters.requestedBy.join(","));
      }
      if (filters.assignedTo.length > 0) {
        queryParams.set("assignedTo", filters.assignedTo.join(","));
      }
      if (filters.dateRange) {
        queryParams.set("dateStart", filters.dateRange.start);
        queryParams.set("dateEnd", filters.dateRange.end);
      }
      if (filters.search) {
        queryParams.set("search", filters.search);
      }

      // Add pagination and sorting
      queryParams.set("page", page.toString());
      queryParams.set("limit", "20");
      queryParams.set("sortBy", sortBy);
      queryParams.set("sortOrder", sortOrder);

      const response = await fetch(
        `/api/admin/transfers?${queryParams.toString()}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        let errorMessage = "Failed to fetch transfers";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("🔍 Frontend: API Response:", {
        success: data.success,
        hasData: !!data.data,
        transfersCount: data.data?.transfers?.length || 0,
        stats: data.data?.stats,
        pagination: data.data?.pagination,
      });

      // Debug: Log the specific stats values
      if (data.data?.stats) {
        console.log("🔍 Frontend: Stats breakdown:", {
          total: data.data.stats.total,
          pending: data.data.stats.pending,
          accepted: data.data.stats.accepted,
          inProgress: data.data.stats.inProgress,
          completed: data.data.stats.completed,
          cancelled: data.data.stats.cancelled,
        });
      }

      if (data.success) {
        const fetchedTransfers = data.data.transfers || [];
        setTransfers(fetchedTransfers);
        setAllTransfers(fetchedTransfers); // Store all transfers for client-side filtering
        setStats(data.data.stats);
        console.log("🔄 Admin page: Stats updated to:", data.data.stats);
        console.log("🔄 Admin page: Previous stats were:", stats);
        // Store original stats only on the very first load
        if (!hasLoadedInitialStats) {
          setOriginalStats(data.data.stats);
          setHasLoadedInitialStats(true);
        }
        setCurrentPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.pages);
        setTotalCount(data.data.pagination.total);
      } else {
        throw new Error(data.message || "Failed to fetch transfers");
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transfers",
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTransfers();
  }, []);

  // Client-side filtering for simple filters
  const applyClientSideFilters = () => {
    let filteredTransfers = [...allTransfers];

    // Apply status filter (from stats cards)
    if (activeFilter === "pending") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.status === "pending",
      );
    } else if (activeFilter === "inProgress") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.status === "in_progress",
      );
    } else if (activeFilter === "urgent") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.priority === "urgent",
      );
    }

    // Apply category filter (from category buttons)
    if (activeCategoryFilter === "patient") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.transferCategory === "patient",
      );
    } else if (activeCategoryFilter === "envelope") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.transferCategory === "envelope",
      );
    } else if (activeCategoryFilter === "medical_instruments") {
      filteredTransfers = filteredTransfers.filter(
        (t) => t.transferCategory === "medical_instruments",
      );
    }

    setTransfers(filteredTransfers);
  };

  // Apply client-side filters when they change
  useEffect(() => {
    if (allTransfers.length > 0) {
      applyClientSideFilters();
    }
  }, [activeFilter, activeCategoryFilter, allTransfers]);

  // Refetch when complex filters change (search, date range, etc.)
  useEffect(() => {
    if (!loading && (filters.search || filters.dateRange)) {
      fetchTransfers(1);
    }
  }, [filters.search, filters.dateRange, sortBy, sortOrder]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransfers(currentPage);
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof TransferFilters,
    value: any,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Handle search
  const handleSearch = (searchTerm: string) => {
    handleFilterChange("search", searchTerm);
  };

  // Handle stats card click for filtering (client-side only)
  const handleStatsCardClick = (filterType: string) => {
    setActiveFilter(filterType);
    // No need to update filters state for client-side filtering
  };

  // Handle category filter click (client-side only)
  const handleCategoryFilterClick = (categoryType: string) => {
    setActiveCategoryFilter(categoryType);
    // No need to update filters state for client-side filtering
  };

  // Handle bulk selection
  const handleSelectTransfer = (transferId: string) => {
    setSelectedTransfers((prev) =>
      prev.includes(transferId)
        ? prev.filter((id) => id !== transferId)
        : [...prev, transferId],
    );
  };

  const handleSelectAll = () => {
    if (selectedTransfers.length === transfers.length) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(transfers.map((t) => t._id));
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async (action: string, reason?: string) => {
    if (selectedTransfers.length === 0) return;

    try {
      const response = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bulkOperation: {
            action,
            transferIds: selectedTransfers,
            reason,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Bulk operation failed");
      }

      const data = await response.json();

      if (data.success) {
        // Refresh data
        await fetchTransfers(currentPage);
        setSelectedTransfers([]);

        // Show success message
        console.log(
          `Bulk ${action} completed: ${data.data.successCount} successful, ${data.data.errorCount} failed`,
        );
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      setError(
        error instanceof Error ? error.message : "Bulk operation failed",
      );
    }
  };

  // Handle export
  const handleExport = async (format: "csv" | "json") => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("export", format);

      // Add current filters to export
      if (filters.status.length > 0) {
        queryParams.set("status", filters.status.join(","));
      }
      if (filters.priority.length > 0) {
        queryParams.set("priority", filters.priority.join(","));
      }
      if (filters.category.length > 0) {
        queryParams.set("category", filters.category.join(","));
      }
      if (filters.dateRange) {
        queryParams.set("dateStart", filters.dateRange.start);
        queryParams.set("dateEnd", filters.dateRange.end);
      }

      const response = await fetch(
        `/api/admin/transfers/analytics?${queryParams.toString()}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transfers-export-${
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

  // Handle modal actions
  const handleViewTransfer = (transferId: string) => {
    const transferData = transfers.find((t) => t._id === transferId);
    setSelectedTransferId(transferId);
    setSelectedTransferData(transferData || null);
    setShowTransferModal(true);
  };

  const handleCloseModal = () => {
    setShowTransferModal(false);
    setSelectedTransferId(null);
    setSelectedTransferData(null);
  };

  const handleTransferUpdate = () => {
    // Refresh the transfers list and stats when a transfer is updated
    console.log("🔄 Admin page: Transfer updated, refreshing data...");
    console.log("🔄 Admin page: Current stats before refresh:", stats);
    setIsRefreshing(true);

    // Add a small delay to ensure the database has been updated
    setTimeout(() => {
      console.log("🔄 Admin page: Refreshing transfers after delay...");
      fetchTransfers(1); // Reset to page 1 to show updated data
    }, 500);
  };

  if (loading && transfers.length === 0) {
    return (
      <AdminLayout pageTitle={t("title")}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={t("title")}>
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Sidebar - Stats Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-0">
            {(originalStats || stats) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-3 lg:max-w-48">
                {/* Total - Beige */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("all")}
                  className={`${STAT_CARD_COLORS.total.bg} ${
                    STAT_CARD_COLORS.total.border
                  } p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "all"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp
                      className={`w-4 h-4 lg:w-5 lg:h-5 ${STAT_CARD_COLORS.total.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[9px] lg:text-[10px] ${STAT_CARD_COLORS.total.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    {t("total")}
                  </p>
                  <p
                    className={`text-lg lg:text-2xl font-bold ${STAT_CARD_COLORS.total.valueColor}`}
                  >
                    {(originalStats || stats)?.total}
                  </p>
                </motion.div>

                {/* Pending - Light Yellow */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("pending")}
                  className={`${STAT_CARD_COLORS.pending.bg} ${
                    STAT_CARD_COLORS.pending.border
                  } p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "pending"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Clock
                      className={`w-4 h-4 lg:w-5 lg:h-5 ${STAT_CARD_COLORS.pending.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[9px] lg:text-[10px] ${STAT_CARD_COLORS.pending.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    {t("pending")}
                  </p>
                  <p
                    className={`text-lg lg:text-2xl font-bold ${STAT_CARD_COLORS.pending.valueColor}`}
                  >
                    {(originalStats || stats)?.pending}
                  </p>
                </motion.div>

                {/* In Progress - Light Purple */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("inProgress")}
                  className={`${STAT_CARD_COLORS.inProgress.bg} ${
                    STAT_CARD_COLORS.inProgress.border
                  } p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "inProgress"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Zap
                      className={`w-4 h-4 lg:w-5 lg:h-5 ${STAT_CARD_COLORS.inProgress.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[9px] lg:text-[10px] ${STAT_CARD_COLORS.inProgress.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    {t("inProgress")}
                  </p>
                  <p
                    className={`text-lg lg:text-2xl font-bold ${STAT_CARD_COLORS.inProgress.valueColor}`}
                  >
                    {(originalStats || stats)?.inProgress}
                  </p>
                </motion.div>

                {/* Urgent - Light Pink */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("urgent")}
                  className={`${STAT_CARD_COLORS.urgent.bg} ${
                    STAT_CARD_COLORS.urgent.border
                  } p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "urgent"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle
                      className={`w-4 h-4 lg:w-5 lg:h-5 ${STAT_CARD_COLORS.urgent.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[9px] lg:text-[10px] ${STAT_CARD_COLORS.urgent.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    {t("urgent")}
                  </p>
                  <p
                    className={`text-lg lg:text-2xl font-bold ${STAT_CARD_COLORS.urgent.valueColor}`}
                  >
                    {(originalStats || stats)?.urgent}
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-10">
          {/* Transfers List Section */}
          <div className={CARD_STYLES.rounded}>
            {/* Header */}
            <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-2 lg:space-x-4 overflow-x-auto">
                  {/* Category Filter Buttons */}
                  <div className="flex items-center space-x-2">
                    {/* All Categories Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategoryFilterClick("all")}
                      className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                        activeCategoryFilter === "all"
                          ? "bg-gray-900 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <BarChart3 className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{tCommon("all")}</span>
                    </motion.button>

                    {/* Patient Transfers Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategoryFilterClick("patient")}
                      className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                        activeCategoryFilter === "patient"
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                      }`}
                    >
                      <User className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{t("patient")}</span>
                    </motion.button>

                    {/* Envelope Transfers Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategoryFilterClick("envelope")}
                      className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                        activeCategoryFilter === "envelope"
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                      }`}
                    >
                      <Package className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{t("envelope")}</span>
                    </motion.button>

                    {/* Medical Instruments Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        handleCategoryFilterClick("medical_instruments")
                      }
                      className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                        activeCategoryFilter === "medical_instruments"
                          ? "bg-purple-500 text-white shadow-md"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      <Stethoscope className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span>{t("medicalInstruments")}</span>
                    </motion.button>
                  </div>
                </div>
                {/* Search */}
                <div className="hidden lg:block w-full lg:w-auto">
                  <ExpandableSearchBar
                    onSearch={handleSearch}
                    placeholder={t("searchTransfers")}
                    expandDirection="left"
                    width={280}
                    className="h-10 lg:h-12"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <>
                {/* Table Header Skeleton */}
                <div className="px-4 lg:px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="col-span-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="col-span-2 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="col-span-1 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="col-span-1 h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                {/* Skeleton Rows */}
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="px-4 lg:px-6 py-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                            <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2"></div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                        </div>
                        <div className="col-span-3">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
                          <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3"></div>
                        </div>
                        <div className="col-span-1">
                          <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : error ? (
              <div className="p-6 lg:p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  {tCommon("retry")}
                </button>
              </div>
            ) : transfers.length === 0 ? (
              <div className="p-6 lg:p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">{t("noTransfers")}</p>
                <p className="text-gray-500 text-sm">
                  {t("tryAdjustingFilters")}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-4 lg:px-6 py-3 bg-gray-50 border-b border-gray-200 hidden lg:block">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="col-span-3">{t("transferId")}</div>
                    <div className="col-span-2">{t("patientItem")}</div>
                    <div className="col-span-3">{t("route")}</div>
                    <div className="col-span-2">{t("date")}</div>
                    <div className="col-span-1">{t("priority")}</div>
                    <div className="col-span-1 text-right">{t("status")}</div>
                  </div>
                </div>

                {/* Transfer List */}
                <div className="divide-y divide-gray-100">
                  {transfers.map((transfer, index) => {
                    const categoryConfig = getTransferCategoryConfig(
                      transfer.transferCategory,
                    );
                    const statusConfig = getTransferStatusConfig(
                      transfer.status,
                    );
                    const priorityConfig = getTransferPriorityConfig(
                      transfer.priority,
                    );
                    const CategoryIcon = categoryConfig.icon;

                    // Get patient/item name
                    const getItemName = () => {
                      if (transfer.patientInfo) {
                        return `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`;
                      } else if (transfer.transferData?.envelopeInfo) {
                        return transfer.transferData.envelopeInfo.contents;
                      } else if (transfer.transferData?.equipmentInfo) {
                        return transfer.transferData.equipmentInfo
                          .equipmentName;
                      }
                      return "N/A";
                    };

                    return (
                      <motion.div
                        key={transfer._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleViewTransfer(transfer._id)}
                        className="px-4 lg:px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        {/* Desktop View */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                          {/* Transfer ID Column */}
                          <div className="col-span-3 flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <CategoryIcon
                                className={`w-6 h-6 ${categoryConfig.color}`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {transfer.transferId}
                              </p>
                              <p className="text-xs text-gray-500 capitalize truncate">
                                {transfer.transferCategory.replace("_", " ")}
                              </p>
                            </div>
                          </div>

                          {/* Patient/Item Column */}
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getItemName()}
                            </p>
                          </div>

                          {/* Route Column */}
                          <div className="col-span-3">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-700 truncate flex-1">
                                {transfer.fromHospital?.name}
                              </p>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <p className="text-sm text-gray-700 truncate flex-1">
                                {transfer.toHospital?.name}
                              </p>
                            </div>
                          </div>

                          {/* Date Column */}
                          <div className="col-span-2">
                            <p className="text-sm text-gray-900 font-medium">
                              {new Date(
                                transfer.requestedDate,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                transfer.requestedDate,
                              ).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {/* Priority Column */}
                          <div className="col-span-1">
                            <div
                              className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`}
                              title={priorityConfig.label}
                            />
                          </div>

                          {/* Status Column */}
                          <div className="col-span-1 flex justify-end">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badgeClass}`}
                            >
                              {tTransfers(transfer.status)}
                            </span>
                          </div>
                        </div>

                        {/* Mobile/Tablet View */}
                        <div className="lg:hidden space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                              <div className="flex-shrink-0">
                                <CategoryIcon
                                  className={`w-5 h-5 lg:w-6 lg:h-6 ${categoryConfig.color}`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-semibold text-gray-900 truncate">
                                  {transfer.transferId}
                                </p>
                                <p className="text-xs text-gray-500 capitalize truncate">
                                  {t(`categories.${transfer.transferCategory}`)}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badgeClass}`}
                            >
                              {tTransfers(transfer.status)}
                            </span>
                          </div>
                          <div className="pl-7 lg:pl-13">
                            <p className="text-xs lg:text-sm font-medium text-gray-900 mb-2 truncate">
                              {getItemName()}
                            </p>
                            <div className="flex items-center space-x-1 lg:space-x-2 text-xs text-gray-600 mb-2">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {transfer.fromHospital?.name} →{" "}
                                {transfer.toHospital?.name}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {new Date(
                                  transfer.requestedDate,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`}
                                  title={priorityConfig.label}
                                />
                                <span className="capitalize">
                                  {priorityConfig.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 lg:px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-gray-600">
                    {t("showingResults", {
                      start: (currentPage - 1) * 20 + 1,
                      end: Math.min(currentPage * 20, totalCount),
                      total: totalCount,
                    })}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchTransfers(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <span className="flex items-center space-x-1">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        <span>{tCommon("previous")}</span>
                      </span>
                    </button>

                    <div className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg">
                      {t("pageOf", { current: currentPage, total: totalPages })}
                    </div>

                    <button
                      onClick={() => fetchTransfers(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <span className="flex items-center space-x-1">
                        <span>{tCommon("next")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Details Modal */}
      <TransferDetailsModal
        isOpen={showTransferModal}
        onClose={handleCloseModal}
        transferId={selectedTransferId}
        transferData={selectedTransferData}
        onTransferUpdate={handleTransferUpdate}
      />
    </AdminLayout>
  );
}
