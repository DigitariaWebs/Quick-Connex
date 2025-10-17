"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  Flag,
  FileText,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Ban,
  CheckSquare,
  Square,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { AdminLayout } from "@/components/features/admin";
import LoadingSpinner from "@/components/features/dashboard/LoadingSpinner";
import { TransferDetailsModal } from "@/components/ui/modals";

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
  const router = useRouter();

  // State management
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<TransferStats | null>(null);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null
  );

  // Filtering state
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch transfers");
      }

      const data = await response.json();

      if (data.success) {
        setTransfers(data.data.transfers || []);
        setStats(data.data.stats);
        setCurrentPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.pages);
        setTotalCount(data.data.pagination.total);
      } else {
        throw new Error(data.message || "Failed to fetch transfers");
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transfers"
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

  // Refetch when filters change
  useEffect(() => {
    if (!loading) {
      fetchTransfers(1);
    }
  }, [filters, sortBy, sortOrder]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransfers(currentPage);
  };

  // Handle filter changes
  const handleFilterChange = (
    filterType: keyof TransferFilters,
    value: any
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

  // Handle bulk selection
  const handleSelectTransfer = (transferId: string) => {
    setSelectedTransfers((prev) =>
      prev.includes(transferId)
        ? prev.filter((id) => id !== transferId)
        : [...prev, transferId]
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
        setShowBulkActions(false);

        // Show success message
        console.log(
          `Bulk ${action} completed: ${data.data.successCount} successful, ${data.data.errorCount} failed`
        );
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      setError(
        error instanceof Error ? error.message : "Bulk operation failed"
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
    setSelectedTransferId(transferId);
    setShowTransferModal(true);
  };

  const handleCloseModal = () => {
    setShowTransferModal(false);
    setSelectedTransferId(null);
  };

  const handleTransferUpdate = () => {
    // Refresh the transfers list when a transfer is updated
    fetchTransfers(currentPage);
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "text-yellow-600 bg-yellow-50",
          icon: Clock,
          label: "Pending",
        };
      case "accepted":
        return {
          color: "text-blue-600 bg-blue-50",
          icon: CheckCircle2,
          label: "Accepted",
        };
      case "in_progress":
        return {
          color: "text-purple-600 bg-purple-50",
          icon: Users,
          label: "In Progress",
        };
      case "completed":
        return {
          color: "text-green-600 bg-green-50",
          icon: CheckCircle2,
          label: "Completed",
        };
      case "cancelled":
        return {
          color: "text-red-600 bg-red-50",
          icon: XCircle,
          label: "Cancelled",
        };
      default:
        return {
          color: "text-gray-600 bg-gray-50",
          icon: Clock,
          label: status,
        };
    }
  };

  // Get priority color and icon
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          color: "text-red-600 bg-red-50",
          icon: AlertTriangle,
          label: "Urgent",
        };
      case "high":
        return {
          color: "text-orange-600 bg-orange-50",
          icon: Flag,
          label: "High",
        };
      case "medium":
        return {
          color: "text-yellow-600 bg-yellow-50",
          icon: Flag,
          label: "Medium",
        };
      case "low":
        return {
          color: "text-green-600 bg-green-50",
          icon: Flag,
          label: "Low",
        };
      default:
        return {
          color: "text-gray-600 bg-gray-50",
          icon: Flag,
          label: priority,
        };
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "patient":
        return Users;
      case "envelope":
        return FileText;
      case "medical_instruments":
        return AlertTriangle;
      default:
        return FileText;
    }
  };

  if (loading && transfers.length === 0) {
    return (
      <AdminLayout pageTitle="Transfer Management">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Transfer Management">
      {/* Header with Stats */}
      <div className="mb-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-bold text-gray-900 mt-1"
                  >
                    {stats.total}
                  </motion.p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-yellow-50 to-white p-5 rounded-2xl border border-yellow-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-yellow-700 mt-1"
                  >
                    {stats.pending}
                  </motion.p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    In Progress
                  </p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-purple-700 mt-1"
                  >
                    {stats.inProgress}
                  </motion.p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-green-50 to-white p-5 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-bold text-green-700 mt-1"
                  >
                    {stats.completed}
                  </motion.p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-red-50 to-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Urgent</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold text-red-700 mt-1"
                  >
                    {stats.urgent}
                  </motion.p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Cancelled</p>
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-2xl font-bold text-gray-700 mt-1"
                  >
                    {stats.cancelled}
                  </motion.p>
                </div>
                <div className="bg-gray-100 p-3 rounded-xl">
                  <XCircle className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Filters & Search
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-indigo-100 transition-all duration-200"
          >
            <Filter size={16} />
            <span className="font-medium">Filters</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </motion.button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search transfers by ID, patient name, or reason..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
          />
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  multiple
                  value={filters.status}
                  onChange={(e) =>
                    handleFilterChange(
                      "status",
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      )
                    )
                  }
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  multiple
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange(
                      "priority",
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      )
                    )
                  }
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  multiple
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange(
                      "category",
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      )
                    )
                  }
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="patient">Patient</option>
                  <option value="envelope">Envelope</option>
                  <option value="medical_instruments">
                    Medical Instruments
                  </option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={filters.dateRange?.start || ""}
                    onChange={(e) =>
                      handleFilterChange("dateRange", {
                        ...filters.dateRange,
                        start: e.target.value,
                      })
                    }
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={filters.dateRange?.end || ""}
                    onChange={(e) =>
                      handleFilterChange("dateRange", {
                        ...filters.dateRange,
                        end: e.target.value,
                      })
                    }
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bulk Actions */}
      {selectedTransfers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-purple-700">
                {selectedTransfers.length} transfer
                {selectedTransfers.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBulkOperation("cancel")}
                  className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-50 text-red-700 rounded-xl hover:from-red-200 hover:to-red-100 transition-all duration-200 text-sm font-medium shadow-sm"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    handleBulkOperation("update_status", "completed")
                  }
                  className="px-4 py-2 bg-gradient-to-r from-green-100 to-green-50 text-green-700 rounded-xl hover:from-green-200 hover:to-green-100 transition-all duration-200 text-sm font-medium shadow-sm"
                >
                  Mark Complete
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    handleBulkOperation("update_priority", "urgent")
                  }
                  className="px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 rounded-xl hover:from-orange-200 hover:to-orange-100 transition-all duration-200 text-sm font-medium shadow-sm"
                >
                  Set Urgent
                </motion.button>
              </div>
            </div>
            <button
              onClick={() => setSelectedTransfers([])}
              className="text-purple-600 hover:text-purple-800 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Transfers Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
      >
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Transfers ({totalCount})
            </h3>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleExport("csv")}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 font-medium shadow-sm"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleExport("json")}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-200 font-medium shadow-sm"
              >
                <Download size={16} />
                <span>Export JSON</span>
              </motion.button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No transfers found</p>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedTransfers.length === transfers.length &&
                        transfers.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transfer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient/Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer) => {
                  const statusInfo = getStatusInfo(transfer.status);
                  const priorityInfo = getPriorityInfo(transfer.priority);
                  const CategoryIcon = getCategoryIcon(
                    transfer.transferCategory
                  );
                  const isSelected = selectedTransfers.includes(transfer._id);

                  return (
                    <motion.tr
                      key={transfer._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{
                        backgroundColor: isSelected
                          ? "rgb(250 245 255)"
                          : "rgb(249 250 251)",
                        transition: { duration: 0.2 },
                      }}
                      className={`transition-colors duration-200 ${
                        isSelected ? "bg-purple-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectTransfer(transfer._id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <CategoryIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transfer.transferId}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {transfer.transferCategory.replace("_", " ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transfer.patientInfo ? (
                            <div>
                              <div className="font-medium">
                                {transfer.patientInfo.firstName}{" "}
                                {transfer.patientInfo.lastName}
                              </div>
                              <div className="text-gray-500">
                                Age: {transfer.patientInfo.age} | Dossier:{" "}
                                {transfer.patientInfo.dossierNumber || "N/A"}
                              </div>
                            </div>
                          ) : transfer.transferData?.envelopeInfo ? (
                            <div>
                              <div className="font-medium">
                                {transfer.transferData.envelopeInfo.contents}
                              </div>
                              <div className="text-gray-500">
                                From:{" "}
                                {transfer.transferData.envelopeInfo.senderName}
                              </div>
                            </div>
                          ) : transfer.transferData?.equipmentInfo ? (
                            <div>
                              <div className="font-medium">
                                {
                                  transfer.transferData.equipmentInfo
                                    .equipmentName
                                }
                              </div>
                              <div className="text-gray-500">
                                Model:{" "}
                                {transfer.transferData.equipmentInfo.model}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">No details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {transfer.fromHospital.name}
                          </div>
                          <div className="text-gray-500">
                            to {transfer.toHospital.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          <statusInfo.icon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityInfo.color}`}
                        >
                          <priorityInfo.icon className="w-3 h-3 mr-1" />
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {transfer.requestedBy.firstName}{" "}
                            {transfer.requestedBy.lastName}
                          </div>
                          <div className="text-gray-500">
                            {transfer.requestedBy.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(
                            transfer.requestedDate
                          ).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(
                            transfer.requestedDate
                          ).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewTransfer(transfer._id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewTransfer(transfer._id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                            title="More Actions"
                          >
                            <MoreHorizontal size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 font-medium">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchTransfers(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  Previous
                </motion.button>
                <span className="px-4 py-2 text-sm text-gray-700 font-semibold bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                  Page {currentPage} of {totalPages}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fetchTransfers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  Next
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Details Modal */}
        <TransferDetailsModal
          isOpen={showTransferModal}
          onClose={handleCloseModal}
          transferId={selectedTransferId}
          onTransferUpdate={handleTransferUpdate}
        />
      </motion.div>
    </AdminLayout>
  );
}
