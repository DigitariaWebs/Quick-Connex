"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/auth/useAuth';
import { motion, AnimatePresence } from "framer-motion";
import { Settings, MapPin, Clock, X } from "lucide-react";
import CalendarView from '@/components/features/calendar/CalendarView';
import Sidebar from '@/components/features/dashboard/Sidebar';
import DashboardHeader from '@/components/features/dashboard/DashboardHeader';

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
            className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-0">
                {/* Modern Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Clock size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Transfer Details
                        </h3>
                        <p className="text-blue-100 text-sm">
                          {new Date(selectedEvent.start).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Patient Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {selectedEvent.extendedProps.patient.firstName[0]}
                            {selectedEvent.extendedProps.patient.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">
                            {selectedEvent.extendedProps.patient.firstName}{" "}
                            {selectedEvent.extendedProps.patient.lastName}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {selectedEvent.extendedProps.patient.age} years old
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">
                          Dossier Number
                        </p>
                        <p className="font-mono text-sm font-semibold text-gray-700">
                          {selectedEvent.extendedProps.patient.dossierNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Route */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin size={18} className="text-blue-500 mr-2" />
                      Transfer Route
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">FROM</p>
                          <p className="font-medium text-gray-900">
                            {selectedEvent.extendedProps.fromHospital}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 border-l-2 border-dashed border-gray-300 h-6"></div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">TO</p>
                          <p className="font-medium text-gray-900">
                            {selectedEvent.extendedProps.toHospital}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                        Priority
                      </h4>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          selectedEvent.extendedProps.priority === "urgent"
                            ? "bg-red-100 text-red-700"
                            : selectedEvent.extendedProps.priority === "high"
                            ? "bg-orange-100 text-orange-700"
                            : selectedEvent.extendedProps.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {selectedEvent.extendedProps.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                        Status
                      </h4>
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          selectedEvent.extendedProps.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : selectedEvent.extendedProps.status === "accepted"
                            ? "bg-blue-100 text-blue-700"
                            : selectedEvent.extendedProps.status ===
                              "in_progress"
                            ? "bg-purple-100 text-purple-700"
                            : selectedEvent.extendedProps.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {selectedEvent.extendedProps.status
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Schedule Time */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock size={18} className="text-blue-500 mr-2" />
                      Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Start Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedEvent.start).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">End Time</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedEvent.end).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Transfer Reason
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedEvent.extendedProps.reason}
                    </p>
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
