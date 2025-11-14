"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import FeedbackToast from "@/components/shared/feedback/FeedbackToast";
import {
  X,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Activity,
  Settings,
  Trash2,
  Edit,
  Eye,
  Ban,
  Unlock,
  Download,
  Upload,
  MoreHorizontal,
  UserIcon as UserIconIcon,
  Shield,
  Crown,
  UserCheck,
  UserX,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image,
  File,
} from "lucide-react";
import {
  getUserStatusConfig,
  getUserRoleConfig,
  getUserDisplayName,
  getUserInitials,
} from "@/constants";
import type { User, UserActivity } from "@/types/auth/user.types";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  loading?: boolean;
  onUserIconUpdate?: (userId: string, updates: Partial<User>) => void;
  onUserIconAction?: (userId: string, action: string, data?: any) => void;
  onUserUpdate?: (
    action: "approve" | "reject" | "suspend" | "activate",
    userType: string
  ) => void;
  onDocumentDownload?: (document: any) => void;
}

/**
 * UserIcon Details Modal
 *
 * Comprehensive user information display with:
 * - UserIcon profile and contact information
 * - Activity history
 * - Account status and permissions
 * - Admin actions
 */
export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
  loading = false,
  onUserIconUpdate,
  onUserIconAction,
  onUserUpdate,
  onDocumentDownload,
}: UserDetailsModalProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [detailedUser, setDetailedUser] = useState<User | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<
    "success" | "error" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch detailed user data when modal opens
  useEffect(() => {
    if (isOpen && user?._id) {
      setUserDetailsLoading(true);
      fetch(`/api/admin/users/${user._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDetailedUser(data.data.user);
          }
        })
        .catch((error) => {
          console.error("Error fetching user details:", error);
        })
        .finally(() => {
          setUserDetailsLoading(false);
        });
    }
  }, [isOpen, user?._id]);

  // Fetch user documents for employees
  useEffect(() => {
    if (isOpen && user?._id && user.userType === "employee") {
      setDocumentsLoading(true);
      fetch(`/api/users/${user._id}/documents`)
        .then((res) => res.json())
        .then((data) => {
          if (data.documents) {
            setUserDocuments(data.documents);
          }
        })
        .catch((error) => {
          console.error("Error fetching user documents:", error);
        })
        .finally(() => {
          setDocumentsLoading(false);
        });
    }
  }, [isOpen, user?._id, user?.userType]);

  // Fetch login history from AuditLog API
  useEffect(() => {
    if (isOpen && user?._id) {
      setLoginHistoryLoading(true);
      fetch(`/api/admin/users/${user._id}/login-history?limit=10`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.loginHistory) {
            setLoginHistory(data.loginHistory);
          }
        })
        .catch((error) => {
          console.error("Error fetching login history:", error);
        })
        .finally(() => {
          setLoginHistoryLoading(false);
        });
    }
  }, [isOpen, user?._id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        !(event.target as Element).closest(".floating-menu-container")
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Fetch user activities
  const fetchUserIconActivities = async () => {
    if (!user) return;

    try {
      setActivitiesLoading(true);
      const response = await fetch(`/api/admin/users/${user._id}/activities`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserActivities(data.data.activities);
        }
      }
    } catch (error) {
      console.error("Error fetching user activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Load activities when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUserIconActivities();
    }
  }, [isOpen, user]);

  // Handle approval/rejection actions
  const handleApprovalAction = async (action: "approve" | "reject") => {
    if (!user?._id) return;

    setActionLoading(action);
    setError(null);

    try {
      let reason = "";
      if (action === "reject") {
        reason =
          prompt("Please provide a reason for rejection:") ||
          "Rejected by administrator";
      }

      const endpoint =
        action === "approve"
          ? `/api/admin/users/${user._id}/approve`
          : `/api/admin/users/${user._id}/reject`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to ${action} user`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response?.status || "Unknown"}: ${
            response?.statusText || "Unknown Error"
          }`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setFeedbackStatus("success");

        // Update user status locally
        if (onUserIconUpdate) {
          onUserIconUpdate(user._id, {
            status: action === "approve" ? "approved" : "rejected",
            approvedAt: new Date(),
            rejectionReason: action === "reject" ? reason : undefined,
          });
        }

        // Notify parent component to refresh data with action details
        if (onUserUpdate && user) {
          onUserUpdate(action, user.userType);
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || `Failed to ${action} user}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : `Failed to ${action} user`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Handle suspend action
  const handleSuspendAction = async () => {
    if (!user?._id) return;

    setActionLoading("suspend");
    setError(null);

    try {
      const reason =
        prompt("Please provide a reason for suspension:") ||
        "Account suspended by administrator";

      const response = await fetch(`/api/admin/users/${user._id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to suspend user";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response?.status || "Unknown"}: ${
            response?.statusText || "Unknown Error"
          }`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setFeedbackStatus("success");

        // Update user status locally
        if (onUserIconUpdate) {
          onUserIconUpdate(user._id, {
            status: "suspended",
            approvedAt: new Date(),
            rejectionReason: reason,
          });
        }

        // Notify parent component to refresh data
        if (onUserUpdate) {
          onUserUpdate("suspend", user.userType);
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to suspend user");
      }
    } catch (error) {
      console.error("Error suspending user:", error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : "Failed to suspend user"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Handle activate action
  const handleActivateAction = async () => {
    if (!user?._id) return;

    setActionLoading("activate");
    setError(null);

    try {
      const reason =
        prompt("Please provide a reason for reactivation:") ||
        "Account reactivated by administrator";

      const response = await fetch(`/api/admin/users/${user._id}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to activate user";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response?.status || "Unknown"}: ${
            response?.statusText || "Unknown Error"
          }`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        setFeedbackStatus("success");

        // Update user status locally
        if (onUserIconUpdate) {
          onUserIconUpdate(user._id, {
            status: "approved",
            approvedAt: new Date(),
            rejectionReason: undefined,
          });
        }

        // Notify parent component to refresh data
        if (onUserUpdate) {
          onUserUpdate("activate", user.userType);
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to activate user");
      }
    } catch (error) {
      console.error("Error activating user:", error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : "Failed to activate user"
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const statusConfig = user ? getUserStatusConfig(user.status) : null;
  const roleConfig = user ? getUserRoleConfig(user.userType) : null;
  const StatusIcon = statusConfig?.icon;
  const RoleIcon = roleConfig?.icon;

  // Smart admin actions based on user status
  const getAvailableActions = () => {
    if (!user) return [];

    switch (user.status) {
      case "pending":
        // Only show approve/reject for pending users
        return [
          {
            id: "approve",
            label: "Approve User",
            icon: "UserCheck",
            buttonClass:
              "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
          },
          {
            id: "reject",
            label: "Reject User",
            icon: "UserX",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
        ];

      case "approved":
        // Show management actions for approved users
        return [
          {
            id: "suspend",
            label: "Suspend User",
            icon: "Ban",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
          {
            id: "exportData",
            label: "Export Data",
            icon: "Download",
            buttonClass:
              "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200",
          },
          {
            id: "delete",
            label: "Delete User",
            icon: "Trash2",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
        ];

      case "rejected":
        // Show limited actions for rejected users
        return [
          {
            id: "approve",
            label: "Approve User",
            icon: "UserCheck",
            buttonClass:
              "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
          },
          {
            id: "delete",
            label: "Delete User",
            icon: "Trash2",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
        ];

      case "suspended":
        // Show reactivation actions for suspended users
        return [
          {
            id: "activate",
            label: "Activate User",
            icon: "CheckCircle2",
            buttonClass:
              "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
          },
          {
            id: "delete",
            label: "Delete User",
            icon: "Trash2",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
        ];

      default:
        // Fallback for unknown status
        return [
          {
            id: "activate",
            label: "Activate User",
            icon: "CheckCircle2",
            buttonClass:
              "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
          },
          {
            id: "delete",
            label: "Delete User",
            icon: "Trash2",
            buttonClass:
              "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
          },
        ];
    }
  };

  const availableActions = getAvailableActions();

  const iconMap: Record<string, any> = {
    CheckCircle2,
    Ban,
    Download,
    Trash2,
    UserCheck,
    UserX,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="hidden lg:flex w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full items-center justify-center text-white font-bold text-xl">
                    {getUserInitials(user!.firstName, user!.lastName)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user ? getUserDisplayName(user) : "Loading..."}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      {statusConfig && StatusIcon && (
                        <div
                          className={`hidden lg:inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeClass}`}
                        >
                          <StatusIcon size={14} className="inline mr-1" />
                          {statusConfig.label}
                        </div>
                      )}
                      {roleConfig && RoleIcon && (
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${roleConfig.badgeClass}`}
                        >
                          <RoleIcon size={14} className="inline mr-1" />
                          {roleConfig.label}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : user ? (
                  <div className="space-y-8">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="font-medium text-gray-900">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          {user.phone && (
                            <div className="flex items-center space-x-3">
                              <Phone className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium text-gray-900">
                                  {user.phone}
                                </p>
                              </div>
                            </div>
                          )}
                          {(user.ciusss?.name || user.hospital?.name) && (
                            <div className="flex items-center space-x-3">
                              <Building className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">
                                  Organization
                                </p>
                                <p className="font-medium text-gray-900">
                                  {user.ciusss?.name || user.hospital?.name}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {user.post && (
                            <div className="flex items-center space-x-3">
                              <Building className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">
                                  Position
                                </p>
                                <p className="font-medium text-gray-900">
                                  {user.post}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">
                                Member Since
                              </p>
                              <p className="font-medium text-gray-900">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Account Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <CheckCircle2
                              className={`w-5 h-5 ${
                                user.status === "approved"
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }`}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Account Status
                            </span>
                          </div>
                          <p
                            className={`text-sm ${
                              user.status === "approved"
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            {user.status === "approved"
                              ? "Approved"
                              : user.status}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              Last Login
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {userDetailsLoading ? (
                              <span className="animate-pulse">Loading...</span>
                            ) : detailedUser?.lastLogin ? (
                              new Date(
                                detailedUser.lastLogin
                              ).toLocaleDateString() +
                              " at " +
                              new Date(
                                detailedUser.lastLogin
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            ) : (
                              "Never"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Login History */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Login History
                      </h3>
                      {loginHistoryLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : loginHistory.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {loginHistory.map((login, index) => (
                            <div
                              key={`login-${login.timestamp}-${index}`}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    login.success
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                />
                                <span className="text-sm text-gray-700">
                                  {login.success ? "Successful" : "Failed"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(login.timestamp).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">
                            No login history available
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Employee Documents */}
                    {user?.userType === "employee" && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Employee Documents
                        </h3>
                        {documentsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : userDocuments.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {userDocuments.map((document, index) => (
                              <motion.div
                                key={`document-${document.fileId || index}-${
                                  document.originalName || "unknown"
                                }`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => onDocumentDownload?.(document)}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    {document.originalName
                                      .toLowerCase()
                                      .includes(".pdf") ? (
                                      <FileText className="w-8 h-8 text-red-500" />
                                    ) : document.originalName
                                        .toLowerCase()
                                        .match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                                      <Image className="w-8 h-8 text-blue-500" />
                                    ) : (
                                      <File className="w-8 h-8 text-gray-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {document.originalName}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {document.documentType}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-2">
                                      <span className="text-xs text-gray-400">
                                        {(document.size / 1024 / 1024).toFixed(
                                          2
                                        )}{" "}
                                        MB
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        •
                                      </span>
                                      <span className="text-xs text-gray-400">
                                        {new Date(
                                          document.uploadedAt
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Eye className="w-4 h-4 text-gray-400" />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">
                              No documents uploaded
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Recent Activity
                      </h3>
                      {activitiesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : userActivities.length > 0 ? (
                        <div className="space-y-3">
                          {userActivities.slice(0, 5).map((activity) => (
                            <div
                              key={activity._id}
                              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <Activity className="w-5 h-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    activity.timestamp
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">👤</div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      UserIcon not found
                    </h2>
                    <p className="text-gray-600">
                      The requested user could not be found.
                    </p>
                  </div>
                )}
              </div>

              {/* Floating Admin Actions */}
              {user && availableActions.length > 0 && (
                <div className="fixed bottom-8 right-8 z-50">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.3,
                      type: "spring",
                      stiffness: 300,
                    }}
                    className="relative group floating-menu-container"
                  >
                    {/* Main Floating Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white group-hover:from-purple-700 group-hover:to-blue-700"
                    >
                      <MoreHorizontal
                        size={24}
                        className={`transition-transform duration-300 ${
                          isMenuOpen ? "rotate-90" : ""
                        }`}
                      />
                    </motion.button>

                    {/* Floating Action Options */}
                    <div
                      className={`absolute bottom-16 right-0 transition-all duration-300 transform ${
                        isMenuOpen
                          ? "opacity-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 translate-y-2 pointer-events-none"
                      }`}
                    >
                      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 min-w-[220px] space-y-2 backdrop-blur-sm">
                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 text-center">
                          Admin Actions
                        </div>
                        {availableActions
                          .filter(
                            (action) =>
                              !action.id.toLowerCase().includes("note") &&
                              !action.label.toLowerCase().includes("note")
                          )
                          .map((action, index) => {
                            const ActionIcon = iconMap[action.icon];

                            const isCancelAction =
                              action.id.toLowerCase().includes("cancel") ||
                              action.label.toLowerCase().includes("cancel") ||
                              action.label.toLowerCase().includes("reject") ||
                              action.id.toLowerCase().includes("delete");

                            const colorClass = isCancelAction
                              ? "bg-red-100 border-red-300 text-red-800 hover:bg-red-200"
                              : action.buttonClass;

                            const isLoading = actionLoading === action.id;

                            return (
                              <motion.button
                                key={action.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                  transition: { delay: index * 0.05 },
                                }}
                                whileHover={{
                                  scale: isLoading ? 1 : 1.02,
                                  x: isLoading ? 0 : 4,
                                  transition: { duration: 0.2 },
                                }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  if (
                                    action.id === "approve" ||
                                    action.id === "reject"
                                  ) {
                                    handleApprovalAction(action.id);
                                  } else if (action.id === "activate") {
                                    handleActivateAction();
                                  } else if (action.id === "suspend") {
                                    handleSuspendAction();
                                  } else {
                                    setSelectedAction(action.id);
                                    setShowActionModal(true);
                                    setIsMenuOpen(false);
                                  }
                                }}
                                disabled={isLoading}
                                className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 ${
                                  isLoading
                                    ? "opacity-75 cursor-not-allowed"
                                    : ""
                                } ${colorClass}`}
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  ActionIcon && (
                                    <ActionIcon size={18} className="mr-2" />
                                  )
                                )}
                                <span className="text-sm font-semibold text-black">
                                  {isLoading
                                    ? `${action.label}...`
                                    : action.label}
                                </span>
                              </motion.button>
                            );
                          })}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Success/Error Feedback */}
      {feedbackStatus &&
        isMounted &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 left-4 z-[1000]">
            <FeedbackToast
              status={feedbackStatus}
              message={
                feedbackStatus === "success"
                  ? "User action completed successfully"
                  : error || "Failed to complete user action"
              }
              durationMs={1700}
              onHide={() => {
                setFeedbackStatus(null);
                setError(null);
              }}
            />
          </div>,
          document.body
        )}
    </AnimatePresence>
  );
}
