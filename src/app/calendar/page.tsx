"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, MapPin, Clock, X } from "lucide-react";
import CalendarView from "@/components/calendar/CalendarView";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

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
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
        <Sidebar user={user} onLogout={logout} onToggle={setSidebarCollapsed} />
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
            user={user}
            onLogout={logout}
            pageTitle="Transfer Calendar"
            showPlusButton={true}
            onPlusClick={() => router.push("/transfers")}
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

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventDetails && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    Transfer Details
                  </h3>
                  <button
                    onClick={() => setShowEventDetails(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Patient Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Patient Information
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <div className="ml-2">
                          <div className="font-medium">
                            {selectedEvent.extendedProps.patient.firstName}{" "}
                            {selectedEvent.extendedProps.patient.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Dossier:{" "}
                            {selectedEvent.extendedProps.patient.dossierNumber}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Age:</span>
                        <span className="ml-2 font-medium">
                          {selectedEvent.extendedProps.patient.age} years
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Transfer Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span className="text-gray-600">From:</span>
                          <span className="font-medium">
                            {selectedEvent.extendedProps.fromHospital}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span className="text-gray-600">To:</span>
                          <span className="font-medium">
                            {selectedEvent.extendedProps.toHospital}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock size={16} className="text-gray-500" />
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">
                            {new Date(selectedEvent.start).toLocaleString()} -{" "}
                            {new Date(selectedEvent.end).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Status & Priority
                      </h4>
                      <div className="space-y-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedEvent.extendedProps.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : selectedEvent.extendedProps.priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : selectedEvent.extendedProps.priority ===
                                "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {selectedEvent.extendedProps.priority.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedEvent.extendedProps.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : selectedEvent.extendedProps.status ===
                                "accepted"
                              ? "bg-blue-100 text-blue-800"
                              : selectedEvent.extendedProps.status ===
                                "in_progress"
                              ? "bg-purple-100 text-purple-800"
                              : selectedEvent.extendedProps.status ===
                                "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedEvent.extendedProps.status
                            .replace("_", " ")
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Reason for Transfer
                    </h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedEvent.extendedProps.reason}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowEventDetails(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowEventDetails(false);
                        router.push("/transfers");
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Settings size={16} />
                      <span>Edit Schedule</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
