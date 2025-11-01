"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User as UserIcon,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Activity,
  Settings,
  Trash2,
  Ban,
  Unlock,
  Key,
  Download,
  Upload,
  TrendingUp,
  BarChart3,
  Sparkles,
  Zap,
  ArrowRight,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  FileText,
  UserPlus,
  UserCog,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/layouts";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";
import ExpandableSearchBar from "@/components/shared/ui/expandable-search-bar";
import UserDetailsModal from "@/components/shared/modals/UserDetailsModal";
import {
  BORDER_RADIUS,
  CARD_STYLES,
  getUserStatusConfig,
  getUserRoleConfig,
  USER_STAT_CARD_COLORS,
} from "@/constants";
import type {
  User,
  UserStats,
  UserFilters,
  UserListResponse,
} from "@/types/user";

/**
 * Admin Users Page
 *
 * Comprehensive user management for administrators:
 * - Advanced filtering and search
 * - Bulk operations
 * - Real-time updates
 * - Export functionality
 * - Quick actions
 */

export default function UserManagement() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users for client-side filtering
  const [stats, setStats] = useState<UserStats | null>(null);
  const [originalStats, setOriginalStats] = useState<UserStats | null>(null);
  const [hasLoadedInitialStats, setHasLoadedInitialStats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>("all");

  // Filters state
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    userType: [],
    status: [],
    organization: [],
    dateRange: {
      start: null,
      end: null,
    },
    verificationStatus: [],
    activityStatus: [],
  });

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();

      // Add filters
      if (filters.search) {
        queryParams.set("search", filters.search);
      }
      if (filters.userType.length > 0) {
        queryParams.set("userType", filters.userType.join(","));
      }
      if (filters.status.length > 0) {
        queryParams.set("status", filters.status.join(","));
      }
      if (filters.organization.length > 0) {
        queryParams.set("organization", filters.organization.join(","));
      }
      if (filters.dateRange.start) {
        queryParams.set("startDate", filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        queryParams.set("endDate", filters.dateRange.end.toISOString());
      }

      // Add pagination
      queryParams.set("page", currentPage.toString());
      queryParams.set("limit", pageSize.toString());

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch users";
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
      console.log("🔍 Frontend Users: API Response:", {
        success: data.success,
        hasData: !!data.data,
        usersCount: data.data?.users?.length || 0,
        total: data.data?.total,
        pagination: {
          page: data.data?.page,
          limit: data.data?.limit,
          totalPages: data.data?.totalPages,
        },
      });

      if (data.success) {
        const fetchedUsers = data.data.users;

        setUsers(fetchedUsers);
        setAllUsers(fetchedUsers); // Store all users for client-side filtering
        setTotalUsers(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        throw new Error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/admin/users/stats", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats);
          // Store original stats only on the very first load
          if (!hasLoadedInitialStats) {
            setOriginalStats(data.data.stats);
            setHasLoadedInitialStats(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  // Client-side filtering for simple filters
  const applyClientSideFilters = () => {
    let filteredUsers = [...allUsers];

    // Apply status filter (from stats cards)
    if (activeFilter === "approved") {
      filteredUsers = filteredUsers.filter((u) => u.status === "approved");
    } else if (activeFilter === "pending") {
      filteredUsers = filteredUsers.filter((u) => u.status === "pending");
    } else if (activeFilter === "suspended") {
      filteredUsers = filteredUsers.filter((u) => u.status === "suspended");
    } else if (activeFilter === "rejected") {
      filteredUsers = filteredUsers.filter((u) => u.status === "rejected");
    }
    // If activeFilter is "all", no additional filtering is applied

    // Apply role filter (from role buttons)
    if (activeRoleFilter === "employee") {
      filteredUsers = filteredUsers.filter((u) => u.userType === "employee");
    } else if (activeRoleFilter === "manager") {
      filteredUsers = filteredUsers.filter((u) => u.userType === "manager");
    }
    // If activeRoleFilter is "all", no additional filtering is applied

    // Calculate pagination for filtered results
    const totalFilteredUsers = filteredUsers.length;
    const totalPagesForFiltered = Math.max(
      1,
      Math.ceil(totalFilteredUsers / pageSize)
    );

    // Reset to page 1 if current page is beyond the available pages
    const newCurrentPage =
      currentPage > totalPagesForFiltered ? 1 : currentPage;

    // Update pagination state
    setTotalUsers(totalFilteredUsers);
    setTotalPages(totalPagesForFiltered);
    if (newCurrentPage !== currentPage) {
      setCurrentPage(newCurrentPage);
    }

    // Apply pagination to filtered results
    const startIndex = (newCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    setUsers(paginatedUsers);
  };

  // Apply client-side filters when they change
  useEffect(() => {
    // Only apply client-side filtering if there are active filters
    const hasActiveFilters =
      activeFilter !== "all" || activeRoleFilter !== "all";
    if (hasActiveFilters && allUsers.length > 0) {
      applyClientSideFilters();
    }
    // If no active filters, don't do anything - let server-side pagination handle it
  }, [activeFilter, activeRoleFilter, allUsers, currentPage]);

  // Fetch all users for client-side filtering
  const fetchAllUsers = async () => {
    try {
      const response = await fetch("/api/admin/users?limit=1000", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllUsers(data.data.users);
        }
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  };

  // When switching to filtered views, fetch all users for client-side filtering
  useEffect(() => {
    const hasActiveFilters =
      activeFilter !== "all" || activeRoleFilter !== "all";
    if (hasActiveFilters) {
      fetchAllUsers();
    }
  }, [activeFilter, activeRoleFilter]);

  // When switching back to "All Users", fetch fresh data from server
  useEffect(() => {
    if (activeFilter === "all" && activeRoleFilter === "all") {
      fetchUsers();
    }
  }, [activeFilter, activeRoleFilter]);

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, [currentPage, pageSize]);

  // Refetch when complex filters change (search, date range, etc.)
  useEffect(() => {
    if (filters.search || filters.dateRange.start || filters.dateRange.end) {
      fetchUsers();
    }
  }, [filters.search, filters.dateRange]);

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setFilters((prev) => ({ ...prev, search: searchTerm }));
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof UserFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
    fetchUserStats();
  };

  // Handle user selection
  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const validUsers = users.filter((user) => {
      if (!user._id) return false;
      const id =
        typeof user._id === "string"
          ? user._id
          : (user._id as any)?.toString?.() || String(user._id);
      return id && typeof id === "string" && id.trim() !== "";
    });
    if (selectedUsers.length === validUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(validUsers.map((user) => user._id));
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: "",
      userType: [],
      status: [],
      organization: [],
      dateRange: { start: null, end: null },
      verificationStatus: [],
      activityStatus: [],
    });
    setCurrentPage(1);
  };

  // Handle user selection for modal
  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Handle user modal close
  const handleCloseModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // Handle document download
  const handleDocumentDownload = (doc: any) => {
    // Create a temporary link element and trigger download
    const link = document.createElement("a");
    link.href = doc.downloadUrl;
    link.download = doc.originalName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle user update (local state update)
  const handleUserUpdate = (userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((user) => (user._id === userId ? { ...user, ...updates } : user))
    );
    setAllUsers((prev) =>
      prev.map((user) => (user._id === userId ? { ...user, ...updates } : user))
    );
  };

  // Handle user update from modal (refresh data)
  const handleUserUpdateFromModal = (
    action: "approve" | "reject" | "suspend" | "activate",
    userType: string
  ) => {
    // Update stats immediately for instant feedback
    updateStatsSmart(action, userType);

    // Refresh the users list and stats when a user is updated
    console.log("🔄 Admin page: User updated, refreshing data...");
    console.log("🔄 Admin page: Current stats before refresh:", stats);
    setIsRefreshing(true);

    // Add a small delay to ensure the database has been updated
    setTimeout(() => {
      console.log("🔄 Admin page: Refreshing users after delay...");
      fetchUsers(); // Refresh users list
      fetchUserStats(); // Refresh stats to ensure accuracy
    }, 500);
  };

  // Bulk operation helper functions
  const canBulkApprove = () => {
    return selectedUsers.some((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "pending";
    });
  };

  const canBulkReject = () => {
    return selectedUsers.some((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "pending";
    });
  };

  const canBulkSuspend = () => {
    return selectedUsers.some((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "approved";
    });
  };

  // Bulk approve users
  const handleBulkApprove = async () => {
    if (selectedUsers.length === 0) return;

    const pendingUsers = selectedUsers.filter((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "pending";
    });

    if (pendingUsers.length === 0) {
      alert("No pending users selected for approval.");
      return;
    }

    try {
      const response = await fetch("/api/admin/users/bulk-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ userIds: pendingUsers }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve users");
      }

      const data = await response.json();

      if (data.success) {
        // Update stats immediately
        updateStatsSmart("approve", "mixed");

        // Clear selection
        setSelectedUsers([]);

        // Refresh data
        setTimeout(() => {
          fetchUsers();
          fetchUserStats();
        }, 500);

        alert(`Successfully approved ${data.approvedCount} users.`);
      } else {
        throw new Error(data.message || "Failed to approve users");
      }
    } catch (error) {
      console.error("Error bulk approving users:", error);
      alert("Failed to approve users. Please try again.");
    }
  };

  // Bulk reject users
  const handleBulkReject = async () => {
    if (selectedUsers.length === 0) return;

    const pendingUsers = selectedUsers.filter((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "pending";
    });

    if (pendingUsers.length === 0) {
      alert("No pending users selected for rejection.");
      return;
    }

    const reason =
      prompt("Please provide a reason for rejection:") ||
      "Bulk rejection by administrator";

    try {
      const response = await fetch("/api/admin/users/bulk-reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ userIds: pendingUsers, reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject users");
      }

      const data = await response.json();

      if (data.success) {
        // Update stats immediately
        updateStatsSmart("reject", "mixed");

        // Clear selection
        setSelectedUsers([]);

        // Refresh data
        setTimeout(() => {
          fetchUsers();
          fetchUserStats();
        }, 500);

        alert(`Successfully rejected ${data.rejectedCount} users.`);
      } else {
        throw new Error(data.message || "Failed to reject users");
      }
    } catch (error) {
      console.error("Error bulk rejecting users:", error);
      alert("Failed to reject users. Please try again.");
    }
  };

  // Bulk suspend users
  const handleBulkSuspend = async () => {
    if (selectedUsers.length === 0) return;

    const approvedUsers = selectedUsers.filter((userId) => {
      const user = users.find((u) => u._id === userId);
      return user && user.status === "approved";
    });

    if (approvedUsers.length === 0) {
      alert("No approved users selected for suspension.");
      return;
    }

    const reason =
      prompt("Please provide a reason for suspension:") ||
      "Bulk suspension by administrator";

    try {
      const response = await fetch("/api/admin/users/bulk-suspend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ userIds: approvedUsers, reason }),
      });

      if (!response.ok) {
        throw new Error("Failed to suspend users");
      }

      const data = await response.json();

      if (data.success) {
        // Update stats immediately
        updateStatsSmart("suspend", "mixed");

        // Clear selection
        setSelectedUsers([]);

        // Refresh data
        setTimeout(() => {
          fetchUsers();
          fetchUserStats();
        }, 500);

        alert(`Successfully suspended ${data.suspendedCount} users.`);
      } else {
        throw new Error(data.message || "Failed to suspend users");
      }
    } catch (error) {
      console.error("Error bulk suspending users:", error);
      alert("Failed to suspend users. Please try again.");
    }
  };

  // Smart stats update based on user action
  const updateStatsSmart = (
    action: "approve" | "reject" | "suspend" | "activate",
    userType: string
  ) => {
    if (!stats) return;

    console.log("🧠 Smart stats update:", {
      action,
      userType,
      currentStats: stats,
    });

    setStats((prevStats) => {
      if (!prevStats) return prevStats;

      const newStats = { ...prevStats };

      if (action === "approve") {
        // User approved: pending decreases, approved increases
        newStats.pending = Math.max(0, prevStats.pending - 1);
        newStats.approved = prevStats.approved + 1;

        // Update role-specific stats if available
        if (userType === "employee" && "employees" in newStats) {
          (newStats as any).employees = ((newStats as any).employees || 0) + 1;
        } else if (userType === "manager" && "managers" in newStats) {
          (newStats as any).managers = ((newStats as any).managers || 0) + 1;
        }
      } else if (action === "reject") {
        // User rejected: pending decreases, rejected increases
        newStats.pending = Math.max(0, prevStats.pending - 1);
        newStats.rejected = (prevStats.rejected || 0) + 1;
      } else if (action === "suspend") {
        // User suspended: approved decreases, suspended increases
        newStats.approved = Math.max(0, prevStats.approved - 1);
        newStats.suspended = (prevStats.suspended || 0) + 1;
      } else if (action === "activate") {
        // User activated: suspended decreases, approved increases
        newStats.suspended = Math.max(0, (prevStats.suspended || 0) - 1);
        newStats.approved = prevStats.approved + 1;
      }

      console.log("🧠 Updated stats:", newStats);
      return newStats;
    });
  };

  // Handle stats card click for filtering (client-side only)
  const handleStatsCardClick = (filterType: string) => {
    setActiveFilter(filterType);
    setCurrentPage(1); // Reset to first page when switching filters
    // No need to update filters state for client-side filtering
  };

  // Handle role filter click (client-side only)
  const handleRoleFilterClick = (roleType: string) => {
    setActiveRoleFilter(roleType);
    setCurrentPage(1); // Reset to first page when switching filters
    // No need to update filters state for client-side filtering
  };

  // Handle user action
  const handleUserAction = async (
    userId: string,
    action: string,
    data?: any
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, data }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh users list
          fetchUsers();
          // Close modal if action was successful
          if (action === "delete") {
            handleCloseModal();
          }
        }
      }
    } catch (error) {
      console.error("Error performing user action:", error);
    }
  };

  // Get active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.userType.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.organization.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.verificationStatus.length > 0) count++;
    if (filters.activityStatus.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <AdminLayout pageTitle="User Management">
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Stats Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-0">
            {(originalStats || stats) && (
              <div className="grid grid-cols-1 gap-3 max-w-48">
                {/* Total Users - Blue */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("all")}
                  className={`${USER_STAT_CARD_COLORS.total.bg} ${
                    USER_STAT_CARD_COLORS.total.border
                  } p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "all"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Users
                      className={`w-5 h-5 ${USER_STAT_CARD_COLORS.total.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] ${USER_STAT_CARD_COLORS.total.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    Total Users
                  </p>
                  <motion.p
                    key={(originalStats || stats)?.total}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`text-2xl font-bold ${USER_STAT_CARD_COLORS.total.valueColor}`}
                  >
                    {(originalStats || stats)?.total}
                  </motion.p>
                </motion.div>

                {/* Approved Users - Green */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("approved")}
                  className={`${USER_STAT_CARD_COLORS.approved.bg} ${
                    USER_STAT_CARD_COLORS.approved.border
                  } p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "approved"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2
                      className={`w-5 h-5 ${USER_STAT_CARD_COLORS.approved.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] ${USER_STAT_CARD_COLORS.approved.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    Approved
                  </p>
                  <motion.p
                    key={(originalStats || stats)?.approved}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`text-2xl font-bold ${USER_STAT_CARD_COLORS.approved.valueColor}`}
                  >
                    {(originalStats || stats)?.approved}
                  </motion.p>
                </motion.div>

                {/* Pending - Orange */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("pending")}
                  className={`${USER_STAT_CARD_COLORS.pending.bg} ${
                    USER_STAT_CARD_COLORS.pending.border
                  } p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "pending"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Clock
                      className={`w-5 h-5 ${USER_STAT_CARD_COLORS.pending.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] ${USER_STAT_CARD_COLORS.pending.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    Pending
                  </p>
                  <motion.p
                    key={(originalStats || stats)?.pending}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`text-2xl font-bold ${USER_STAT_CARD_COLORS.pending.valueColor}`}
                  >
                    {(originalStats || stats)?.pending}
                  </motion.p>
                </motion.div>

                {/* Suspended - Red */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleStatsCardClick("suspended")}
                  className={`${USER_STAT_CARD_COLORS.suspended.bg} ${
                    USER_STAT_CARD_COLORS.suspended.border
                  } p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    activeFilter === "suspended"
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle
                      className={`w-5 h-5 ${USER_STAT_CARD_COLORS.suspended.iconColor}`}
                    />
                    {isRefreshing && (
                      <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] ${USER_STAT_CARD_COLORS.suspended.textColor} font-medium uppercase tracking-wider mb-1`}
                  >
                    Suspended
                  </p>
                  <motion.p
                    key={(originalStats || stats)?.suspended}
                    initial={{ scale: 1.1, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`text-2xl font-bold ${USER_STAT_CARD_COLORS.suspended.valueColor}`}
                  >
                    {(originalStats || stats)?.suspended}
                  </motion.p>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-10">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-4">
                {/* Role Filter Buttons */}
                <div className="flex items-center space-x-2">
                  {/* All Users Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRoleFilterClick("all")}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeRoleFilter === "all"
                        ? "bg-gray-900 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>All</span>
                  </motion.button>

                  {/* Employees Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRoleFilterClick("employee")}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeRoleFilter === "employee"
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Employees</span>
                  </motion.button>

                  {/* Managers Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRoleFilterClick("manager")}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeRoleFilter === "manager"
                        ? "bg-purple-500 text-white shadow-md"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>Managers</span>
                  </motion.button>
                </div>
              </div>

              {/* Search */}
              <ExpandableSearchBar
                onSearch={handleSearch}
                placeholder="Search users..."
                expandDirection="left"
                width={280}
                className="h-12"
              />
            </div>

            {/* Content */}
            {loading ? (
              <div className="space-y-4">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Failed to load users
                </h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  No users found
                </h2>
                <p className="text-gray-600 mb-4">
                  {filters.search || activeFiltersCount > 0
                    ? "Try adjusting your search or filters"
                    : "No users have been created yet"}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Operations Bar */}
                {selectedUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">
                            {selectedUsers.length} user
                            {selectedUsers.length > 1 ? "s" : ""} selected
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedUsers([])}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Clear selection
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Bulk Approve */}
                        <button
                          onClick={() => handleBulkApprove()}
                          disabled={!canBulkApprove()}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Approve Selected</span>
                        </button>

                        {/* Bulk Reject */}
                        <button
                          onClick={() => handleBulkReject()}
                          disabled={!canBulkReject()}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                          <span>Reject Selected</span>
                        </button>

                        {/* Bulk Suspend */}
                        <button
                          onClick={() => handleBulkSuspend()}
                          disabled={!canBulkSuspend()}
                          className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Suspend Selected</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Users List Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.length ===
                          users.filter((user) => {
                            if (!user._id) return false;
                            const id =
                              typeof user._id === "string"
                                ? user._id
                                : (user._id as any)?.toString?.() ||
                                  String(user._id);
                            return (
                              id && typeof id === "string" && id.trim() !== ""
                            );
                          }).length &&
                        users.filter((user) => {
                          if (!user._id) return false;
                          const id =
                            typeof user._id === "string"
                              ? user._id
                              : (user._id as any)?.toString?.() ||
                                String(user._id);
                          return (
                            id && typeof id === "string" && id.trim() !== ""
                          );
                        }).length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select all (
                      {
                        users.filter((user) => {
                          if (!user._id) return false;
                          const id =
                            typeof user._id === "string"
                              ? user._id
                              : (user._id as any)?.toString?.() ||
                                String(user._id);
                          return (
                            id && typeof id === "string" && id.trim() !== ""
                          );
                        }).length
                      }{" "}
                      users)
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Click on a user to view details
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-3">
                  {users
                    .filter((user) => {
                      // Filter out users without valid IDs
                      if (!user._id) return false;
                      // Handle both string and ObjectId cases
                      const id =
                        typeof user._id === "string"
                          ? user._id
                          : (user._id as any)?.toString?.() || String(user._id);
                      return id && typeof id === "string" && id.trim() !== "";
                    })
                    .map((user, index) => {
                      const statusConfig = getUserStatusConfig(user.status);
                      const roleConfig = getUserRoleConfig(user.userType);
                      const StatusIcon = statusConfig.icon;
                      const RoleIcon = roleConfig.icon;

                      return (
                        <motion.div
                          key={`user-${user._id || index}-${
                            user.email || "unknown"
                          }`} // More robust key generation
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                          onClick={() => handleUserClick(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {/* Selection Checkbox */}
                              <div
                                className="flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user._id)}
                                  onChange={() => handleSelectUser(user._id)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                              </div>
                              {/* User Avatar */}
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                {`${user.firstName.charAt(
                                  0
                                )}${user.lastName.charAt(0)}`}
                              </div>

                              {/* User Info */}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {user.firstName} {user.lastName}
                                  </h4>
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.badgeClass}`}
                                  >
                                    <StatusIcon
                                      size={12}
                                      className="inline mr-1"
                                    />
                                    {statusConfig.label}
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${roleConfig.badgeClass}`}
                                  >
                                    <RoleIcon
                                      size={12}
                                      className="inline mr-1"
                                    />
                                    {roleConfig.label}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Mail size={14} className="mr-1" />
                                    {user.email}
                                  </span>
                                  {(user.ciusss?.name ||
                                    user.hospital?.name) && (
                                    <span className="flex items-center">
                                      <Building size={14} className="mr-1" />
                                      {user.ciusss?.name || user.hospital?.name}
                                    </span>
                                  )}
                                  {user.lastLogin && (
                                    <span className="flex items-center">
                                      <Calendar size={14} className="mr-1" />
                                      Last login:{" "}
                                      {new Date(
                                        user.lastLogin
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, totalUsers)} of{" "}
                      {totalUsers} users
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg">
                        {Math.min(currentPage, totalPages)} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      {currentPage > totalPages && (
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                        >
                          Go to Page 1
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && (
        <UserDetailsModal
          isOpen={showUserModal}
          onClose={handleCloseModal}
          user={selectedUser}
          loading={loading}
          onUserIconUpdate={handleUserUpdate}
          onUserIconAction={handleUserAction}
          onUserUpdate={handleUserUpdateFromModal}
          onDocumentDownload={handleDocumentDownload}
        />
      )}
    </AdminLayout>
  );
}
