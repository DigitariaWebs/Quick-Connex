"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
  Stethoscope,
  X,
} from "lucide-react";
import { TransferCategory } from "@/constants/transfer";
import { useNotification } from "@/contexts/NotificationContext";
import {
  canCancelTransfer,
  getRemainingCancellationTimeString,
} from "@/lib/transfers/transfer-cancellation-utils";

interface TransferRequest {
  _id: string;
  transferId: string;
  transferCategory?: TransferCategory;

  // Legacy patientInfo for backward compatibility
  patientInfo?: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
  };

  // New polymorphic transfer data
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
    fileInfo?: {
      patientName: string;
      dossierNumber: string;
      fileType: string;
      fileCount: number;
      urgency: "low" | "medium" | "high" | "urgent";
    };
    equipmentInfo?: {
      equipmentName: string;
      serialNumber?: string;
      model: string;
      condition: "excellent" | "good" | "fair" | "poor";
      maintenanceRequired: boolean;
      specialInstructions?: string;
    };
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
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedDate: string;
  scheduledDate?: string;
  acceptedAt?: string;
  notes?: string;
}

interface TransferRequestCardProps {
  transfer: TransferRequest;
  onAccept: (transferId: string) => void;
  onCancel?: (transferId: string) => void;
  onSelect: (transfer: TransferRequest) => void;
  currentUserId: string;
  currentUserType: "manager" | "employee";
  isSelected?: boolean;
}

// Helper function to get transfer display information
function getTransferDisplayInfo(transfer: TransferRequest) {
  const category = transfer.transferCategory || TransferCategory.PATIENT;

  switch (category) {
    case TransferCategory.PATIENT:
      const patientInfo =
        transfer.patientInfo || transfer.transferData?.patientInfo;
      return {
        title: patientInfo
          ? `${patientInfo.firstName} ${patientInfo.lastName}`
          : "Patient Transfer",
        subtitle: patientInfo?.dossierNumber || "Patient",
        icon: User,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
        category: "Patient",
      };

    case TransferCategory.ENVELOPE:
      const envelopeInfo = transfer.transferData?.envelopeInfo;
      return {
        title: envelopeInfo
          ? `Envelope: ${envelopeInfo.senderName} → ${envelopeInfo.recipientName}`
          : "Envelope Transfer",
        subtitle: envelopeInfo?.contents || "Package/Envelope",
        icon: Package,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-100",
        category: "Envelope",
      };

    case TransferCategory.MEDICAL_INSTRUMENTS:
      const equipmentInfo = transfer.transferData?.equipmentInfo;
      return {
        title: equipmentInfo
          ? `Medical Equipment: ${equipmentInfo.equipmentName}`
          : "Medical Instruments Transfer",
        subtitle: equipmentInfo?.serialNumber || "Medical Equipment",
        icon: Stethoscope,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
        category: "Medical Instruments",
      };

    default:
      return {
        title: "Transfer",
        subtitle: "Unknown Type",
        icon: User,
        iconColor: "text-gray-600",
        bgColor: "bg-gray-100",
        category: "Unknown",
      };
  }
}

