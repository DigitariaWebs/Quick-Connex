"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Filter,
  Calendar,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  FileText,
  Stethoscope,
  ArrowRight,
  ChevronDown,
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
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  requestedDate: string;
  scheduledDate?: string;
  notes?: string;
}

interface SearchTransfersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTransfer?: (transfer: TransferRequest) => void;
}

export default function SearchTransfersModal({
  isOpen,
  onClose,
  onSelectTransfer,
}: SearchTransfersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TransferRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    status: "",
    priority: "",
    category: "",
  });

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

  // Search function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        ...(selectedFilters.status && { status: selectedFilters.status }),
        ...(selectedFilters.priority && { priority: selectedFilters.priority }),
        ...(selectedFilters.category && { category: selectedFilters.category }),
      });

      const response = await fetch(`/api/transfers/search?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.transfers || []);
      } else {
        console.error("Search failed");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search on input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFilters]);

  const handleTransferSelect = (transfer: TransferRequest) => {
    if (onSelectTransfer) {
      onSelectTransfer(transfer);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Glassmorphism Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <Search size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Search Transfers
                    </h2>
                    <p className="text-sm text-gray-600">
                      Find specific transfers or patients
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by patient name, transfer ID, hospital, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFilters.status}
                      onChange={(e) =>
                        setSelectedFilters({
                          ...selectedFilters,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white shadow-sm hover:shadow-md appearance-none focus:ring-purple-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFilters.priority}
                      onChange={(e) =>
                        setSelectedFilters({
                          ...selectedFilters,
                          priority: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white shadow-sm hover:shadow-md appearance-none focus:ring-purple-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Priority</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFilters.category}
                      onChange={(e) =>
                        setSelectedFilters({
                          ...selectedFilters,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 transition-all duration-300 bg-white shadow-sm hover:shadow-md appearance-none focus:ring-purple-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Categories</option>
                      <option value="patient">Patient</option>
                      <option value="envelope">Envelope</option>
                      <option value="patient_file">Patient File</option>
                      <option value="medical_equipment">
                        Medical Equipment
                      </option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Results */}
            <div className="px-6 pb-6 max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((transfer) => {
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
              ) : searchQuery.trim() && !isSearching ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No transfers found</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={24} className="text-purple-600" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Start typing to search transfers
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Search by patient name, transfer ID, hospital, or reason
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
