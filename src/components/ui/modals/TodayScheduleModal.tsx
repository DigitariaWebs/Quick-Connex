"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  MapPin,
  ArrowRight,
  User,
  Calendar,
  FileText,
  Package,
  Stethoscope,
} from "lucide-react";
import { TransferCategory } from '@/constants/transfer';

interface TransferRequest {
  _id: string;
  transferId: string;
  transferCategory?: TransferCategory;
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
    };
  };
  fromHospital: string | any;
  toHospital: string | any;
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
  notes?: string;
}

interface TodayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransfer?: (transfer: TransferRequest) => void;
  currentUserId: string;
  currentUserType: "employee" | "manager";
}

export default function TodayScheduleModal({
  isOpen,
  onClose,
  onSelectTransfer,
  currentUserId,
  currentUserType,
}: TodayScheduleModalProps) {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "in_progress" | "completed" | "scheduled"
  >("all");

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Fetch today's scheduled transfers
  const fetchTodayTransfers = async (statusFilter: string = "all") => {
    setLoading(true);
    setError(null);
    try {
      const today = getTodayDate();
      const queryParams = new URLSearchParams({
        scheduledDate: today,
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/transfers?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTransfers(data.transfers || []);
      } else {
        setError("Failed to load today's transfers");
        setTransfers([]);
      }
    } catch (error) {
      console.error("Error fetching today's transfers:", error);
      setError("Network error occurred");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTodayTransfers(filter);
    }
  }, [isOpen, filter]);

  // Get display information for transfer
  const getTransferDisplayInfo = (transfer: TransferRequest) => {
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

      case TransferCategory.PATIENT_FILE:
        const fileInfo = transfer.transferData?.fileInfo;
        return {
          title: fileInfo ? `Files: ${fileInfo.patientName}` : "File Transfer",
          subtitle: fileInfo
            ? `${fileInfo.fileCount} ${fileInfo.fileType} files`
            : "Patient Files",
          icon: FileText,
          iconColor: "text-purple-600",
          bgColor: "bg-purple-100",
          category: "Files",
        };

      case TransferCategory.MEDICAL_EQUIPMENT:
        const equipmentInfo = transfer.transferData?.equipmentInfo;
        return {
          title: equipmentInfo
            ? equipmentInfo.equipmentName
            : "Equipment Transfer",
          subtitle: equipmentInfo
            ? `${equipmentInfo.model} (${equipmentInfo.condition})`
            : "Medical Equipment",
          icon: Stethoscope,
          iconColor: "text-green-600",
          bgColor: "bg-green-100",
          category: "Equipment",
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
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-200",
        };
      case "high":
        return {
          bg: "bg-orange-100",
          text: "text-orange-800",
          border: "border-orange-200",
        };
      case "medium":
        return {
          bg: "bg-amber-100",
          text: "text-amber-800",
          border: "border-amber-200",
        };
      case "low":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          border: "border-gray-200",
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          icon: <ArrowRight size={12} className="mr-1 text-blue-500" />,
        };
      case "completed":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: <CheckCircle2 size={12} className="mr-1 text-green-500" />,
        };
      case "accepted":
        return {
          bg: "bg-purple-100",
          text: "text-purple-800",
          icon: <Clock size={12} className="mr-1 text-purple-500" />,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: <Clock size={12} className="mr-1 text-gray-500" />,
        };
    }
  };

  const getHospitalName = (hospital: string | any) => {
    if (typeof hospital === "string") {
      return hospital;
    }
    return hospital?.name || "Unknown Hospital";
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter transfers based on search term
  const filteredTransfers = transfers.filter((transfer) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const displayInfo = getTransferDisplayInfo(transfer);

    return (
      displayInfo.title.toLowerCase().includes(searchLower) ||
      displayInfo.subtitle.toLowerCase().includes(searchLower) ||
      getHospitalName(transfer.fromHospital)
        .toLowerCase()
        .includes(searchLower) ||
      getHospitalName(transfer.toHospital)
        .toLowerCase()
        .includes(searchLower) ||
      transfer.reason.toLowerCase().includes(searchLower) ||
      transfer.transferId.toLowerCase().includes(searchLower)
    );
  });

  // Sort transfers by scheduled time
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    const timeA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
    const timeB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
    return timeA - timeB; // Earliest first
  });

  // Statistics
  const stats = {
    total: transfers.length,
    inProgress: transfers.filter((t) => t.status === "in_progress").length,
    completed: transfers.filter((t) => t.status === "completed").length,
    scheduled: transfers.filter(
      (t) => t.status === "accepted" && t.scheduledDate
    ).length,
    urgent: transfers.filter((t) => t.priority === "urgent").length,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchTodayTransfers(filter);
    } catch (error) {
      console.error("Error refreshing transfers:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTransferSelect = (transfer: TransferRequest) => {
    if (onSelectTransfer) {
      onSelectTransfer(transfer);
    }
    onClose();
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

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Today's Schedule
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Transfers scheduled for{" "}
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={20}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-600 mr-2" />
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                <div className="flex items-center">
                  <ArrowRight size={16} className="text-blue-600 mr-2" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">
                      In Progress
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.inProgress}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
                <div className="flex items-center">
                  <CheckCircle2 size={16} className="text-green-600 mr-2" />
                  <div>
                    <p className="text-xs text-green-600 font-medium">
                      Completed
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      {stats.completed}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-2xl p-3 border border-purple-100">
                <div className="flex items-center">
                  <Clock size={16} className="text-purple-600 mr-2" />
                  <div>
                    <p className="text-xs text-purple-600 font-medium">
                      Scheduled
                    </p>
                    <p className="text-lg font-bold text-purple-900">
                      {stats.scheduled}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                <div className="flex items-center">
                  <AlertTriangle size={16} className="text-red-600 mr-2" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Urgent</p>
                    <p className="text-lg font-bold text-red-900">
                      {stats.urgent}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search today's transfers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1 px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-800 hover:bg-white/90 hover:shadow-md transition-all duration-300 shadow-sm"
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown
                  size={16}
                  className={showFilters ? "rotate-180" : ""}
                />
              </button>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-4"
                >
                  <div className="p-4 bg-white/30 rounded-xl border border-gray-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-semibold text-black mb-1">
                          Status
                        </label>
                        <div className="relative">
                          <select
                            value={filter}
                            onChange={(e) =>
                              setFilter(
                                e.target.value as
                                  | "all"
                                  | "in_progress"
                                  | "completed"
                                  | "scheduled"
                              )
                            }
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md appearance-none focus:ring-blue-500 focus:border-transparent text-gray-900"
                          >
                            <option value="all">All Statuses</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown size={18} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">
                  Loading today's transfers...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <p className="text-red-600 text-sm mb-2">
                  Failed to load today's transfers
                </p>
                <p className="text-gray-500 text-xs">{error}</p>
              </div>
            ) : sortedTransfers.length > 0 ? (
              <div className="space-y-3">
                {sortedTransfers.map((transfer) => {
                  const displayInfo = getTransferDisplayInfo(transfer);
                  const IconComponent = displayInfo.icon;
                  const priorityColors = getPriorityColor(transfer.priority);
                  const statusColors = getStatusColor(transfer.status);

                  return (
                    <motion.div
                      key={transfer._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleTransferSelect(transfer)}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all duration-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-10 h-10 rounded-2xl ${displayInfo.bgColor} flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent
                            size={20}
                            className={displayInfo.iconColor}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-800 truncate">
                                {displayInfo.title}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {displayInfo.subtitle}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="flex items-center text-xs text-gray-700">
                                  <MapPin
                                    size={12}
                                    className="mr-1 text-gray-500"
                                  />
                                  {getHospitalName(transfer.fromHospital)} →{" "}
                                  {getHospitalName(transfer.toHospital)}
                                </span>
                                {transfer.scheduledDate && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    {formatTime(transfer.scheduledDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1 ml-3">
                              <div
                                className={`px-2 py-1 rounded-lg text-xs font-medium ${priorityColors.bg} ${priorityColors.text} border ${priorityColors.border}`}
                              >
                                {transfer.priority}
                              </div>
                              <div className="flex items-center text-xs">
                                {statusColors.icon}
                                <span
                                  className={`capitalize ${statusColors.text}`}
                                >
                                  {transfer.status.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  No transfers scheduled for today
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {filter !== "all"
                    ? `No ${filter} transfers for today`
                    : "All scheduled transfers have been completed"}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
