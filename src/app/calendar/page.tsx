"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Plus,
  Settings,
  Bell,
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
} from "lucide-react";
import CalendarView from "@/components/calendar/CalendarView";
import AdvancedSchedulingForm from "@/components/forms/AdvancedSchedulingForm";
import Sidebar from "@/components/dashboard/Sidebar";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";

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
  const [showSchedulingForm, setShowSchedulingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [calendarStats, setCalendarStats] = useState({
    totalTransfers: 0,
    todayTransfers: 0,
    upcomingTransfers: 0,
    conflicts: 0,
  });
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch calendar statistics
  useEffect(() => {
    if (isAuthenticated) {
      fetchCalendarStats();
    }
  }, [isAuthenticated]);

  const fetchCalendarStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59
      );

      const params = new URLSearchParams({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        view: "day",
      });

      const response = await fetch(`/api/calendar?${params}`);
      const data = await response.json();

      if (data.success) {
        const todayTransfers = data.data.events.length;

        // Fetch upcoming transfers (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingParams = new URLSearchParams({
          startDate: endOfDay.toISOString(),
          endDate: nextWeek.toISOString(),
          view: "week",
        });

        const upcomingResponse = await fetch(`/api/calendar?${upcomingParams}`);
        const upcomingData = await upcomingResponse.json();
        const upcomingTransfers = upcomingData.success
          ? upcomingData.data.events.length
          : 0;

        setCalendarStats({
          totalTransfers: todayTransfers + upcomingTransfers,
          todayTransfers,
          upcomingTransfers,
          conflicts: 0, // This would be fetched from conflicts API
        });
      }
    } catch (error) {
      console.error("Error fetching calendar stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowSchedulingForm(true);
  };

  const handleCreateTransfer = (date: Date) => {
    setSelectedDate(date);
    setShowSchedulingForm(true);
  };

  const handleSaveScheduling = async (schedulingData: any) => {
    try {
      // Here you would typically save the scheduling data
      // For now, we'll just close the form
      setShowSchedulingForm(false);
      setSelectedDate(null);

      // Refresh calendar data
      // This would trigger a refresh in the CalendarView component
    } catch (error) {
      console.error("Error saving scheduling:", error);
    }
  };

  const handleExportCalendar = () => {
    // Implement calendar export functionality
    console.log("Exporting calendar...");
  };

  const handleImportCalendar = () => {
    // Implement calendar import functionality
    console.log("Importing calendar...");
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
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Transfer Calendar
                </h1>
                <p className="text-sm text-gray-600">
                  Manage and schedule patient transfers
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportCalendar}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={handleImportCalendar}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={() => setShowSchedulingForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>Schedule Transfer</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Transfers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : calendarStats.totalTransfers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : calendarStats.todayTransfers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : calendarStats.upcomingTransfers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conflicts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "..." : calendarStats.conflicts}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <CalendarView
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onCreateTransfer={handleCreateTransfer}
          />
        </div>
      </div>

      {/* Scheduling Form Modal */}
      <AnimatePresence>
        {showSchedulingForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSchedulingForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-6xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AdvancedSchedulingForm
                onSave={handleSaveScheduling}
                onCancel={() => setShowSchedulingForm(false)}
                transferId={selectedEvent?.transferId}
                isEditing={!!selectedEvent}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">
                          {selectedEvent.extendedProps.patient.firstName}{" "}
                          {selectedEvent.extendedProps.patient.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Patient ID:</span>
                        <span className="ml-2 font-medium">
                          {selectedEvent.extendedProps.patient.patientId}
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
                        setShowSchedulingForm(true);
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
