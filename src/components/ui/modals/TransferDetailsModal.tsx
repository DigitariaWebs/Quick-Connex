"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import LoadingSpinner from "@/components/features/dashboard/LoadingSpinner";

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

interface TransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string | null;
  onTransferUpdate?: () => void;
}

export default function TransferDetailsModal({
  isOpen,
  onClose,
  transferId,
  onTransferUpdate,
}: TransferDetailsModalProps) {
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [relatedTransfers, setRelatedTransfers] = useState<RelatedTransfer[]>(
    []
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

  // Fetch transfer details
  const fetchTransferDetails = async () => {
    if (!transferId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/transfers/${transferId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch transfer details"
        );
      }

      const data = await response.json();

      if (data.success) {
        setTransfer(data.data.transfer);
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
          : "Failed to fetch transfer details"
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (transferId && isOpen) {
      fetchTransferDetails();
    }
  }, [transferId, isOpen]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransferDetails();
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to perform action");
      }

      const data = await response.json();

      if (data.success) {
        // Refresh transfer details
        await fetchTransferDetails();

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
        error instanceof Error ? error.message : "Failed to perform action"
      );
    }
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: { color: "text-yellow-600", bg: "bg-yellow-100", icon: Clock },
      accepted: {
        color: "text-blue-600",
        bg: "bg-blue-100",
        icon: CheckCircle2,
      },
      in_progress: {
        color: "text-purple-600",
        bg: "bg-purple-100",
        icon: RefreshCw,
      },
      completed: {
        color: "text-green-600",
        bg: "bg-green-100",
        icon: CheckCircle2,
      },
      cancelled: { color: "text-red-600", bg: "bg-red-100", icon: XCircle },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // Get priority info
  const getPriorityInfo = (priority: string) => {
    const priorityMap = {
      low: { color: "text-gray-600", bg: "bg-gray-100", icon: Flag },
      medium: { color: "text-blue-600", bg: "bg-blue-100", icon: Flag },
      high: { color: "text-orange-600", bg: "bg-orange-100", icon: Flag },
      urgent: { color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle },
    };
    return (
      priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Transfer Details
                  </h2>
                  <p className="text-sm text-gray-600">
                    {transfer?.transferId || "Loading..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    size={16}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Close"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error Loading Transfer
                  </h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : transfer ? (
              <div className="space-y-6">
                {/* Transfer Overview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <FileText size={24} className="text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                          {transfer.transferId}
                        </h1>
                        <p className="text-gray-600 capitalize">
                          {transfer.transferCategory.replace("_", " ")} Transfer
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const statusInfo = getStatusInfo(transfer.status);
                        const StatusIcon = statusInfo.icon;
                        return (
                          <div
                            className={`px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} flex items-center space-x-2`}
                          >
                            <StatusIcon size={16} />
                            <span className="font-medium capitalize">
                              {transfer.status.replace("_", " ")}
                            </span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const priorityInfo = getPriorityInfo(transfer.priority);
                        const PriorityIcon = priorityInfo.icon;
                        return (
                          <div
                            className={`px-3 py-1 rounded-full ${priorityInfo.bg} ${priorityInfo.color} flex items-center space-x-2`}
                          >
                            <PriorityIcon size={16} />
                            <span className="font-medium capitalize">
                              {transfer.priority}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Transfer Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient/Transfer Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <User size={20} className="text-blue-600" />
                        <span>Transfer Information</span>
                      </h3>

                      {transfer.transferCategory === "patient" &&
                        transfer.patientInfo && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <User size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {transfer.patientInfo.firstName}{" "}
                                  {transfer.patientInfo.lastName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Age: {transfer.patientInfo.age} | Dossier:{" "}
                                  {transfer.patientInfo.dossierNumber || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                      {transfer.transferCategory === "envelope" &&
                        transfer.transferData?.envelopeInfo && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileText
                                  size={16}
                                  className="text-green-600"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  Envelope #
                                  {
                                    transfer.transferData.envelopeInfo
                                      .envelopeNumber
                                  }
                                </p>
                                <p className="text-sm text-gray-600">
                                  From:{" "}
                                  {
                                    transfer.transferData.envelopeInfo
                                      .senderName
                                  }
                                </p>
                                <p className="text-sm text-gray-600">
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

                      {transfer.transferCategory === "medical_instruments" &&
                        transfer.transferData?.equipmentInfo && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Shield size={16} className="text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {
                                    transfer.transferData.equipmentInfo
                                      .equipmentName
                                  }
                                </p>
                                <p className="text-sm text-gray-600">
                                  Model:{" "}
                                  {transfer.transferData.equipmentInfo.model}
                                </p>
                                <p className="text-sm text-gray-600">
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
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <MapPin size={20} className="text-green-600" />
                        <span>Route Information</span>
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin size={14} className="text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">From</p>
                            <p className="text-sm text-gray-600">
                              {transfer.fromHospital.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transfer.fromHospital.address}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin size={14} className="text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">To</p>
                            <p className="text-sm text-gray-600">
                              {transfer.toHospital.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transfer.toHospital.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Requested By
                          </p>
                          <p className="text-sm text-gray-600">
                            {transfer.requestedBy.firstName}{" "}
                            {transfer.requestedBy.lastName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Calendar size={14} className="text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Requested Date
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(
                              transfer.requestedDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {transfer.assignedTo && (
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <UserCheck size={14} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Assigned To
                            </p>
                            <p className="text-sm text-gray-600">
                              {transfer.assignedTo.firstName}{" "}
                              {transfer.assignedTo.lastName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason */}
                  {transfer.reason && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Reason
                      </h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {transfer.reason}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {transfer.notes && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Notes
                      </h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {transfer.notes}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Admin Actions */}
                {adminContext && availableActions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Admin Actions
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {availableActions.map((action) => (
                        <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setSelectedAction(action.id);
                            setShowActionModal(true);
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${action.buttonClass}`}
                        >
                          {action.icon && (
                            <action.icon size={16} className="inline mr-2" />
                          )}
                          {action.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

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
                      <span>Timeline</span>
                    </h2>
                    <div className="space-y-4">
                      {transfer.timeline.map((event, index) => (
                        <div
                          key={event.id}
                          className="flex items-start space-x-4"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock size={14} className="text-blue-600" />
                          </div>
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

                {/* Related Transfers */}
                {relatedTransfers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Related Transfers
                    </h2>
                    <div className="space-y-3">
                      {relatedTransfers.map((relatedTransfer) => (
                        <div
                          key={relatedTransfer._id}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {relatedTransfer.transferId}
                              </p>
                              <p className="text-sm text-gray-600">
                                {relatedTransfer.fromHospital.name} →{" "}
                                {relatedTransfer.toHospital.name}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const statusInfo = getStatusInfo(
                                  relatedTransfer.status
                                );
                                const StatusIcon = statusInfo.icon;
                                return (
                                  <div
                                    className={`px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} flex items-center space-x-1`}
                                  >
                                    <StatusIcon size={12} />
                                    <span className="text-xs font-medium capitalize">
                                      {relatedTransfer.status.replace("_", " ")}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
