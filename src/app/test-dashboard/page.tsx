"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  TestTube,
} from "lucide-react";
import TransferRequestCard from "@/components/dashboard/TransferRequestCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";

interface TransferRequest {
  _id: string;
  transferId: string;
  patientId: string;
  patient: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    currentHospital?: string;
    currentDepartment?: string;
  };
  fromHospital: string;
  fromDepartment: string;
  toHospital: string;
  toDepartment: string;
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

interface DashboardStats {
  totalPending: number;
  totalAccepted: number;
  totalInProgress: number;
  totalCompleted: number;
}

export default function TestDashboard() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    totalAccepted: 0,
    totalInProgress: 0,
    totalCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "accepted" | "in_progress" | "completed"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "priority">("date");
  const [useMockData, setUseMockData] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, [filter, useMockData]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = useMockData ? "/api/mock-transfers" : "/api/transfers";
      const statusParam = filter === "all" ? "" : `?status=${filter}`;
      const response = await fetch(`${baseUrl}${statusParam}`);
      const data = await response.json();

      if (data.success) {
        setTransfers(data.data);
        if (data.stats) {
          setStats(data.stats);
        } else {
          calculateStats(data.data);
        }
      } else {
        setError(data.error || "Failed to fetch transfers");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransfers();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const calculateStats = (transferData: TransferRequest[]) => {
    const newStats = {
      totalPending: transferData.filter((t) => t.status === "pending").length,
      totalAccepted: transferData.filter((t) => t.status === "accepted").length,
      totalInProgress: transferData.filter((t) => t.status === "in_progress")
        .length,
      totalCompleted: transferData.filter((t) => t.status === "completed")
        .length,
    };
    setStats(newStats);
  };

  const handleTransferAccepted = (transferId: string) => {
    // Remove the accepted transfer from the list or update its status
    setTransfers((prev) => prev.filter((t) => t._id !== transferId));
    // Refresh stats
    fetchTransfers();
  };

  const handleFilterChange = (
    newFilter: "all" | "pending" | "accepted" | "in_progress" | "completed"
  ) => {
    setFilter(newFilter);
    // Reset other filters when changing the main filter
    setPriorityFilter(null);
  };

  // Filter and sort transfers
  let filteredTransfers = transfers;

  // Apply status filter
  if (filter !== "all") {
    filteredTransfers = filteredTransfers.filter((t) => t.status === filter);
  }

  // Apply priority filter
  if (priorityFilter) {
    filteredTransfers = filteredTransfers.filter(
      (t) => t.priority === priorityFilter
    );
  }

  // Apply search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTransfers = filteredTransfers.filter(
      (t) =>
        t.patient.firstName.toLowerCase().includes(term) ||
        t.patient.lastName.toLowerCase().includes(term) ||
        t.patient.patientId.toLowerCase().includes(term) ||
        t.fromHospital.toLowerCase().includes(term) ||
        t.toHospital.toLowerCase().includes(term) ||
        t.reason.toLowerCase().includes(term)
    );
  }

  // Apply sorting
  if (sortBy === "priority") {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        //@ts-ignore
        priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  } else {
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        new Date(b.requestedDate).getTime() -
        new Date(a.requestedDate).getTime()
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-50 to-transparent opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-blue-50 to-transparent opacity-70"></div>
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-purple-100 blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-20"></div>
      </div>

      {/* Header */}
      <DashboardHeader userType="employee" />

      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Data Source Toggle */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {useMockData ? (
                  <TestTube size={20} className="text-purple-600" />
                ) : (
                  <Database size={20} className="text-blue-600" />
                )}
                <span className="font-medium text-gray-700">
                  Data Source: {useMockData ? "Mock Data" : "Real Database"}
                </span>
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  useMockData
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {useMockData ? "Testing Mode" : "Production Mode"}
              </div>
            </div>

            <button
              onClick={() => setUseMockData(!useMockData)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                useMockData
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              Switch to {useMockData ? "Real Data" : "Mock Data"}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <DashboardStats
          stats={stats}
          onFilterChange={handleFilterChange}
          currentFilter={filter}
        />

        {/* Main Content */}
        <div className="mt-8">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                Transfer Requests
              </h2>
              <div className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {filteredTransfers.length} request
                {filteredTransfers.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-12 py-2 rounded-lg border border-gray-200 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 md:w-64"
                />
                <Search
                  size={16}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>

              {/* Filter Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-1"
              >
                <Filter size={16} className="text-gray-600" />
                <span className="text-sm text-gray-700">Filter</span>
                {showFilters ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </motion.button>

              {/* Refresh Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <motion.div
                  animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.5, ease: "linear" }}
                >
                  <RefreshCw size={16} className="text-gray-600" />
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <div className="flex space-x-2">
                      {["all", "urgent", "high", "medium", "low"].map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setPriorityFilter(p === "all" ? null : p)
                          }
                          className={`px-3 py-1 rounded-md text-xs font-medium ${
                            (p === "all" && !priorityFilter) ||
                            priorityFilter === p
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {p === "all"
                            ? "All"
                            : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort By
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSortBy("date")}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          sortBy === "date"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        Date
                      </button>
                      <button
                        onClick={() => setSortBy("priority")}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${
                          sortBy === "priority"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
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
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredTransfers.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  className="col-span-full text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      No transfer requests found
                    </h3>
                    <p className="text-gray-500 max-w-sm">
                      {searchTerm
                        ? `No results for "${searchTerm}". Try a different search term.`
                        : filter === "all"
                        ? "There are no transfer requests at the moment."
                        : `There are no ${filter} transfer requests.`}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
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
                      onAccept={handleTransferAccepted}
                    />
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
