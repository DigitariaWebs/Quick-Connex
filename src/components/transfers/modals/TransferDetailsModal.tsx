"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import FeedbackToast from "@/components/shared/feedback/FeedbackToast";
import { useSession } from "@/contexts/SessionContext";
import {
  X,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  MapPin,
  Calendar,
  Flag,
  FileText,
  AlertTriangle,
  User,
  MessageSquare,
  History,
  Download,
  Send,
  Ban,
  UserCheck,
  Shield,
  Eye,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  XCircle as XCircleIcon,
  Loader2,
} from "lucide-react";
import LoadingSpinner from "@/components/dashboard/core/LoadingSpinner";
import {
  getTransferCategoryConfig,
  getTransferStatusConfig,
  getTransferPriorityConfig,
} from "@/constants";

/**
 * Transfer Details Modal
 *
 * Comprehensive transfer details with admin actions in modal format:
 * - Full transfer information
 * - Admin action buttons
 * - Timeline with admin events
 * - Internal notes section
 * - Audit trail
 * - Related transfers
 */

interface TransferDetails {
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
      weight?: number;
      dimensions?: {
        length: number;
        width: number;
        height: number;
      };
    };
    equipmentInfo?: {
      equipmentName: string;
      serialNumber?: string;
      model: string;
      condition: string;
      maintenanceRequired: boolean;
      specialInstructions?: string;
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
    phone: string;
  };
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    phone: string;
  };
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  medicalDocuments?: string[];
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    actor: {
      id: string;
      name: string;
      email: string;
      userType: string;
    };
    metadata?: any;
    isSystemEvent?: boolean;
    isVisible?: boolean;
  }>;
  createdAt: string;
}

interface RelatedTransfer {
  _id: string;
  transferId: string;
  transferCategory: "patient" | "envelope" | "medical_instruments";
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };
  fromHospital: {
    name: string;
  };
  toHospital: {
    name: string;
  };
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedDate: string;
}

interface AdminContext {
  canApprove: boolean;
  canReject: boolean;
  canAssign: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  permissions: string[];
}

// Map icon string names to actual icon components
const iconMap: Record<string, any> = {
  X,
  CheckCircle: CheckCircle2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Flag,
  Clock,
  Users,
  MapPin,
  Calendar,
  FileText,
  AlertTriangle,
  User,
  MessageSquare,
  History,
  Download,
  Send,
  Ban,
  Shield,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  XCircleIcon,
};

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string | null;
  transferData?: any | null; // Accept any transfer data type for flexibility
  onTransferUpdate?: () => void;
}

