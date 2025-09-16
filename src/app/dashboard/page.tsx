"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import TransferRequestCard from "@/components/dashboard/TransferRequestCard";
import Sidebar from "@/components/dashboard/Sidebar";
import TransferOverview from "@/components/dashboard/TransferOverview";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";
import TransferForm from "@/components/forms/TransferForm";
import SchedulingNotifications from "@/components/notifications/SchedulingNotifications";

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

interface User {
  _id: string;
  userType: "employee" | "manager";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  post?: string;
  class?: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransfers();
    }
  }, [filter, isAuthenticated]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use mock data API for now
      const statusParam = filter === "all" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/mock-transfers${statusParam}`);
      const data = await response.json();

      if (data.success) {
        setTransfers(data.data);
        calculateStats(data.data);
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

  // Don't render dashboard if not authenticated
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
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Menu size={20} className="text-gray-600" />
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
                Transfer Management Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Search - Hidden on mobile, shown on desktop */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Search Transfers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-12 py-2 rounded-lg border border-gray-200 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-48 lg:w-64"
                />
                <Search
                  size={16}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
              <button className="flex items-center space-x-2 bg-green-600 text-white px-3 lg:px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
                <Plus size={16} />
                <span className="hidden sm:inline">New Transfer</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {/* Mobile Search */}
          <div className="md:hidden mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Transfers"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-lg border border-gray-200 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <Search
                size={16}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Urgent Alerts */}
          {user && (
            <div className="mb-6">
              <UrgentAlerts
                urgentTransfers={[
                  {
                    id: "1",
                    transferId: "TRF-STAT-001",
                    patientName: "John Doe",
                    fromHospital: "Toronto General Hospital",
                    toHospital: "Sick Kids Hospital",
                    priority: "stat",
                    requestedTime: "2024-01-15 14:30",
                    reason: "Cardiac emergency - immediate transfer required",
                    timeElapsed: "15 min",
                  },
                ]}
              />
            </div>
          )}

          {/* Transfer Overview Stats */}
          {user && (
            <div className="mb-8">
              <TransferOverview
                userType={user.userType}
                stats={{
                  totalActive:
                    stats.totalPending +
                    stats.totalAccepted +
                    stats.totalInProgress,
                  completedToday: stats.totalCompleted,
                  pendingAcceptance: stats.totalPending,
                  urgent: 3,
                  averageProcessingTime: "2.5h",
                  successRate: 94,
                }}
              />
            </div>
          )}

          {/* Scheduling Notifications */}
          <div className="mb-8">
            <SchedulingNotifications
              limit={5}
              showSummary={true}
              autoRefresh={true}
              refreshInterval={30000}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Quick Actions */}
            {user && (
              <QuickActions
                userType={user.userType}
                pendingCount={stats.totalPending}
                urgentCount={3}
                scheduledToday={5}
              />
            )}

            {/* Recent Activity */}
            <RecentActivity
              userType={user?.userType || "employee"}
              activities={[
                {
                  id: "1",
                  type: "transfer_accepted",
                  transferId: "TRF-001",
                  patientName: "Jane Smith",
                  description:
                    "Transfer accepted and assigned to transport team",
                  timestamp: "2 hours ago",
                  priority: "high",
                  fromHospital: "Mount Sinai Hospital",
                  toHospital: "Princess Margaret Hospital",
                  user: "Dr. Wilson",
                },
                {
                  id: "2",
                  type: "transfer_completed",
                  transferId: "TRF-002",
                  patientName: "Robert Johnson",
                  description: "Transfer completed successfully",
                  timestamp: "4 hours ago",
                  priority: "medium",
                  fromHospital: "St. Michael's Hospital",
                  toHospital: "Toronto Western Hospital",
                  user: "Nurse Kelly",
                },
              ]}
            />
          </div>

          {/* Transfer Requests Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Transfer Requests
              </h2>
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  {filteredTransfers.length} request
                  {filteredTransfers.length !== 1 ? "s" : ""}
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
                  className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100"
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
                                ? "bg-green-100 text-green-800"
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
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          Date
                        </button>
                        <button
                          onClick={() => setSortBy("priority")}
                          className={`px-3 py-1 rounded-md text-xs font-medium ${
                            sortBy === "priority"
                              ? "bg-green-100 text-green-800"
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
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredTransfers.length === 0 ? (
                  <motion.div
                    variants={itemVariants}
                    className="col-span-full text-center py-12 bg-gray-50 rounded-xl"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <Search size={24} className="text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No transfer requests found
                      </h3>
                      <p className="text-gray-500 max-w-sm text-sm">
                        {searchTerm
                          ? `No results for "${searchTerm}". Try a different search term.`
                          : filter === "all"
                          ? "There are no transfer requests at the moment."
                          : `There are no ${filter} transfer requests.`}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="mt-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  filteredTransfers.map((transfer) => (
                    <motion.div
                      key={transfer._id}
                      variants={itemVariants}
                      layout
                    >
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

          {/* Transfer Form - For Managers to create transfers */}
          {user?.userType === "manager" && (
            <div className="mt-8">
              <TransferForm onSuccess={handleRefresh} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
