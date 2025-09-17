"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface TransferRequest {
  _id: string;
  transferId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    age: number;
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

interface TransferRequestCardProps {
  transfer: TransferRequest;
  onAccept: (transferId: string) => void;
  currentUserId: string;
}

export default function TransferRequestCard({
  transfer,
  onAccept,
  currentUserId,
}: TransferRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
        body: JSON.stringify({
          assignedTo: currentUserId,
          notes: "Transfer accepted by employee",
        }),
      });

      const data = await response.json();

      if (data.success) {
        onAccept(transfer._id);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const priorityColors = getPriorityColor(transfer.priority);
  const statusColors = getStatusColor(transfer.status);

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
      }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-3xl sidebar-shadow overflow-hidden border border-gray-100 hover:border-gray-200 cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Priority Indicator */}
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${priorityColors.gradient}`}
      ></div>

      {/* Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {transfer.patientInfo.firstName} {transfer.patientInfo.lastName}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-2">Age: {transfer.patientInfo.age}</span>
                <span className="flex items-center">
                  {statusColors.icon}
                  <span className={`capitalize ${statusColors.text}`}>
                    {transfer.status.replace("_", " ")}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-2xl text-xs font-semibold ${priorityColors.bg} ${priorityColors.text} border ${priorityColors.border} uppercase`}
          >
            {transfer.priority}
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-1 gap-y-2 gap-x-4 mt-4">
          <div className="flex items-center text-sm">
            <User size={14} className="mr-2 text-gray-400" />
            <span className="text-gray-700">
              {transfer.patientInfo.age} years old
            </span>
          </div>
        </div>
      </div>

      {/* Transfer Route */}
      <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">From</p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {transfer.fromHospital}
            </p>
            <p className="text-xs text-gray-600">{transfer.fromDepartment}</p>
          </div>

          <div className="px-3">
            <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center">
              <ArrowRight size={16} className="text-blue-600" />
            </div>
          </div>

          <div className="flex-1 text-right">
            <p className="text-xs text-gray-500 mb-1">To</p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {transfer.toHospital}
            </p>
            <p className="text-xs text-gray-600">{transfer.toDepartment}</p>
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm">
            <Calendar size={14} className="mr-2 text-gray-400" />
            <span className="text-gray-700">
              {formatDate(transfer.requestedDate)}
            </span>
          </div>
        </div>

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
        {transfer.status === "pending" ? (
          <div className="mt-4 flex space-x-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                handleAccept();
              }}
              disabled={isAccepting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-2xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isAccepting ? "Accepting..." : "Accept Transfer"}
            </motion.button>

            <div className="px-3 py-2 border border-gray-200 text-gray-700 rounded-2xl font-medium flex items-center justify-center">
              {showDetails ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <div className="px-3 py-2 border border-gray-200 text-gray-700 rounded-2xl font-medium flex items-center justify-center">
              {showDetails ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </div>
          </div>
        )}

        {/* Additional Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-gray-100 overflow-hidden"
            >
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Transfer ID:</span>
                  <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-2xl border border-blue-200">
                    {transfer.transferId}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Requested by:</span>
                  <span className="font-medium text-gray-700">
                    {transfer.requestedBy.firstName}{" "}
                    {transfer.requestedBy.lastName}
                  </span>
                </div>

                {transfer.scheduledDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Scheduled Date:</span>
                    <span className="text-gray-700">
                      {formatDate(transfer.scheduledDate)}
                    </span>
                  </div>
                )}

                {transfer.notes && (
                  <div className="mt-2">
                    <p className="text-gray-500 mb-1">Notes:</p>
                    <p className="text-gray-700 bg-gray-50 p-2 rounded-2xl text-xs">
                      {transfer.notes}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
