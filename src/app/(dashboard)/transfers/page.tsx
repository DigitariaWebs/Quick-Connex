"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  X,
  FileText,
  Plus,
} from "lucide-react";
import TransferRequestCard from "@/components/dashboard/actions/TransferRequestCard";
import Sidebar from "@/components/dashboard/core/Sidebar";
import DashboardHeader from "@/components/dashboard/core/DashboardHeader";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";
import TransferTimeline from "@/components/transfers/timeline/TransferTimeline";
import TransferFormModal from "@/components/transfers/modals/TransferFormModal";
import { BORDER_RADIUS, getTransferStatusConfig } from "@/constants";

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

export default function TransfersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useSession();
  const t = useTranslations("transfersPage");
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch transfers from API
  const fetchTransfers = async (statusFilter?: string) => {
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
          errorData.error || `HTTP error! status: ${response.status}`,
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
        error instanceof Error ? error.message : "Failed to fetch transfers",
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTransfers();
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    fetchTransfers(filter);
  }, [filter]);

  // Filter transfers based on priority and search term (status filtering is done server-side)
  let filteredTransfers = transfers.filter((transfer) => {
    const matchesPriority =
      !priorityFilter || transfer.priority === priorityFilter;

    // Helper function to get hospital name from either string or object
    const getHospitalName = (
      hospital: string | { name: string; [key: string]: any },
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
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        //@ts-ignore
        priorityOrder[b.priority] - priorityOrder[a.priority],
    );
  } else {
    filteredTransfers = [...filteredTransfers].sort(
      (a, b) =>
        new Date(b.requestedDate).getTime() -
        new Date(a.requestedDate).getTime(),
    );
  }

  // Statistics
  const stats = useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter((t) => t.status === "pending").length;
    const accepted = transfers.filter((t) => t.status === "accepted").length;
    const inProgress = transfers.filter(
      (t) => t.status === "in_progress",
    ).length;
    const completed = transfers.filter((t) => t.status === "completed").length;
    const urgent = transfers.filter((t) => t.priority === "urgent").length;
    const cancelled = transfers.filter((t) => t.status === "cancelled").length;

    return {
      total,
      pending,
      accepted,
      inProgress,
      completed,
      urgent,
      cancelled,
    };
  }, [transfers]);

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

  const handleSelectTransfer = (transfer: TransferRequest) => {
    // If clicking the same transfer, close it; otherwise select the new one
    if (selectedTransfer?._id === transfer._id) {
      setSelectedTransfer(null);
    } else {
      setSelectedTransfer(transfer);
    }
  };

  const handleTransferUpdate = (transferId: string) => {
    // Refresh the transfers list to get updated data from server
    fetchTransfers(filter);
  };

  const handleCloseTimeline = () => {
    setSelectedTransfer(null);
  };

  const handleMobileToggle = (isOpen: boolean) => {
    setIsMobileMenuOpen(isOpen);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleCreateTransfer = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleTransferCreated = () => {
    // Refresh the transfers list after creating a new transfer
    fetchTransfers();
    setIsCreateModalOpen(false);
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

  // Show loading spinner while fetching user data
  // Middleware handles authentication, so we trust user is authenticated if page loads
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("loadingTransfers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {user && (
        <Sidebar
          user={{
            ...user,
            phone: user.phone || "",
            status: user.status as
              | "pending"
              | "approved"
              | "rejected"
              | "suspended",
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
          }}
          onLogout={logout}
          onToggle={setSidebarCollapsed}
          onMobileToggle={handleMobileToggle}
          isMobileOpen={isMobileMenuOpen}
        />
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
            user={{
              ...user,
              phone: user.phone || "",
              status: user.status as
                | "pending"
                | "approved"
                | "rejected"
                | "suspended",
              createdAt: user.createdAt || new Date(),
              updatedAt: user.updatedAt || new Date(),
            }}
            onLogout={logout}
            pageTitle={t("title")}
            showSearchButton={true}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            onMobileMenuToggle={handleMobileMenuToggle}
            hideMobileMenu={!!selectedTransfer}
          />
        )}

        <div className="p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4 mb-6">
            {/* Total */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("total")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            {/* Pending */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <Clock
                    className={`w-5 h-5 lg:w-6 lg:h-6 ${
                      getTransferStatusConfig("pending").color
                    }`}
                  />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("pending")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </div>

            {/* Accepted */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <CheckCircle2
                    className={`w-5 h-5 lg:w-6 lg:h-6 ${
                      getTransferStatusConfig("accepted").color
                    }`}
                  />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("accepted")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.accepted}
                  </p>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <Clock
                    className={`w-5 h-5 lg:w-6 lg:h-6 ${
                      getTransferStatusConfig("in_progress").color
                    }`}
                  />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("inProgress")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.inProgress}
                  </p>
                </div>
              </div>
            </div>

            {/* Urgent */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("urgent")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.urgent}
                  </p>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div
              className={`bg-white ${BORDER_RADIUS["3xl"]} p-4 lg:p-6 sidebar-shadow border border-gray-100`}
            >
              <div className="flex items-center">
                <div className={`p-2 ${BORDER_RADIUS.lg}`}>
                  <CheckCircle2
                    className={`w-5 h-5 lg:w-6 lg:h-6 ${
                      getTransferStatusConfig("completed").color
                    }`}
                  />
                </div>
                <div className="ml-3 lg:ml-4">
                  <p className="text-xs lg:text-sm font-medium text-gray-600">
                    {t("completed")}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            className={`bg-white ${BORDER_RADIUS["3xl"]} sidebar-shadow border border-gray-100 p-4 lg:p-6 mb-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold text-gray-800">
                {t("filterAndSort")}
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors p-2 -m-2 min-h-[44px]"
              >
                <Filter size={16} />
                <span className="text-sm font-medium">
                  {showFilters ? t("hideFilters") : t("showFilters")}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("status")}
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
                                | "cancelled",
                            )
                          }
                          className={`w-full appearance-none bg-white border border-gray-200 ${BORDER_RADIUS["2xl"]} px-4 py-3 lg:py-3 text-sm text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 cursor-pointer min-h-[44px]`}
                        >
                          <option value="all">{t("allStatuses")}</option>
                          <option value="pending">{t("pending")}</option>
                          <option value="accepted">{t("accepted")}</option>
                          <option value="in_progress">{t("inProgress")}</option>
                          <option value="completed">{t("completed")}</option>
                          <option value="cancelled">{t("cancelled")}</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("priority")}
                      </label>
                      <div className="relative">
                        <select
                          value={priorityFilter || ""}
                          onChange={(e) =>
                            setPriorityFilter(e.target.value || null)
                          }
                          className={`w-full appearance-none bg-white border border-gray-200 ${BORDER_RADIUS["2xl"]} px-4 py-3 lg:py-3 text-sm text-gray-700 font-medium shadow-sm hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:shadow-lg transition-all duration-200 cursor-pointer min-h-[44px]`}
                        >
                          <option value="">{t("allPriorities")}</option>
                          <option value="urgent">🔴 {t("urgent")}</option>
                          <option value="high">🟠 {t("high")}</option>
                          <option value="medium">🟡 {t("medium")}</option>
                          <option value="low">🟢 {t("low")}</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("sortBy")}
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSortBy("date")}
                          className={`px-3 py-2 ${
                            BORDER_RADIUS.xl
                          } text-sm font-medium min-h-[44px] flex items-center justify-center ${
                            sortBy === "date"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {t("date")}
                        </button>
                        <button
                          onClick={() => setSortBy("priority")}
                          className={`px-3 py-2 ${
                            BORDER_RADIUS.xl
                          } text-sm font-medium min-h-[44px] flex items-center justify-center ${
                            sortBy === "priority"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {t("priority")}
                        </button>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setFilter("all");
                          setPriorityFilter(null);
                          setSearchTerm("");
                          setSortBy("date");
                        }}
                        className={`w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 ${BORDER_RADIUS["2xl"]} font-medium hover:from-gray-200 hover:to-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 transition-all duration-200 text-sm shadow-sm min-h-[44px] flex items-center justify-center`}
                      >
                        <span className="flex items-center justify-center">
                          <X className="w-4 h-4 mr-1" />
                          {t("clearAll")}
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
              className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 ${BORDER_RADIUS["2xl"]} mb-6`}
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
              className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredTransfers.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  className={`col-span-full text-center py-12 bg-gray-50 ${BORDER_RADIUS["3xl"]} sidebar-shadow`}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className={`w-16 h-16 bg-blue-50 ${BORDER_RADIUS["3xl"]} flex items-center justify-center mb-4`}
                    >
                      <FileText size={24} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      {t("noTransfers")}
                    </h3>
                    <p className="text-gray-500 max-w-sm text-sm">
                      {searchTerm
                        ? t("noResultsForSearch", { search: searchTerm })
                        : filter === "all"
                          ? t("noTransfersMessage")
                          : `There are no ${filter.replace("_", " ")} transfers.`}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className={`mt-4 px-4 py-2 bg-blue-100 text-blue-700 ${BORDER_RADIUS["2xl"]} text-sm font-medium hover:bg-blue-200 transition-colors`}
                      >
                        {t("clearSearch")}
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
                    className={`${
                      selectedTransfer?._id === transfer._id
                        ? "hidden lg:fixed lg:top-1/2 lg:left-1/4 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:z-50 lg:w-96"
                        : ""
                    }`}
                    animate={
                      selectedTransfer?._id === transfer._id
                        ? {
                            scale: 1.05,
                            zIndex: 50,
                          }
                        : {
                            scale: 1,
                            zIndex: 1,
                          }
                    }
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 200,
                      duration: 0.5,
                    }}
                  >
                    <TransferRequestCard
                      transfer={transfer}
                      onAccept={handleTransferUpdate}
                      onCancel={handleTransferUpdate}
                      onSelect={handleSelectTransfer}
                      currentUserId={user?._id || ""}
                      currentUserType={user?.userType || "employee"}
                      isSelected={selectedTransfer?._id === transfer._id}
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
                {t("showingResults", {
                  start: 1,
                  end: filteredTransfers.length,
                  total: transfers.length,
                })}
              </p>
            </div>
          )}

          {/* Floating Action Button for Managers */}
          {user?.userType === "manager" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateTransfer}
              className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Transfer Timeline */}
      {selectedTransfer && (
        <TransferTimeline
          transfer={selectedTransfer}
          onClose={handleCloseTimeline}
          isVisible={!!selectedTransfer}
        />
      )}

      {/* Transfer Creation Modal */}
      <TransferFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleTransferCreated}
      />
    </div>
  );
}
