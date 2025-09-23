"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  Activity,
  Hospital,
  Stethoscope,
  Ambulance,
  Shield,
  MessageSquare,
} from "lucide-react";

interface TransferRequest {
  _id: string;
  transferId: string;
  patientInfo: {
    firstName: string;
    lastName: string;
    age: number;
    dossierNumber?: string;
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
  notes?: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type:
    | "request"
    | "approval"
    | "preparation"
    | "transport"
    | "arrival"
    | "completion"
    | "note";
  status: "completed" | "current" | "pending";
  actor?: string;
  icon: React.ReactNode;
  details?: string;
}

interface TransferTimelineProps {
  transfer: TransferRequest;
  onClose: () => void;
  isVisible: boolean;
}

export default function TransferTimeline({
  transfer,
  onClose,
  isVisible,
}: TransferTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  // Generate hardcoded timeline data based on transfer status
  const generateTimelineEvents = (
    transfer: TransferRequest
  ): TimelineEvent[] => {
    const baseEvents: TimelineEvent[] = [
      {
        id: "request",
        title: "Transfer Request Initiated",
        description: `Transfer requested by ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`,
        timestamp: transfer.requestedDate,
        type: "request",
        status: "completed",
        actor: `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`,
        icon: <FileText size={16} className="text-blue-500" />,
        details: `Reason: ${transfer.reason}`,
      },
      {
        id: "review",
        title: "Medical Review",
        description:
          "Medical team reviewing patient eligibility and transfer requirements",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 15 * 60000
        ).toISOString(),
        type: "approval",
        status: transfer.status === "pending" ? "current" : "completed",
        actor: "Dr. Sarah Mitchell",
        icon: <Stethoscope size={16} className="text-green-500" />,
        details: "Reviewing medical records and transport requirements",
      },
    ];

    if (["accepted", "in_progress", "completed"].includes(transfer.status)) {
      baseEvents.push({
        id: "approval",
        title: "Transfer Approved",
        description: "Transfer request approved by medical supervisor",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 45 * 60000
        ).toISOString(),
        type: "approval",
        status: "completed",
        actor: "Dr. Michael Rodriguez",
        icon: <CheckCircle2 size={16} className="text-green-500" />,
        details: "All medical requirements met for safe transport",
      });

      baseEvents.push({
        id: "preparation",
        title: "Transport Preparation",
        description: "Ambulance crew preparing for patient transport",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 2 * 3600000
        ).toISOString(),
        type: "preparation",
        status: transfer.status === "accepted" ? "current" : "completed",
        actor: "EMT Team Alpha",
        icon: <Activity size={16} className="text-orange-500" />,
        details: "Equipment check and route planning completed",
      });
    }

    if (["in_progress", "completed"].includes(transfer.status)) {
      baseEvents.push({
        id: "departure",
        title: "Patient Transport Started",
        description: "Ambulance departed from origin hospital",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 3 * 3600000
        ).toISOString(),
        type: "transport",
        status: "completed",
        actor: "EMT Team Alpha",
        icon: <Ambulance size={16} className="text-blue-500" />,
        details: "Estimated arrival in 45 minutes",
      });

      baseEvents.push({
        id: "transit",
        title: "En Route Update",
        description: "Transport proceeding normally, patient stable",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 3.5 * 3600000
        ).toISOString(),
        type: "transport",
        status: transfer.status === "in_progress" ? "current" : "completed",
        actor: "Paramedic Johnson",
        icon: <Shield size={16} className="text-green-500" />,
        details: "Vital signs stable, ETA 15 minutes",
      });
    }

    if (transfer.status === "completed") {
      baseEvents.push({
        id: "arrival",
        title: "Arrived at Destination",
        description: "Patient successfully transferred to destination hospital",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 4 * 3600000
        ).toISOString(),
        type: "arrival",
        status: "completed",
        actor: "Receiving Team",
        icon: <Hospital size={16} className="text-purple-500" />,
        details: "Patient handed over to destination medical team",
      });

      baseEvents.push({
        id: "completion",
        title: "Transfer Completed",
        description: "Transfer successfully completed and documented",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 4.5 * 3600000
        ).toISOString(),
        type: "completion",
        status: "completed",
        actor: "System",
        icon: <CheckCircle2 size={16} className="text-green-500" />,
        details: "All documentation submitted and verified",
      });
    }

    // Add some notes/communications
    baseEvents.push({
      id: "note1",
      title: "Communication Note",
      description: "Family notified of transfer status",
      timestamp: new Date(
        new Date(transfer.requestedDate).getTime() + 1.5 * 3600000
      ).toISOString(),
      type: "note",
      status: "completed",
      actor: "Nurse Collins",
      icon: <MessageSquare size={16} className="text-indigo-500" />,
      details: "Family members informed via phone call",
    });

    return baseEvents.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const timelineEvents = generateTimelineEvents(transfer);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "current":
        return "bg-blue-500 animate-pulse";
      case "pending":
        return "bg-gray-300";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "current":
        return "text-blue-600";
      case "pending":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getHospitalName = (hospital: string | any) => {
    if (typeof hospital === "string") {
      return hospital;
    }
    return hospital?.name || "Unknown Hospital";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "from-red-500 to-pink-600";
      case "high":
        return "from-orange-500 to-amber-600";
      case "medium":
        return "from-amber-500 to-yellow-600";
      case "low":
        return "from-green-500 to-emerald-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-40 flex"
        >
          {/* Glassmorphism Background Overlay */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              backdropFilter: { duration: 0.6, ease: "easeOut" },
            }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            style={{ zIndex: 39 }}
          />

          {/* Timeline Panel */}
          <div
            className="relative ml-auto w-full max-w-2xl h-full bg-white/95 backdrop-blur-xl shadow-2xl border-l border-white/20 rounded-tl-3xl rounded-bl-3xl overflow-hidden"
            style={{ zIndex: 40 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Activity size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Transfer Timeline
                    </h2>
                    <p className="text-sm text-gray-600">
                      {transfer.patientInfo.firstName}{" "}
                      {transfer.patientInfo.lastName} • {transfer.transferId}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 bg-gray-100/50 hover:bg-gray-200/50 rounded-xl backdrop-blur-sm transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </motion.button>
              </div>

              {/* Transfer Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-2xl backdrop-blur-sm border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getPriorityColor(
                      transfer.priority
                    )} text-white shadow-lg`}
                  >
                    {transfer.priority.toUpperCase()}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>
                      Started {formatTimestamp(transfer.requestedDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-gray-500" />
                    <span className="text-gray-700 font-medium">
                      {getHospitalName(transfer.fromHospital)}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-gray-400" />
                  <div className="flex items-center space-x-2">
                    <Hospital size={14} className="text-gray-500" />
                    <span className="text-gray-700 font-medium">
                      {getHospitalName(transfer.toHospital)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="p-6 overflow-y-auto h-full pb-20">
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200" />

                {/* Timeline Events */}
                <div className="space-y-6">
                  {timelineEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex items-start space-x-4"
                    >
                      {/* Timeline Dot */}
                      <div
                        className={`relative flex-shrink-0 w-12 h-12 rounded-2xl ${getStatusColor(
                          event.status
                        )} flex items-center justify-center shadow-lg`}
                      >
                        {event.icon}
                      </div>

                      {/* Event Content */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/20 hover:shadow-md transition-all cursor-pointer"
                        onClick={() =>
                          setExpandedEvent(
                            expandedEvent === event.id ? null : event.id
                          )
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3
                            className={`font-semibold ${getStatusTextColor(
                              event.status
                            )}`}
                          >
                            {event.title}
                          </h3>
                          <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                          {event.description}
                        </p>

                        {event.actor && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <User size={12} />
                            <span>{event.actor}</span>
                          </div>
                        )}

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {expandedEvent === event.id && event.details && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-3 pt-3 border-t border-gray-200/50 overflow-hidden"
                            >
                              <p className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg backdrop-blur-sm">
                                {event.details}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>

                {/* Timeline End */}
                <div className="relative flex items-center justify-center mt-8">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
