"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  MapPin,
  Clock,
  X,
  User,
  Package,
  Stethoscope,
  Calendar,
  Building2,
  AlertCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import CalendarView from "@/components/features/calendar/CalendarView";
import Sidebar from "@/components/features/dashboard/Sidebar";
import DashboardHeader from "@/components/features/dashboard/DashboardHeader";

interface CalendarEvent {
  id: string;
  transferId: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: any;
}

export default function CalendarPage() {
  const router = useRouter();
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout,
  } = useSession();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleDateClick = (date: Date) => {
    // Date click functionality removed - no longer needed with simplified scheduling
    console.log("Date clicked:", date);
  };

  const handleCreateTransfer = (date: Date) => {
    // Redirect to transfers page for creating new transfers
    router.push("/transfers");
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render page if not authenticated
  if (!isAuthenticated) {
    return null;
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
          onMobileToggle={setIsMobileMenuOpen}
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
            pageTitle="Transfer Calendar"
            showPlusButton={false}
            onPlusClick={() => router.push("/transfers")}
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        )}

        <div className="p-4 lg:p-6">
          {/* Calendar View */}
          <CalendarView
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onCreateTransfer={handleCreateTransfer}
          />
        </div>
      </div>

      {/* Event Details Modal - Redesigned */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden mx-2 lg:mx-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dynamic Header Based on Transfer Type */}
              <div
                className={`relative px-4 lg:px-8 py-4 lg:py-6 ${
                  selectedEvent.extendedProps.transferCategory === "patient"
                    ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600"
                    : selectedEvent.extendedProps.transferCategory ===
                      "envelope"
                    ? "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600"
                    : "bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600"
                }`}
              >
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="absolute top-3 right-3 lg:top-4 lg:right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                >
                  <X size={16} className="text-white lg:w-[18px] lg:h-[18px]" />
                </button>

                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                    {selectedEvent.extendedProps.transferCategory ===
                    "patient" ? (
                      <User size={28} className="text-white" />
                    ) : selectedEvent.extendedProps.transferCategory ===
                      "envelope" ? (
                      <Package size={28} className="text-white" />
                    ) : (
                      <Stethoscope size={28} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                      <span className="px-2 lg:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white w-fit">
                        {selectedEvent.extendedProps.transferCategory ===
                        "patient"
                          ? "Patient Transfer"
                          : selectedEvent.extendedProps.transferCategory ===
                            "envelope"
                          ? "Envelope Transfer"
                          : "Medical Equipment"}
                      </span>
                      <span
                        className={`px-2 lg:px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                          selectedEvent.extendedProps.priority === "urgent"
                            ? "bg-red-500 text-white"
                            : selectedEvent.extendedProps.priority === "high"
                            ? "bg-orange-500 text-white"
                            : selectedEvent.extendedProps.priority === "medium"
                            ? "bg-yellow-500 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {selectedEvent.extendedProps.priority.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-lg lg:text-2xl font-bold text-white">
                      {selectedEvent.title}
                    </h2>
                    <p className="text-white/80 text-sm mt-1 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(selectedEvent.start).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 lg:p-8 space-y-4 lg:space-y-6">
                {/* Transfer-Specific Details */}
                {selectedEvent.extendedProps.transferCategory === "patient" && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 lg:p-6 border border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center">
                      <User size={16} className="mr-2" />
                      Patient Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Full Name
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedEvent.extendedProps.patient?.firstName}{" "}
                          {selectedEvent.extendedProps.patient?.lastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Age</p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedEvent.extendedProps.patient?.age} years old
                        </p>
                      </div>
                      {selectedEvent.extendedProps.patient?.dossierNumber && (
                        <div className="space-y-1 col-span-2">
                          <p className="text-xs text-gray-500 font-medium">
                            Dossier Number
                          </p>
                          <p className="text-base font-mono font-semibold text-blue-700">
                            {selectedEvent.extendedProps.patient.dossierNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.extendedProps.transferCategory ===
                  "envelope" && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 lg:p-6 border border-orange-100">
                    <h3 className="text-sm font-semibold text-orange-900 mb-4 flex items-center">
                      <Package size={16} className="mr-2" />
                      Envelope Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Sender
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedEvent.extendedProps.envelopeInfo
                            ?.senderName || "Unknown"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Recipient
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedEvent.extendedProps.envelopeInfo
                            ?.recipientName || "Unknown"}
                        </p>
                      </div>
                      {selectedEvent.extendedProps.envelopeInfo
                        ?.envelopeNumber && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 font-medium">
                            Envelope Number
                          </p>
                          <p className="text-base font-mono font-semibold text-orange-700">
                            {
                              selectedEvent.extendedProps.envelopeInfo
                                .envelopeNumber
                            }
                          </p>
                        </div>
                      )}
                      {selectedEvent.extendedProps.envelopeInfo?.contents && (
                        <div className="space-y-1 col-span-2">
                          <p className="text-xs text-gray-500 font-medium">
                            Contents
                          </p>
                          <p className="text-sm text-gray-700">
                            {selectedEvent.extendedProps.envelopeInfo.contents}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.extendedProps.transferCategory ===
                  "medical_instruments" && (
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 lg:p-6 border border-purple-100">
                    <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center">
                      <Stethoscope size={16} className="mr-2" />
                      Equipment Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Equipment Name
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {selectedEvent.extendedProps.equipmentInfo
                            ?.equipmentName || "Unknown"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Serial Number
                        </p>
                        <p className="text-base font-mono font-semibold text-purple-700">
                          {selectedEvent.extendedProps.equipmentInfo
                            ?.serialNumber || "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">
                          Condition
                        </p>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {selectedEvent.extendedProps.equipmentInfo
                            ?.condition || "Unknown"}
                        </p>
                      </div>
                      {selectedEvent.extendedProps.equipmentInfo
                        ?.specialInstructions && (
                        <div className="space-y-1 col-span-2">
                          <p className="text-xs text-gray-500 font-medium">
                            Special Instructions
                          </p>
                          <p className="text-sm text-gray-700">
                            {
                              selectedEvent.extendedProps.equipmentInfo
                                .specialInstructions
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transfer Route */}
                <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    Transfer Route
                  </h3>
                  <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
                    <div className="flex-1">
                      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 border border-red-100">
                        <p className="text-xs font-semibold text-red-600 mb-1">
                          FROM
                        </p>
                        <div className="flex items-center space-x-2">
                          <Building2
                            size={18}
                            className="text-red-500 flex-shrink-0"
                          />
                          <p className="font-semibold text-gray-900 text-sm">
                            {selectedEvent.extendedProps.fromHospital}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-center lg:justify-start">
                      <ArrowRight
                        size={20}
                        className="text-gray-400 lg:w-6 lg:h-6"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                        <p className="text-xs font-semibold text-green-600 mb-1">
                          TO
                        </p>
                        <div className="flex items-center space-x-2">
                          <Building2
                            size={18}
                            className="text-green-500 flex-shrink-0"
                          />
                          <p className="font-semibold text-gray-900 text-sm">
                            {selectedEvent.extendedProps.toHospital}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 lg:p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock size={16} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Schedule
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Start
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedEvent.start).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">End</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(selectedEvent.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 lg:p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertCircle size={16} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Status
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${
                        selectedEvent.extendedProps.status === "pending"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : selectedEvent.extendedProps.status === "accepted"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : selectedEvent.extendedProps.status === "in_progress"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : selectedEvent.extendedProps.status === "completed"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                      }`}
                    >
                      {selectedEvent.extendedProps.status
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Transfer Reason */}
                {selectedEvent.extendedProps.reason && (
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-3">
                      <FileText size={16} className="text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Transfer Reason
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedEvent.extendedProps.reason}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedEvent.extendedProps.notes && (
                  <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <FileText size={16} className="text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-900">
                        Additional Notes
                      </h3>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {selectedEvent.extendedProps.notes}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
