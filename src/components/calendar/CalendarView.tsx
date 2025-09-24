"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Edit,
  X,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  transferId: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    patient: {
      firstName: string;
      lastName: string;
      patientId: string;
    };
    fromHospital: string;
    toHospital: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
    reason: string;
    requestedBy: {
      firstName: string;
      lastName: string;
    };
    assignedTo?: {
      firstName: string;
      lastName: string;
    };
    scheduling?: {
      transferTime: string;
    };
    notes?: string;
  };
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onCreateTransfer?: (date: Date) => void;
}

export default function CalendarView({
  onEventClick,
  onDateClick,
  onCreateTransfer,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showEventModal, setShowEventModal] = useState(false);

  // Fetch calendar events
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, view]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = getViewStartDate(currentDate, view);
      const endDate = getViewEndDate(currentDate, view);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        view,
      });

      const response = await fetch(`/api/calendar?${params}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data.events);
      } else {
        setError(data.error || "Failed to fetch calendar events");
      }
    } catch (err) {
      setError("Network error occurred");
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = (date: Date, view: string): Date => {
    switch (view) {
      case "week":
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek;
      case "day":
        return new Date(date);
      default: // month
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
  };

  const getViewEndDate = (date: Date, view: string): Date => {
    switch (view) {
      case "week":
        const endOfWeek = new Date(date);
        endOfWeek.setDate(date.getDate() - date.getDay() + 6);
        return endOfWeek;
      case "day":
        return new Date(date);
      default: // month
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);

    switch (view) {
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        break;
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        break;
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${
          colors[priority as keyof typeof colors]
        }`}
      >
        {priority.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      accepted: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-purple-100 text-purple-800 border-purple-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${
          colors[status as keyof typeof colors]
        }`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === currentDay.toDateString();
      });

      days.push(
        <div
          key={i}
          className={`min-h-[120px] border border-gray-200 p-2 rounded-lg ${
            currentDay.getMonth() !== month
              ? "bg-gray-50 text-gray-400"
              : "bg-white"
          } ${
            currentDay.toDateString() === new Date().toDateString()
              ? "bg-blue-50 border-blue-200"
              : ""
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{currentDay.getDate()}</span>
            {currentDay.getMonth() === month && (
              <button
                onClick={() => onCreateTransfer?.(new Date(currentDay))}
                className="w-6 h-6 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <Plus size={12} />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                  onEventClick?.(event);
                }}
                className="text-xs p-2 rounded-lg cursor-pointer hover:opacity-80 transition-all"
                style={{
                  backgroundColor: event.backgroundColor,
                  color: event.textColor,
                }}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="opacity-75 text-xs">
                  {new Date(event.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div
            key={day + index}
            className="p-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === day.toDateString();
      });

      days.push(
        <div key={i} className="flex-1 border border-gray-200 rounded-lg">
          <div className="p-3 bg-gray-50 rounded-t-lg">
            <div className="text-xs font-medium text-gray-500">
              {day.toLocaleDateString([], { weekday: "short" }).charAt(0)}
            </div>
            <div className="text-lg font-bold">{day.getDate()}</div>
          </div>

          <div className="p-2 space-y-2 min-h-[400px]">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventModal(true);
                  onEventClick?.(event);
                }}
                className="p-2 rounded-lg cursor-pointer hover:opacity-80 text-xs transition-all"
                style={{
                  backgroundColor: event.backgroundColor,
                  color: event.textColor,
                }}
              >
                <div className="font-medium">{event.title}</div>
                <div className="opacity-75 text-xs">
                  {new Date(event.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="flex">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex">
        <div className="w-16 border-r border-gray-200">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b border-gray-100 flex items-center justify-center text-sm text-gray-500"
            >
              {hour === 0
                ? "12 AM"
                : hour < 12
                ? `${hour} AM`
                : hour === 12
                ? "12 PM"
                : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        <div className="flex-1 relative">
          {hours.map((hour) => (
            <div key={hour} className="h-16 border-b border-gray-100 relative">
              {dayEvents
                .filter((event) => new Date(event.start).getHours() === hour)
                .map((event) => {
                  const startMinutes = new Date(event.start).getMinutes();
                  const duration =
                    (new Date(event.end).getTime() -
                      new Date(event.start).getTime()) /
                    (1000 * 60);
                  const height = (duration / 60) * 64; // 64px per hour

                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventModal(true);
                        onEventClick?.(event);
                      }}
                      className="absolute left-1 right-1 rounded-lg cursor-pointer hover:opacity-80 p-1 text-xs transition-all"
                      style={{
                        top: `${(startMinutes / 60) * 64}px`,
                        height: `${height}px`,
                        backgroundColor: event.backgroundColor,
                        color: event.textColor,
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="opacity-75 text-xs">
                        {new Date(event.start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (view) {
      case "week":
        return renderWeekView();
      case "day":
        return renderDayView();
      default:
        return renderMonthView();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Minimal Header with Circular Controls */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateDate("prev")}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <h3 className="text-lg font-semibold text-gray-800 min-w-[180px] text-center">
            {currentDate.toLocaleDateString([], {
              year: "numeric",
              month: "long",
              ...(view === "day" && { day: "numeric" }),
            })}
          </h3>

          <button
            onClick={() => navigateDate("next")}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {(["month", "week", "day"] as const).map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                view === viewType
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {viewType.charAt(0).toUpperCase()}
            </button>
          ))}

          <button
            onClick={fetchCalendarEvents}
            className="w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors ml-2"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-4">
        {error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <button
              onClick={fetchCalendarEvents}
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors mx-auto"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        ) : (
          renderView()
        )}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventModal(false)}
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
                  <h3 className="text-xl font-bold text-gray-800">Details</h3>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Patient Info */}
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Patient
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
                        Route
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span className="text-gray-600">From:</span>
                          <span className="font-medium">
                            {typeof selectedEvent.extendedProps.fromHospital ===
                            "string"
                              ? selectedEvent.extendedProps.fromHospital
                              : selectedEvent.extendedProps.fromHospital
                                  ?.name || "Unknown Hospital"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span className="text-gray-600">To:</span>
                          <span className="font-medium">
                            {typeof selectedEvent.extendedProps.toHospital ===
                            "string"
                              ? selectedEvent.extendedProps.toHospital
                              : selectedEvent.extendedProps.toHospital?.name ||
                                "Unknown Hospital"}
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
                        Status
                      </h4>
                      <div className="space-y-2">
                        {getPriorityBadge(selectedEvent.extendedProps.priority)}
                        {getStatusBadge(selectedEvent.extendedProps.status)}
                      </div>
                    </div>
                  </div>

                  {/* Scheduling Details */}
                  {selectedEvent.extendedProps.scheduling && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Scheduling Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"></div>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Reason</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                      {selectedEvent.extendedProps.reason}
                    </p>
                  </div>

                  {/* Notes */}
                  {selectedEvent.extendedProps.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Notes
                      </h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedEvent.extendedProps.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Close
                    </button>
                    <button className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                      <Edit size={16} />
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
