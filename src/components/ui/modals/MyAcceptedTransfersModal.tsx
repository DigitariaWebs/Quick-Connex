"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  MapPin,
  ArrowRight,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import TransferRequestCard from "@/components/features/dashboard/TransferRequestCard";
import LoadingSpinner from "@/components/features/dashboard/LoadingSpinner";

interface TransferRequest {
  _id: string;
  transferId: string;
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };
  fromHospital:
    | string
    | {
        _id: string;
        name: string;
        address: string;
        organization: {
          type: string;
          name: string;
          region: string;
        };
      };
  toHospital:
    | string
    | {
        _id: string;
        name: string;
        address: string;
        organization: {
          type: string;
          name: string;
          region: string;
        };
      };
  fromHospitalName?: string;
  toHospitalName?: string;
  requestedBy: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
  };
  assignedTo?: {
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
}

interface MyAcceptedTransfersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserType: "employee" | "manager";
}

export default function MyAcceptedTransfersModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserType,
}: MyAcceptedTransfersModalProps) {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "in_progress" | "completed" | "cancelled"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");

  // Fetch accepted transfers from API
  const fetchMyTransfers = async (statusFilter?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Build URL with status filter
      const url = new URL("/api/transfers/my-accepted", window.location.origin);
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
        throw new Error(data.error || "Failed to fetch my transfers");
      }
    } catch (error) {
      console.error("Error fetching my transfers:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch my transfers"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMyTransfers();
    }
  }, [isOpen]);

  // Refetch when filter changes
  useEffect(() => {
    if (isOpen) {
      fetchMyTransfers(filter);
    }
  }, [filter, isOpen]);

  // Filter transfers based on priority and search term
  let filteredTransfers = transfers.filter((transfer) => {
    const matchesPriority =
      !priorityFilter || transfer.priority === priorityFilter;

    // Helper function to get hospital name from either string or object
    const getHospitalName = (
      hospital: string | { name: string; [key: string]: any }
    ) => {
      return typeof hospital === "string" ? hospital : hospital?.name || "";
    };

    const matchesSearch =
      !searchTerm ||
      transfer.patientInfo?.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.patientInfo?.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.patientInfo?.dossierNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.transferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getHospitalName(transfer.fromHospital)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      getHospitalName(transfer.toHospital)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.reason.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPriority && matchesSearch;
  });

  // Sort transfers
  if (sortBy === "priority") {
    const priorityOrder = { urgent: 2, low: 1 };
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
  const stats = {
    total: transfers.length,
    inProgress: transfers.filter((t) => t.status === "in_progress").length,
    completed: transfers.filter((t) => t.status === "completed").length,
    urgent: transfers.filter((t) => t.priority === "urgent").length,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMyTransfers(filter);
    } catch (error) {
      console.error("Error refreshing transfers:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransferUpdate = (transferId: string) => {
    // Refresh the transfers list to get updated data from server
    fetchMyTransfers(filter);
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: { duration: 0.2 },
    },
  };

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={backdropVariants}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Glassmorphism backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />

        {/* Modal content */}
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-6xl max-h-[90vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  My Accepted Transfers
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={20}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                <div className="flex items-center">
                  <Users size={16} className="text-blue-600 mr-2" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                <div className="flex items-center">
                  <Clock size={16} className="text-blue-600 mr-2" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">
                      In Progress
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.inProgress}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                <div className="flex items-center">
                  <AlertTriangle size={16} className="text-red-600 mr-2" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Urgent</p>
                    <p className="text-lg font-bold text-red-900">
                      {stats.urgent}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
                <div className="flex items-center">
                  <CheckCircle2 size={16} className="text-green-600 mr-2" />
                  <div>
                    <p className="text-xs text-green-600 font-medium">
                      Completed
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      {stats.completed}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-white/90 hover:shadow-md transition-all duration-300 shadow-sm"
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown
                  size={16}
                  className={showFilters ? "rotate-180" : ""}
                />
              </button>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/30 rounded-xl border border-gray-200/50">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-black mb-1">
                        Status
                      </label>
                      <div className="relative">
                        <select
                          value={filter}
                          onChange={(e) =>
                            setFilter(
                              e.target.value as
                                | "all"
                                | "in_progress"
                                | "completed"
                                | "cancelled"
                            )
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="all">All Statuses</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown size={18} className="text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-sm font-semibold text-black mb-1">
                        Priority
                      </label>
                      <div className="relative">
                        <select
                          value={priorityFilter || ""}
                          onChange={(e) =>
                            setPriorityFilter(e.target.value || null)
                          }
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="">All Priorities</option>
                          <option value="urgent">🔴 Urgent</option>
                          <option value="high">🟠 High</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="low">🟢 Low</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown size={18} className="text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sort By
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSortBy("date")}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            sortBy === "date"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-white/50 text-gray-700 hover:bg-white/70"
                          }`}
                        >
                          Date
                        </button>
                        <button
                          onClick={() => setSortBy("priority")}
                          className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            sortBy === "priority"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-white/50 text-gray-700 hover:bg-white/70"
                          }`}
                        >
                          Priority
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <p className="text-red-600 text-sm mb-2">
                  Failed to load transfers
                </p>
                <p className="text-gray-500 text-xs">{error}</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <User size={24} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No accepted transfers found
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm
                    ? `No results for "${searchTerm}". Try a different search term.`
                    : filter === "all"
                    ? "You haven't accepted any transfers yet."
                    : `You don't have any ${filter.replace(
                        "_",
                        " "
                      )} transfers.`}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-2xl text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredTransfers.map((transfer) => (
                  <motion.div key={transfer._id} variants={itemVariants} layout>
                    <TransferRequestCard
                      transfer={transfer}
                      onAccept={() => {}} // No accept action needed for accepted transfers
                      onCancel={handleTransferUpdate} // Handle cancellation
                      onSelect={() => {}} // Disable click behavior in this modal
                      currentUserId={currentUserId}
                      currentUserType={currentUserType}
                      isSelected={false} // No selection state in this modal
                    />
                  </motion.div>
                ))}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
