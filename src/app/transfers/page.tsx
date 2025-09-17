"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Menu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  MapPin,
  X,
} from "lucide-react";
import TransferRequestCard from "@/components/dashboard/TransferRequestCard";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";
import TransferFormModal from "@/components/modals/TransferFormModal";

interface TransferRequest {
  _id: string;
  transferId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    age: number;
  };
  fromHospital: string;
  toHospital: string;
  requestedBy: {
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
  notes?: string;
}

export default function TransfersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch transfers from API
  const fetchTransfers = async (statusFilter?: string) => {
    if (!isAuthenticated) return; // Don't fetch if not authenticated

    setLoading(true);
    setError(null);

    try {
      // Build URL with status filter
      const url = new URL("/api/transfers", window.location.origin);
      if (statusFilter && statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setTransfers(data.data.transfers || []);
      } else {
        throw new Error(data.error || "Failed to fetch transfers");
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transfers"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransfers();
    }
  }, [isAuthenticated]);

  // Refetch when filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransfers(filter);
    }
  }, [filter, isAuthenticated]);

  // Filter transfers based on priority and search term (status filtering is done server-side)
  let filteredTransfers = transfers.filter((transfer) => {
    const matchesPriority =
      !priorityFilter || transfer.priority === priorityFilter;
    const matchesSearch =
      !searchTerm ||
      transfer.patientInfo.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.patientInfo.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.transferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.fromHospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.toHospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.reason.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPriority && matchesSearch;
  });

  // Sort transfers
  if (sortBy === "priority") {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        //@ts-ignore
        priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  } else {
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        new Date(b.requestedDate).getTime() -
        new Date(a.requestedDate).getTime()
    );
  }

  // Statistics
  const stats = useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter((t) => t.status === "pending").length;
    const urgent = transfers.filter((t) => t.priority === "urgent").length;
    const completed = transfers.filter((t) => t.status === "completed").length;

    return { total, pending, urgent, completed };
  }, [transfers]);

  const handleAcceptTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((transfer) =>
        transfer._id === transferId
          ? { ...transfer, status: "accepted" as const }
          : transfer
      )
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTransfers(filter);
    } catch (error) {
      console.error("Error refreshing transfers:", error);
      // Don't show error to user during refresh, just log it
    } finally {
      setIsRefreshing(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render page if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {user && (
        <Sidebar user={user} onLogout={logout} onToggle={setSidebarCollapsed} />
      )}

      {/* Main Content */}
      <div
        className={`ml-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-28" : "lg:ml-80"
        }`}
      >
        {/* Header */}
        {user && (
          <DashboardHeader
            user={user}
            onLogout={logout}
            pageTitle="Transfers"
            showSearchButton={true}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        <div className="p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-3xl p-6 sidebar-shadow border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Transfers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sidebar-shadow border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-amber-100 rounded-2xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sidebar-shadow border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.urgent}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sidebar-shadow border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl sidebar-shadow border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Filter & Sort
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors"
              >
                <Filter size={16} />
                <span className="text-sm font-medium">
                  {showFilters ? "Hide" : "Show"} Filters
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          value={filter}
                          onChange={(e) =>
                            setFilter(
                              e.target.value as
                                | "all"
                                | "pending"
                                | "accepted"
                                | "in_progress"
                                | "completed"
                                | "cancelled"
                            )
                          }
                          className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <div className="relative">
                        <select
                          value={priorityFilter || ""}
                          onChange={(e) =>
                            setPriorityFilter(e.target.value || null)
                          }
                          className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <option value="">All Priorities</option>
                          <option value="urgent">🔴 Urgent</option>
                          <option value="high">🟠 High</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="low">🟢 Low</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSortBy("date")}
                          className={`px-3 py-1 rounded-xl text-xs font-medium ${
                            sortBy === "date"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Date
                        </button>
                        <button
                          onClick={() => setSortBy("priority")}
                          className={`px-3 py-1 rounded-xl text-xs font-medium ${
                            sortBy === "priority"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Priority
                        </button>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setFilter("all");
                          setPriorityFilter(null);
                          setSearchTerm("");
                          setSortBy("date");
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl font-medium hover:from-gray-200 hover:to-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200 text-sm shadow-sm"
                      >
                        <span className="flex items-center justify-center">
                          <X className="w-4 h-4 mr-1" />
                          Clear All
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6"
            >
              {error}
            </motion.div>
          )}

          {/* Loading State */}
          {loading && <LoadingSpinner />}

          {/* Transfer Requests Grid */}
          {!loading && !error && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredTransfers.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  className="col-span-full text-center py-12 bg-gray-50 rounded-3xl sidebar-shadow"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
                      <MapPin size={24} className="text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No transfer requests found
                    </h3>
                    <p className="text-gray-500 max-w-sm text-sm">
                      {searchTerm
                        ? `No results for "${searchTerm}". Try a different search term.`
                        : filter === "all"
                        ? "There are no transfer requests at the moment."
                        : `There are no ${filter.replace(
                            "_",
                            " "
                          )} transfer requests.`}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-4 px-4 py-2 bg-green-100 text-green-700 rounded-2xl text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                filteredTransfers.map((transfer) => (
                  <motion.div key={transfer._id} variants={itemVariants} layout>
                    <TransferRequestCard
                      transfer={transfer}
                      onAccept={handleAcceptTransfer}
                      currentUserId={user?._id || ""}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Results Summary */}
          {!loading && !error && filteredTransfers.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Showing {filteredTransfers.length} of {transfers.length}{" "}
                transfers
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button - Only show for managers */}
      {user?.userType === "manager" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
        >
          <Plus size={24} className="text-white" />
        </motion.button>
      )}

      {/* Transfer Form Modal */}
      <TransferFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Refresh the transfers list when a new transfer is created
          handleRefresh();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