export default function TransferDetailsModal({
  isOpen,
  onClose,
  transferId,
  transferData,
  onTransferUpdate,
}: TransferDetailsModalProps) {
  const t = useTranslations("transfers");
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [relatedTransfers, setRelatedTransfers] = useState<RelatedTransfer[]>(
    [],
  );
  const [adminTimeline, setAdminTimeline] = useState<any[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  const [adminContext, setAdminContext] = useState<AdminContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<
    "success" | "error" | null
  >(null);

  // Get current user from session
  const { user: currentUser } = useSession();

  // Function to refresh transfer data
  const refreshTransferData = async () => {
    if (!transferId) return;

    try {
      setLoading(true);

      let response;
      try {
        response = await fetch(`/api/admin/transfers/${transferId}`, {
          method: "GET",
          credentials: "include",
        });
      } catch (fetchError) {
        console.error("Network error during fetch:", fetchError);
        throw new Error("Network error: Unable to connect to server");
      }

      if (!response) {
        throw new Error("No response received from server");
      }

      if (!response.ok) {
        let errorMessage = "Failed to fetch transfer details";
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

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse response JSON:", jsonError);
        throw new Error("Invalid response format from server");
      }

      if (data && data.success && data.data && data.data.transfer) {
        setTransfer(data.data.transfer);
        console.log("✅ Transfer data refreshed successfully");
      } else {
        console.error("❌ Invalid response data structure:", data);
        throw new Error("Invalid response data structure");
      }
    } catch (error) {
      console.error("Error refreshing transfer data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to refresh transfer data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch additional transfer details (timeline, related transfers, etc.)
  const fetchAdditionalDetails = async () => {
    if (!transferId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch transfer details";
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
        // Update transfer data if not already set
        if (!transfer) {
          setTransfer(data.data.transfer);
        }
        setRelatedTransfers(data.data.relatedTransfers || []);
        setAdminTimeline(data.data.adminTimeline || []);
        setAvailableActions(data.data.availableActions || []);
        setAdminContext(data.data.adminContext);
      } else {
        throw new Error(data.message || "Failed to fetch transfer details");
      }
    } catch (error) {
      console.error("Error fetching transfer details:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch transfer details",
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initialize transfer data (no API calls for basic data)
  useEffect(() => {
    if (transferId && isOpen) {
      // Use passed transfer data if available
      if (transferData) {
        try {
          // Convert TransferRequest to TransferDetails format safely
          const convertedTransfer: TransferDetails = {
            ...transferData,
            timeline: transferData.timeline || [], // Add empty timeline if missing
            medicalDocuments: transferData.medicalDocuments || [], // Add empty array if missing
          };
          setTransfer(convertedTransfer);
          setLoading(false);
          setError(null);
          // Initialize empty arrays for additional data (no API calls)
          setRelatedTransfers([]);
          setAdminTimeline([]);
          setAvailableActions([]);
          setAdminContext(null);
        } catch (error) {
          console.error("Error converting transfer data:", error);
          setError("Failed to load transfer data");
          setLoading(false);
        }
      } else {
        // Fallback: fetch all data if no transfer data passed
        setLoading(true);
        fetchAdditionalDetails();
      }
    }
  }, [transferId, isOpen, transferData]);

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

  // Handle refresh (only fetch additional details, not basic transfer data)
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Only fetch additional details if we have transfer data
    if (transfer) {
      fetchAdditionalDetails();
    } else {
      // If no transfer data, fetch everything
      fetchAdditionalDetails();
    }
  };

  // Handle admin action
  const handleAdminAction = async (action: string) => {
    if (!transfer || !adminContext) return;

    try {
      const response = await fetch(
        `/api/admin/transfers/${transfer._id}/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            action,
            reason: actionReason,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to perform action");
      }

      const data = await response.json();

      if (data.success) {
        // Refresh transfer details
        await fetchAdditionalDetails();

        // Notify parent component
        if (onTransferUpdate) {
          onTransferUpdate();
        }

        setShowActionModal(false);
        setSelectedAction(null);
        setActionReason("");
      } else {
        throw new Error(data.message || "Failed to perform action");
      }
    } catch (error) {
      console.error("Error performing admin action:", error);
      setError(
        error instanceof Error ? error.message : "Failed to perform action",
      );
    }
  };

  // Get priority background color
  const getPriorityBackgroundColor = (priority: string) => {
    const priorityMap = {
      low: "bg-green-50",
      medium: "bg-amber-50",
      high: "bg-orange-50",
      urgent: "bg-red-50",
    };
    return priorityMap[priority as keyof typeof priorityMap] || "bg-gray-50";
  };

  // Handle approve transfer
  const handleApproveTransfer = async () => {
    if (!transferId) return;

    setActionLoading("approve");
    setError(null);

    try {
      const requestBody = {
        adminEmail: currentUser?.email || "admin@system.com",
        reason: "Approved by administrator",
      };

      console.log("🚀 Approving transfer:", {
        transferId,
        adminEmail: requestBody.adminEmail,
        currentUser: currentUser?.email,
      });

      const response = await fetch(`/api/transfers/${transferId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = "Failed to approve transfer";
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

        // Refresh transfer data to show updated status
        await refreshTransferData();

        // Notify parent component
        if (onTransferUpdate) {
          onTransferUpdate();
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to approve transfer");
      }
    } catch (error) {
      console.error("Error approving transfer:", error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : "Failed to approve transfer",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject transfer
  const handleRejectTransfer = async () => {
    if (!transferId) return;

    setActionLoading("reject");
    setError(null);

    try {
      const requestBody = {
        adminEmail: currentUser?.email || "admin@system.com",
        reason: "Rejected by administrator",
      };

      console.log("🚀 Rejecting transfer:", {
        transferId,
        adminEmail: requestBody.adminEmail,
        currentUser: currentUser?.email,
      });

      const response = await fetch(`/api/transfers/${transferId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = "Failed to reject transfer";
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

        // Refresh transfer data to show updated status
        await refreshTransferData();

        // Notify parent component
        if (onTransferUpdate) {
          onTransferUpdate();
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to reject transfer");
      }
    } catch (error) {
      console.error("Error rejecting transfer:", error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : "Failed to reject transfer",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Handle cancel transfer
  const handleCancelTransfer = async () => {
    if (!transferId) return;

    setActionLoading("cancel");
    setError(null);

    try {
      const response = await fetch(`/api/transfers/${transferId}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          reason: "Cancelled by administrator",
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to cancel transfer";
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

        // Refresh transfer data to show updated status
        await refreshTransferData();

        // Notify parent component
        if (onTransferUpdate) {
          onTransferUpdate();
        }

        // Close modal after a short delay to show success feedback
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(data.message || "Failed to cancel transfer");
      }
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      setFeedbackStatus("error");
      setError(
        error instanceof Error ? error.message : "Failed to cancel transfer",
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-2 lg:p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-6xl max-h-[95vh] lg:max-h-[90vh] rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden ${
                transfer && !loading
                  ? getPriorityBackgroundColor(transfer.priority)
                  : "bg-white"
              }`}
            >
              {/* Content */}
              <div
                className="overflow-y-auto max-h-[95vh] lg:max-h-[90vh] p-4 lg:p-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg lg:text-xl font-semibold text-gray-800 truncate">
                      {transfer?.transferId || t("loading")}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
                    {transfer &&
                      (() => {
                        const statusConfig = getTransferStatusConfig(
                          transfer.status,
                        );
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div
                            className={`px-2 lg:px-3 py-1 rounded-full ${statusConfig.badgeClass} flex items-center space-x-1 lg:space-x-2`}
                          >
                            <StatusIcon size={14} className="lg:w-4 lg:h-4" />
                            <span className="font-medium text-xs lg:text-sm">
                              {t(transfer.status)}
                            </span>
                          </div>
                        );
                      })()}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="p-1.5 lg:p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Close"
                    >
                      <X size={16} className="lg:w-4 lg:h-4" />
                    </motion.button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-8 lg:py-12">
                    <div className="text-center px-4">
                      <AlertTriangle className="w-10 h-10 lg:w-12 lg:h-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
                        {t("errorLoadingTransfer")}
                      </h3>
                      <p className="text-sm lg:text-base text-gray-600 mb-4">
                        {error}
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
                      >
                        {t("tryAgain")}
                      </button>
                    </div>
                  </div>
                ) : transfer ? (
                  <div className="space-y-4 lg:space-y-6">
                    {/* Transfer Overview */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-sm"
                    >
                      {/* Transfer Information */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        {/* Patient/Transfer Info */}
                        <div className="space-y-4">
                          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                            {t("transferInformation")}
                          </h3>

                          {transfer.transferCategory === "patient" &&
                            transfer.patientInfo && (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2 lg:space-x-3">
                                  <User
                                    size={18}
                                    className="text-blue-600 lg:w-5 lg:h-5 flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 text-sm lg:text-base truncate">
                                      {transfer.patientInfo.firstName}{" "}
                                      {transfer.patientInfo.lastName}
                                    </p>
                                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                                      Age: {transfer.patientInfo.age} | Dossier:{" "}
                                      {transfer.patientInfo.dossierNumber ||
                                        "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {transfer.transferCategory === "envelope" &&
                            transfer.transferData?.envelopeInfo && (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2 lg:space-x-3">
                                  {(() => {
                                    const categoryConfig =
                                      getTransferCategoryConfig("envelope");
                                    const CategoryIcon = categoryConfig.icon;
                                    return (
                                      <CategoryIcon
                                        size={18}
                                        className={`${categoryConfig.color} lg:w-5 lg:h-5 flex-shrink-0`}
                                      />
                                    );
                                  })()}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 text-sm lg:text-base truncate">
                                      Envelope #
                                      {
                                        transfer.transferData.envelopeInfo
                                          .envelopeNumber
                                      }
                                    </p>
                                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                                      From:{" "}
                                      {
                                        transfer.transferData.envelopeInfo
                                          .senderName
                                      }
                                    </p>
                                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                                      To:{" "}
                                      {
                                        transfer.transferData.envelopeInfo
                                          .recipientName
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {transfer.transferCategory ===
                            "medical_instruments" &&
                            transfer.transferData?.equipmentInfo && (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2 lg:space-x-3">
                                  {(() => {
                                    const categoryConfig =
                                      getTransferCategoryConfig(
                                        "medical_instruments",
                                      );
                                    const CategoryIcon = categoryConfig.icon;
                                    return (
                                      <CategoryIcon
                                        size={18}
                                        className={`${categoryConfig.color} lg:w-5 lg:h-5 flex-shrink-0`}
                                      />
                                    );
                                  })()}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 text-sm lg:text-base truncate">
                                      {
                                        transfer.transferData.equipmentInfo
                                          .equipmentName
                                      }
                                    </p>
                                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                                      Model:{" "}
                                      {
                                        transfer.transferData.equipmentInfo
                                          .model
                                      }
                                    </p>
                                    <p className="text-xs lg:text-sm text-gray-600 truncate">
                                      Serial:{" "}
                                      {transfer.transferData.equipmentInfo
                                        .serialNumber || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Hospital Information */}
                        <div className="space-y-4">
                          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                            {t("routeInformation")}
                          </h3>

                          <div className="space-y-4">
                            <div className="flex items-start space-x-2 lg:space-x-3">
                              <MapPin
                                size={16}
                                className="text-red-600 flex-shrink-0 mt-0.5 lg:w-4 lg:h-4"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm lg:text-base">
                                  {t("from")}
                                </p>
                                <p className="text-xs lg:text-sm text-gray-600 truncate">
                                  {transfer.fromHospital?.name ||
                                    "Unknown Hospital"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {transfer.fromHospital?.address ||
                                    "Address not available"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-2 lg:space-x-3">
                              <MapPin
                                size={16}
                                className="text-green-600 flex-shrink-0 mt-0.5 lg:w-4 lg:h-4"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm lg:text-base">
                                  {t("to")}
                                </p>
                                <p className="text-xs lg:text-sm text-gray-600 truncate">
                                  {transfer.toHospital?.name ||
                                    "Unknown Hospital"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {transfer.toHospital?.address ||
                                    "Address not available"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
                          <div className="flex items-center space-x-2 lg:space-x-3">
                            <User
                              size={16}
                              className="text-blue-600 lg:w-4 lg:h-4 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs lg:text-sm font-medium text-gray-900">
                                {t("requestedBy")}
                              </p>
                              <p className="text-xs lg:text-sm text-gray-600 truncate">
                                {transfer.requestedBy?.firstName || "Unknown"}{" "}
                                {transfer.requestedBy?.lastName || "User"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 lg:space-x-3">
                            <Calendar
                              size={16}
                              className="text-purple-600 lg:w-4 lg:h-4 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs lg:text-sm font-medium text-gray-900">
                                {t("requestedDate")}
                              </p>
                              <p className="text-xs lg:text-sm text-gray-600">
                                {new Date(
                                  transfer.requestedDate,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {transfer.assignedTo && (
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              <UserCheck
                                size={16}
                                className="text-green-600 lg:w-4 lg:h-4 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs lg:text-sm font-medium text-gray-900">
                                  {t("assignedTo")}
                                </p>
                                <p className="text-xs lg:text-sm text-gray-600 truncate">
                                  {transfer.assignedTo?.firstName || "Not"}{" "}
                                  {transfer.assignedTo?.lastName || "Assigned"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reason */}
                      {transfer.reason && (
                        <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                          <h4 className="text-xs lg:text-sm font-medium text-gray-900 mb-2">
                            {t("reason")}
                          </h4>
                          <p className="text-xs lg:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg break-words">
                            {transfer.reason}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {transfer.notes && (
                        <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200">
                          <h4 className="text-xs lg:text-sm font-medium text-gray-900 mb-2">
                            {t("notes")}
                          </h4>
                          <p className="text-xs lg:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg break-words">
                            {transfer.notes}
                          </p>
                        </div>
                      )}
                    </motion.div>

                    {/* Timeline */}
                    {transfer.timeline && transfer.timeline.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                      >
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                          <History size={20} className="text-blue-600" />
                          <span>{t("timeline")}</span>
                        </h2>
                        <div className="space-y-4">
                          {transfer.timeline.map((event, index) => (
                            <div
                              key={event.id}
                              className="flex items-start space-x-4"
                            >
                              <Clock
                                size={18}
                                className="text-blue-600 flex-shrink-0 mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">
                                    {event.title}
                                  </h4>
                                  <span className="text-sm text-gray-500">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {event.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  by {event.actor.name} ({event.actor.userType})
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Floating Admin Actions Button - Always visible */}
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
                        {t("adminActions")}
                      </div>

                      {/* Dynamic Actions based on transfer status */}
                      {transfer?.status === "pending" && (
                        <>
                          {/* Pending Transfer Actions */}
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              transition: { delay: 0.05 },
                            }}
                            whileHover={{
                              scale: actionLoading === "approve" ? 1 : 1.02,
                              x: actionLoading === "approve" ? 0 : 4,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleApproveTransfer()}
                            disabled={actionLoading === "approve"}
                            className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-semiboldsemiboldsemiboldsemiboldsemiboldsemiboldsemiboldsemiboldsemibold transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 bg-green-100 border-green-400 text-green-900 hover:bg-green-200 font-semibold ${
                              actionLoading === "approve"
                                ? "opacity-75 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {actionLoading === "approve" ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            <span className="text-sm font-semibold text-black">
                              {actionLoading === "approve"
                                ? t("approving")
                                : t("approveTransfer")}
                            </span>
                          </motion.button>

                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              transition: { delay: 0.1 },
                            }}
                            whileHover={{
                              scale: actionLoading === "reject" ? 1 : 1.02,
                              x: actionLoading === "reject" ? 0 : 4,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRejectTransfer()}
                            disabled={actionLoading === "reject"}
                            className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 bg-red-100 border-red-400 text-red-900 hover:bg-red-200 font-semibold ${
                              actionLoading === "reject"
                                ? "opacity-75 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {actionLoading === "reject" ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            <span className="text-sm font-semibold text-black">
                              {actionLoading === "reject"
                                ? t("rejecting")
                                : t("rejectTransfer")}
                            </span>
                          </motion.button>
                        </>
                      )}

                      {transfer?.status === "accepted" && (
                        <>
                          {/* Accepted Transfer Actions */}
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              transition: { delay: 0.05 },
                            }}
                            whileHover={{
                              scale: actionLoading === "reject" ? 1 : 1.02,
                              x: actionLoading === "reject" ? 0 : 4,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRejectTransfer()}
                            disabled={actionLoading === "reject"}
                            className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 bg-red-100 border-red-400 text-red-900 hover:bg-red-200 font-semibold ${
                              actionLoading === "reject"
                                ? "opacity-75 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {actionLoading === "reject" ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            <span className="text-sm font-semibold text-black">
                              {actionLoading === "reject"
                                ? t("rejecting")
                                : t("rejectTransfer")}
                            </span>
                          </motion.button>
                        </>
                      )}

                      {transfer?.status === "in_progress" && (
                        <>
                          {/* In Progress Transfer Actions */}
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              transition: { delay: 0.05 },
                            }}
                            whileHover={{
                              scale: actionLoading === "cancel" ? 1 : 1.02,
                              x: actionLoading === "cancel" ? 0 : 4,
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCancelTransfer()}
                            disabled={actionLoading === "cancel"}
                            className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 border-2 hover:shadow-lg hover:scale-105 bg-red-100 border-red-300 text-red-800 hover:bg-red-200 ${
                              actionLoading === "cancel"
                                ? "opacity-75 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {actionLoading === "cancel" ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            <span className="text-sm font-semibold text-black">
                              {actionLoading === "cancel"
                                ? t("cancelling")
                                : t("cancelTransfer")}
                            </span>
                          </motion.button>
                        </>
                      )}

                      {/* Show message if no actions available */}
                      {transfer?.status !== "pending" &&
                        transfer?.status !== "accepted" &&
                        transfer?.status !== "in_progress" && (
                          <div className="text-center py-4">
                            <div className="text-sm text-gray-500 mb-2">
                              {t("noActionsAvailable")}
                            </div>
                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              {transfer?.status || t("unknown")} {t("status")}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* Success/Error Feedback */}
      {feedbackStatus &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 left-4 z-[1000]">
            <FeedbackToast
              status={feedbackStatus}
              message={
                feedbackStatus === "success"
                  ? t("transferActionCompleted")
                  : error || t("transferActionFailed")
              }
              durationMs={1700}
              onHide={() => {
                setFeedbackStatus(null);
                setError(null);
              }}
            />
          </div>,
          document.body,
        )}
    </AnimatePresence>
  );
}
