"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Key,
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
} from "lucide-react";
import {
  getUserStatusConfig,
  getUserRoleConfig,
  getUserDisplayName,
  getUserInitials,
} from "@/constants";
import type { User, UserActivity } from "@/types/user";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  loading?: boolean;
  onUserIconUpdate?: (userId: string, updates: Partial<User>) => void;
  onUserIconAction?: (userId: string, action: string, data?: any) => void;
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
}: UserDetailsModalProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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

  if (!isOpen) return null;

  const statusConfig = user ? getUserStatusConfig(user.status) : null;
  const roleConfig = user ? getUserRoleConfig(user.userType) : null;
  const StatusIcon = statusConfig?.icon;
  const RoleIcon = roleConfig?.icon;

  // Available admin actions
  const availableActions = [
    {
      id: "activate",
      label: "Activate UserIcon",
      icon: "CheckCircle2",
      buttonClass:
        "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
    },
    {
      id: "suspend",
      label: "Suspend UserIcon",
      icon: "Ban",
      buttonClass: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
    },
    {
      id: "resetPassword",
      label: "Reset Password",
      icon: "Key",
      buttonClass:
        "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200",
    },
    {
      id: "unlockAccount",
      label: "Unlock Account",
      icon: "Unlock",
      buttonClass:
        "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200",
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
      label: "Delete UserIcon",
      icon: "Trash2",
      buttonClass: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
    },
  ];

  const iconMap: Record<string, any> = {
    CheckCircle2,
    Ban,
    Key,
    Unlock,
    Download,
    Trash2,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {getUserInitials(user!.firstName, user!.lastName)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user ? getUserDisplayName(user) : "Loading..."}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    {statusConfig && StatusIcon && (
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeClass}`}
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
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
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
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">
                              Organization
                            </p>
                            <p className="font-medium text-gray-900">
                              {user.ciusss?.name ||
                                user.hospital?.name ||
                                "No Organization"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {user.post && (
                          <div className="flex items-center space-x-3">
                            <Building className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Position</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                          <Key
                            className={`w-5 h-5 ${
                              user.isSuperAdmin
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Super Admin
                          </span>
                        </div>
                        <p
                          className={`text-sm ${
                            user.isSuperAdmin
                              ? "text-blue-600"
                              : "text-gray-500"
                          }`}
                        >
                          {user.isSuperAdmin ? "Yes" : "No"}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Activity className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            Failed Logins
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {user.failedLoginAttempts || 0}
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
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>

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
                                {new Date(activity.timestamp).toLocaleString()}
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
                                scale: 1.02,
                                x: 4,
                                transition: { duration: 0.2 },
                              }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedAction(action.id);
                                setShowActionModal(true);
                                setIsMenuOpen(false);
                              }}
                              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 ${colorClass}`}
                            >
                              {ActionIcon && <ActionIcon size={18} />}
                              <span className="text-sm font-semibold text-black">
                                {action.label}
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
      )}
    </AnimatePresence>
  );
}
