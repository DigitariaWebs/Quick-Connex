"use client";

import { useState, useEffect } from "react";
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
  Package,
} from "lucide-react";
import { TransferCategory } from '@/constants/transfer';

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
  notes?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    userType: string;
  };
  metadata?: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
    details?: string;
    [key: string]: any;
  };
  isSystemEvent?: boolean;
  isVisible?: boolean;
}

interface TransferTimelineProps {
  transfer: TransferRequest;
  onClose: () => void;
  isVisible: boolean;
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
}

export default function TransferTimeline({
  transfer,
  onClose,
  isVisible,
}: TransferTimelineProps) {
  // Get display information based on transfer type
  const displayInfo = getTransferDisplayInfo(transfer);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline data from API
  useEffect(() => {
    if (isVisible && transfer.transferId) {
      fetchTimelineData();
    }
  }, [isVisible, transfer.transferId]);

  const fetchTimelineData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/transfers/${transfer.transferId}/timeline`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch timeline data");
      }

      const data = await response.json();
      if (data.success) {
        setTimelineEvents(data.data.timeline || []);
      } else {
        throw new Error(data.message || "Failed to fetch timeline data");
      }
    } catch (err) {
      console.error("Error fetching timeline:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch timeline data"
      );
      // Fallback to empty array
      setTimelineEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate hardcoded timeline data based on transfer status (fallback)
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
        actor: {
          id: transfer.requestedBy.email, // Using email as ID since _id is not available
          name: `${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName}`,
          email: transfer.requestedBy.email,
          userType: transfer.requestedBy.userType,
        },
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
        actor: {
          id: "medical-reviewer",
          name: "Dr. Sarah Mitchell",
          email: "sarah.mitchell@hospital.com",
          userType: "medical",
        },
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
        actor: {
          id: "medical-approver",
          name: "Dr. Michael Rodriguez",
          email: "michael.rodriguez@hospital.com",
          userType: "medical",
        },
      });

      baseEvents.push({
        id: "preparation",
        title: "Transport Preparation",
        description: "Ambulance crew preparing for patient transport",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 2 * 3600000
        ).toISOString(),
        type: "preparation",
        actor: {
          id: "emt-team-alpha",
          name: "EMT Team Alpha",
          email: "emt.alpha@hospital.com",
          userType: "transport",
        },
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
        actor: {
          id: "emt-team-alpha",
          name: "EMT Team Alpha",
          email: "emt.alpha@hospital.com",
          userType: "transport",
        },
      });

      baseEvents.push({
        id: "transit",
        title: "En Route Update",
        description: "Transport proceeding normally, patient stable",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 3.5 * 3600000
        ).toISOString(),
        type: "transport",
        actor: {
          id: "paramedic-johnson",
          name: "Paramedic Johnson",
          email: "johnson@hospital.com",
          userType: "medical",
        },
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
        actor: {
          id: "receiving-team",
          name: "Receiving Team",
          email: "receiving@hospital.com",
          userType: "medical",
        },
      });

      baseEvents.push({
        id: "completion",
        title: "Transfer Completed",
        description: "Transfer successfully completed and documented",
        timestamp: new Date(
          new Date(transfer.requestedDate).getTime() + 4.5 * 3600000
        ).toISOString(),
        type: "completion",
        actor: {
          id: "system",
          name: "System",
          email: "system@hospital.com",
          userType: "system",
        },
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
      actor: {
        id: "nurse-collins",
        name: "Nurse Collins",
        email: "collins@hospital.com",
        userType: "nurse",
      },
    });

    return baseEvents.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Get icon for timeline event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case "created":
        return <FileText size={16} className="text-blue-500" />;
      case "approved":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "rejected":
        return <AlertTriangle size={16} className="text-red-500" />;
      case "status_changed":
        return <Activity size={16} className="text-purple-500" />;
      case "assigned":
        return <User size={16} className="text-indigo-500" />;
      case "accepted":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "completed":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "cancelled":
        return <AlertTriangle size={16} className="text-red-500" />;
      case "patient_updated":
        return <Stethoscope size={16} className="text-blue-500" />;
      case "hospital_updated":
        return <Hospital size={16} className="text-orange-500" />;
      case "priority_changed":
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case "document_uploaded":
        return <FileText size={16} className="text-gray-500" />;
      case "notes_updated":
        return <MessageSquare size={16} className="text-indigo-500" />;
      case "communication":
        return <Phone size={16} className="text-blue-500" />;
      case "system":
        return <Activity size={16} className="text-gray-500" />;
      case "scheduled":
      case "rescheduled":
        return <Calendar size={16} className="text-purple-500" />;
      default:
        return <Activity size={16} className="text-gray-500" />;
    }
  };

  // Get status color for timeline event
  const getEventStatusColor = (type: string, isSystemEvent?: boolean) => {
    if (isSystemEvent) {
      return "bg-gray-500";
    }

    switch (type) {
      case "created":
      case "approved":
      case "accepted":
      case "completed":
        return "bg-green-500";
      case "rejected":
      case "cancelled":
        return "bg-red-500";
      case "status_changed":
        return "bg-blue-500";
      case "assigned":
        return "bg-indigo-500";
      case "priority_changed":
        return "bg-yellow-500";
      case "communication":
        return "bg-blue-500";
      case "system":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  // Use real timeline events or fallback to generated ones
  const displayEvents =
    timelineEvents.length > 0
      ? timelineEvents
      : generateTimelineEvents(transfer);

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
                      {displayInfo.title} • {transfer.transferId}
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
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">
                    Loading timeline...
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle size={20} className="text-red-500 mr-2" />
                    <span className="text-red-700">
                      Error loading timeline: {error}
                    </span>
                  </div>
                </div>
              )}

              {!loading && !error && (
                <div className="relative">
                  {displayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Activity size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Timeline Events
                      </h3>
                      <p className="text-gray-600 text-center max-w-md">
                        This transfer doesn't have any timeline events yet.
                        Timeline events are automatically created when transfers
                        are created, approved, or updated.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200" />

                      {/* Timeline Events */}
                      <div className="space-y-6">
                        {displayEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative flex items-start space-x-4"
                          >
                            {/* Timeline Dot */}
                            <div
                              className={`relative flex-shrink-0 w-12 h-12 rounded-2xl ${getEventStatusColor(
                                event.type,
                                event.isSystemEvent
                              )} flex items-center justify-center shadow-lg`}
                            >
                              {getEventIcon(event.type)}
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
                                <h3 className="font-semibold text-gray-900">
                                  {event.title}
                                </h3>
                                <span className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                                  {formatTimestamp(event.timestamp)}
                                </span>
                              </div>

                              <p className="text-sm text-gray-600 mb-2">
                                {event.description}
                              </p>

                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <User size={12} />
                                <span>{event.actor.name}</span>
                                {event.actor.userType && (
                                  <span className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                                    {event.actor.userType}
                                  </span>
                                )}
                              </div>

                              {/* Expanded Details */}
                              <AnimatePresence>
                                {expandedEvent === event.id &&
                                  (event.metadata?.details ||
                                    event.metadata?.reason) && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="mt-3 pt-3 border-t border-gray-200/50 overflow-hidden"
                                    >
                                      <div className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-lg backdrop-blur-sm">
                                        {event.metadata?.details && (
                                          <p className="mb-1">
                                            {event.metadata.details}
                                          </p>
                                        )}
                                        {event.metadata?.reason && (
                                          <p className="text-gray-500">
                                            Reason: {event.metadata.reason}
                                          </p>
                                        )}
                                        {event.metadata?.oldValue &&
                                          event.metadata?.newValue && (
                                            <p className="text-gray-500 mt-1">
                                              Changed from "
                                              {event.metadata.oldValue}" to "
                                              {event.metadata.newValue}"
                                            </p>
                                          )}
                                      </div>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