export default function TransferRequestCard({
  transfer,
  onAccept,
  onCancel,
  onSelect,
  currentUserId,
  currentUserType,
  isSelected = false,
}: TransferRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isHoveringCancel, setIsHoveringCancel] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { showSuccess } = useNotification();

  // Get display information based on transfer type
  const displayInfo = getTransferDisplayInfo(transfer);
  const IconComponent = displayInfo.icon;

  // Update current time every minute for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate remaining time using current time state
  const getRemainingTimeString = () => {
    if (!transfer.acceptedAt) return "No time limit";

    const acceptedTime = new Date(transfer.acceptedAt);
    const now = currentTime;
    const timeDiff = now.getTime() - acceptedTime.getTime();
    const hoursLeft = Math.max(0, 24 - Math.floor(timeDiff / (1000 * 60 * 60)));
    const minutesLeft = Math.max(
      0,
      60 - Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    );

    if (hoursLeft === 0 && minutesLeft === 0) {
      return "Time expired";
    } else if (hoursLeft === 0) {
      return `${minutesLeft}m left`;
    } else {
      return `${hoursLeft}h ${minutesLeft}m left`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-200",
          icon: "text-red-500",
          gradient: "from-red-500 to-pink-500",
        };
      case "high":
        return {
          bg: "bg-orange-100",
          text: "text-orange-800",
          border: "border-orange-200",
          icon: "text-orange-500",
          gradient: "from-orange-500 to-amber-500",
        };
      case "medium":
        return {
          bg: "bg-amber-100",
          text: "text-amber-800",
          border: "border-amber-200",
          icon: "text-amber-500",
          gradient: "from-amber-500 to-yellow-500",
        };
      case "low":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-200",
          icon: "text-green-500",
          gradient: "from-green-500 to-emerald-500",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          border: "border-gray-200",
          icon: "text-gray-500",
          gradient: "from-gray-500 to-slate-500",
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-100",
          text: "text-amber-800",
          icon: <Clock size={12} className="mr-1 text-amber-500" />,
        };
      case "accepted":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: <CheckCircle2 size={12} className="mr-1 text-green-500" />,
        };
      case "in_progress":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          icon: <ArrowRight size={12} className="mr-1 text-blue-500" />,
        };
      case "completed":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          icon: <CheckCircle2 size={12} className="mr-1 text-purple-500" />,
        };
      case "cancelled":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          icon: <AlertTriangle size={12} className="mr-1 text-red-500" />,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: null,
        };
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/transfers/${transfer._id}/accept`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          assignedTo: currentUserId,
          notes: "Transfer accepted by employee",
        }),
      });

      const data = await response.json();

      if (data.success) {
        onAccept(transfer._id);
        // Show success notification
        showSuccess("Transfer accepted successfully!");
      } else {
        alert(data.error || "Failed to accept transfer");
      }
    } catch (error) {
      console.error("Error accepting transfer:", error);
      alert("Network error occurred");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt(
      "Please provide a reason for cancelling this transfer:"
    );
    if (!reason) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/transfers/${transfer._id}/cancel`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          reason: reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onCancel?.(transfer._id);
        // Show success message
        showSuccess("Transfer cancelled successfully!");
      } else {
        alert(data.error || "Failed to cancel transfer");
      }
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      alert("Network error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper functions to get hospital names
  const getHospitalName = (hospital: string | any) => {
    if (typeof hospital === "string") {
      return hospital;
    }
    return hospital?.name || "Unknown Hospital";
  };

  const priorityColors = getPriorityColor(transfer.priority);
  const statusColors = getStatusColor(transfer.status);

  return (
    <motion.div
      whileHover={{
        y: isSelected ? 0 : -4,
        boxShadow: isSelected
          ? "0 25px 50px -5px rgba(59, 130, 246, 0.3), 0 20px 25px -6px rgba(59, 130, 246, 0.2)"
          : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
      }}
      whileTap={{ scale: isSelected ? 1 : 0.98 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-3xl sidebar-shadow overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? "border-2 border-blue-400 bg-gradient-to-br from-white to-blue-50 shadow-2xl ring-4 ring-blue-100"
          : "border border-gray-100 hover:border-gray-200"
      }`}
      onClick={() => onSelect(transfer)}
    >
      {/* Priority Indicator */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${priorityColors.gradient}`}
      ></div>

      {/* Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl ${displayInfo.bgColor} flex items-center justify-center`}
            >
              <IconComponent size={20} className={displayInfo.iconColor} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {displayInfo.title}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="flex items-center">
                  {statusColors.icon}
                  <span className={`capitalize ${statusColors.text}`}>
                    {transfer.status.replace("_", " ")}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <div
              className={`px-2.5 py-1 rounded-2xl text-xs font-semibold ${priorityColors.bg} ${priorityColors.text} border ${priorityColors.border} uppercase`}
            >
              {transfer.priority}
            </div>
          </div>
        </div>

        {/* Transfer-specific Info */}
        <div className="grid grid-cols-1 gap-y-2 gap-x-4 mt-4">
          {transfer.transferCategory === TransferCategory.PATIENT &&
            (transfer.patientInfo || transfer.transferData?.patientInfo) && (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User size={14} className="mr-2 text-gray-400" />
                  <span className="text-gray-700">
                    Age:{" "}
                    <span className="font-medium">
                      {
                        (
                          transfer.patientInfo ||
                          transfer.transferData?.patientInfo
                        )?.age
                      }{" "}
                      years old
                    </span>
                  </span>
                </div>
                {(transfer.patientInfo || transfer.transferData?.patientInfo)
                  ?.dossierNumber && (
                  <div className="flex items-center text-sm">
                    <FileText size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-700">
                      Dossier:{" "}
                      <span className="font-medium">
                        {
                          (
                            transfer.patientInfo ||
                            transfer.transferData?.patientInfo
                          )?.dossierNumber
                        }
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

          {transfer.transferCategory === TransferCategory.ENVELOPE &&
            transfer.transferData?.envelopeInfo && (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Package size={14} className="mr-2 text-gray-400" />
                  <span className="text-gray-700">
                    From: {transfer.transferData.envelopeInfo.senderName}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Package size={14} className="mr-2 text-gray-400" />
                  <span className="text-gray-700">
                    To: {transfer.transferData.envelopeInfo.recipientName}
                  </span>
                </div>
                {transfer.transferData.envelopeInfo.envelopeNumber && (
                  <div className="flex items-center text-sm">
                    <FileText size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-700">
                      Ref: {transfer.transferData.envelopeInfo.envelopeNumber}
                    </span>
                  </div>
                )}
              </div>
            )}

          {transfer.transferCategory === TransferCategory.MEDICAL_INSTRUMENTS &&
            transfer.transferData?.equipmentInfo && (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Stethoscope size={14} className="mr-2 text-gray-400" />
                  <span className="text-gray-700">
                    Serial: {transfer.transferData.equipmentInfo.serialNumber}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Stethoscope size={14} className="mr-2 text-gray-400" />
                  <span className="text-gray-700">
                    Condition:{" "}
                    <span className="capitalize font-medium">
                      {transfer.transferData.equipmentInfo.condition}
                    </span>
                  </span>
                </div>
                {transfer.transferData.equipmentInfo.specialInstructions && (
                  <div className="flex items-start text-sm">
                    <FileText
                      size={14}
                      className="mr-2 text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-700">
                      Instructions:{" "}
                      {transfer.transferData.equipmentInfo.specialInstructions}
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Transfer Route */}
      <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
        <div className="flex items-center">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-500 mb-1">From</p>
            <p
              className="text-sm font-medium text-gray-800 truncate"
              title={getHospitalName(transfer.fromHospital)}
            >
              {getHospitalName(transfer.fromHospital)}
            </p>
          </div>

          <div className="flex-shrink-0 px-2">
            <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center">
              <ArrowRight size={16} className="text-blue-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pl-3 text-right">
            <p className="text-xs text-gray-500 mb-1">To</p>
            <p
              className="text-sm font-medium text-gray-800 truncate"
              title={getHospitalName(transfer.toHospital)}
            >
              {getHospitalName(transfer.toHospital)}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="px-5 py-3">
        {transfer.scheduledDate && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-sm">
              <Calendar size={14} className="mr-2 text-gray-400" />
              <span className="text-gray-700">
                {formatDate(transfer.scheduledDate)}
              </span>
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-start mb-1">
            <FileText
              size={14}
              className="mr-2 text-gray-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-sm text-gray-700">{transfer.reason}</p>
          </div>
        </div>

        {/* Actions */}
        {transfer.status === "accepted" && currentUserType === "employee" ? (
          <div className="mt-4 flex space-x-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                handleAccept();
              }}
              disabled={isAccepting}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-2xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isAccepting ? "Accepting..." : "Accept Transfer"}
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`px-3 py-2 text-gray-700 rounded-2xl font-medium flex items-center justify-center ${
                isSelected
                  ? "bg-blue-100 border border-blue-300 text-blue-700"
                  : "border border-gray-200"
              }`}
            >
              <ArrowRight
                size={18}
                className="transform transition-transform"
              />
            </motion.div>
          </div>
        ) : transfer.status === "accepted" && currentUserType === "employee" ? (
          <div className="mt-4 flex justify-end">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-2xl font-medium text-sm border border-green-200">
              <div className="flex items-center">
                <CheckCircle2 size={16} className="mr-2" />
                Available for Assignment
              </div>
            </div>
          </div>
        ) : transfer.status === "pending" && currentUserType === "manager" ? (
          <div className="mt-4 flex justify-end">
            <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-2xl font-medium text-sm border border-amber-200">
              <div className="flex items-center">
                <Clock size={16} className="mr-2" />
                Waiting for Admin Approval
              </div>
            </div>
          </div>
        ) : transfer.status === "in_progress" &&
          currentUserType === "employee" ? (
          <div className="mt-4 flex space-x-3">
            {isSelected ? (
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    const adminPhone =
                      process.env.NEXT_PUBLIC_ADMIN_PHONE || "";
                    if (adminPhone) {
                      window.location.href = `tel:${adminPhone}`;
                    } else {
                      alert("Admin phone number not configured");
                    }
                  }}
                  onMouseEnter={() => setIsHoveringCancel(true)}
                  onMouseLeave={() => setIsHoveringCancel(false)}
                  className="bg-blue-500 text-white rounded-2xl font-medium hover:bg-blue-600 transition-all duration-300 shadow-sm overflow-hidden flex items-center justify-center"
                  style={{
                    width: isHoveringCancel ? "200px" : "48px",
                    height: "48px",
                    padding: isHoveringCancel ? "12px 16px" : "0px",
                    transition: "all 0.3s ease-in-out",
                  }}
                >
                  <div className="flex items-center justify-center">
                    {!isHoveringCancel ? (
                      <Phone size={20} />
                    ) : (
                      <div
                        className="flex items-center"
                        style={{
                          opacity: isHoveringCancel ? 1 : 0,
                          transition: "opacity 0.2s ease-in-out 0.2s",
                        }}
                      >
                        <Phone size={16} className="mr-2" />
                        <span className="text-sm font-medium whitespace-nowrap">
                          Contact Admin
                        </span>
                      </div>
                    )}
                  </div>
                </motion.button>
              </div>
            ) : (
              <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-2xl font-medium text-sm border border-blue-200">
                <div className="flex items-center">
                  <ArrowRight size={16} className="mr-2" />
                  In Progress
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`px-3 py-2 text-gray-700 rounded-2xl font-medium flex items-center justify-center ${
                isSelected
                  ? "bg-blue-100 border border-blue-300 text-blue-700"
                  : "border border-gray-200"
              }`}
            >
              <ArrowRight
                size={18}
                className="transform transition-transform"
              />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
