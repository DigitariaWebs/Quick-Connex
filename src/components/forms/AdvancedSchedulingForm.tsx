"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  Plane,
  Truck,
  User,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Save,
  RefreshCw,
} from "lucide-react";

interface SchedulingData {
  isRecurring: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "custom";
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  recurrenceEndDate?: Date;
  recurrenceExceptions?: Date[];
  timeSlot: {
    startTime: string;
    endTime: string;
    duration: number;
  };
  location: {
    pickupLocation: string;
    dropoffLocation: string;
    transportType: "ambulance" | "helicopter" | "ground_transport" | "walking";
  };
  resources: {
    assignedDriver?: string;
    assignedVehicle?: string;
    requiredEquipment?: string[];
    specialInstructions?: string;
  };
}

interface AdvancedSchedulingFormProps {
  initialData?: Partial<SchedulingData>;
  onSave: (data: SchedulingData) => void;
  onCancel: () => void;
  transferId?: string;
  isEditing?: boolean;
}

export default function AdvancedSchedulingForm({
  initialData,
  onSave,
  onCancel,
  transferId,
  isEditing = false,
}: AdvancedSchedulingFormProps) {
  const [formData, setFormData] = useState<SchedulingData>({
    isRecurring: false,
    timeSlot: {
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
    },
    location: {
      pickupLocation: "",
      dropoffLocation: "",
      transportType: "ambulance",
    },
    resources: {
      requiredEquipment: [],
      specialInstructions: "",
    },
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [equipmentInput, setEquipmentInput] = useState("");
  const [exceptionInput, setExceptionInput] = useState("");

  // Check for conflicts when scheduling data changes
  useEffect(() => {
    if (formData.timeSlot.startTime && formData.timeSlot.endTime) {
      checkConflicts();
    }
  }, [formData.timeSlot, formData.resources, transferId]);

  const checkConflicts = async () => {
    if (
      !transferId ||
      !formData.timeSlot.startTime ||
      !formData.timeSlot.endTime
    )
      return;

    setCheckingConflicts(true);
    try {
      const startDateTime = new Date();
      const [startHour, startMinute] = formData.timeSlot.startTime
        .split(":")
        .map(Number);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date();
      const [endHour, endMinute] = formData.timeSlot.endTime
        .split(":")
        .map(Number);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      const params = new URLSearchParams({
        transferId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
      });

      if (formData.resources.assignedDriver) {
        params.append("resourceType", "driver");
        params.append("driverId", formData.resources.assignedDriver);
      }

      if (formData.resources.assignedVehicle) {
        params.append("resourceType", "vehicle");
        params.append("vehicleId", formData.resources.assignedVehicle);
      }

      const response = await fetch(`/api/calendar/conflicts?${params}`);
      const data = await response.json();

      if (data.success) {
        setConflicts(data.data.conflicts);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate time slot
    if (!formData.timeSlot.startTime) {
      newErrors.startTime = "Start time is required";
    }
    if (!formData.timeSlot.endTime) {
      newErrors.endTime = "End time is required";
    }
    if (formData.timeSlot.startTime && formData.timeSlot.endTime) {
      const start = new Date(`2000-01-01T${formData.timeSlot.startTime}`);
      const end = new Date(`2000-01-01T${formData.timeSlot.endTime}`);
      if (end <= start) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    // Validate location
    if (!formData.location.pickupLocation.trim()) {
      newErrors.pickupLocation = "Pickup location is required";
    }
    if (!formData.location.dropoffLocation.trim()) {
      newErrors.dropoffLocation = "Dropoff location is required";
    }

    // Validate recurring settings
    if (formData.isRecurring) {
      if (!formData.recurrencePattern) {
        newErrors.recurrencePattern = "Recurrence pattern is required";
      }
      if (!formData.recurrenceInterval || formData.recurrenceInterval < 1) {
        newErrors.recurrenceInterval = "Recurrence interval must be at least 1";
      }
      if (
        formData.recurrencePattern === "weekly" &&
        (!formData.recurrenceDays || formData.recurrenceDays.length === 0)
      ) {
        newErrors.recurrenceDays =
          "At least one day must be selected for weekly recurrence";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addEquipment = () => {
    if (
      equipmentInput.trim() &&
      !formData.resources.requiredEquipment?.includes(equipmentInput.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        resources: {
          ...prev.resources,
          requiredEquipment: [
            ...(prev.resources.requiredEquipment || []),
            equipmentInput.trim(),
          ],
        },
      }));
      setEquipmentInput("");
    }
  };

  const removeEquipment = (equipment: string) => {
    setFormData((prev) => ({
      ...prev,
      resources: {
        ...prev.resources,
        requiredEquipment:
          prev.resources.requiredEquipment?.filter((e) => e !== equipment) ||
          [],
      },
    }));
  };

  const addException = () => {
    if (exceptionInput) {
      const date = new Date(exceptionInput);
      if (!isNaN(date.getTime())) {
        setFormData((prev) => ({
          ...prev,
          recurrenceExceptions: [...(prev.recurrenceExceptions || []), date],
        }));
        setExceptionInput("");
      }
    }
  };

  const removeException = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      recurrenceExceptions:
        prev.recurrenceExceptions?.filter(
          (d) => d.getTime() !== date.getTime()
        ) || [],
    }));
  };

  const updateTimeSlot = (field: string, value: string) => {
    setFormData((prev) => {
      const newTimeSlot = { ...prev.timeSlot, [field]: value };

      // Calculate duration if both start and end times are set
      if (newTimeSlot.startTime && newTimeSlot.endTime) {
        const start = new Date(`2000-01-01T${newTimeSlot.startTime}`);
        const end = new Date(`2000-01-01T${newTimeSlot.endTime}`);
        newTimeSlot.duration = Math.max(
          0,
          (end.getTime() - start.getTime()) / (1000 * 60)
        );
      }

      return { ...prev, timeSlot: newTimeSlot };
    });
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case "helicopter":
        return <Plane size={20} />;
      case "ground_transport":
        return <Truck size={20} />;
      case "walking":
        return <User size={20} />;
      default:
        return <Car size={20} />;
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? "Edit Transfer Schedule" : "Advanced Scheduling"}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Time Slot */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <Clock size={20} className="mr-2" />
            Time Slot
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.timeSlot.startTime}
                onChange={(e) => updateTimeSlot("startTime", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.startTime ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.startTime && (
                <p className="text-red-600 text-xs mt-1">{errors.startTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.timeSlot.endTime}
                onChange={(e) => updateTimeSlot("endTime", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.endTime ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.endTime && (
                <p className="text-red-600 text-xs mt-1">{errors.endTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.timeSlot.duration}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <MapPin size={20} className="mr-2" />
            Location & Transport
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <input
                type="text"
                value={formData.location.pickupLocation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      pickupLocation: e.target.value,
                    },
                  }))
                }
                placeholder="Enter pickup location"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.pickupLocation ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.pickupLocation && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.pickupLocation}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dropoff Location
              </label>
              <input
                type="text"
                value={formData.location.dropoffLocation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      dropoffLocation: e.target.value,
                    },
                  }))
                }
                placeholder="Enter dropoff location"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.dropoffLocation ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.dropoffLocation && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.dropoffLocation}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transport Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  value: "ambulance",
                  label: "Ambulance",
                  icon: <Car size={20} />,
                },
                {
                  value: "helicopter",
                  label: "Helicopter",
                  icon: <Plane size={20} />,
                },
                {
                  value: "ground_transport",
                  label: "Ground Transport",
                  icon: <Truck size={20} />,
                },
                {
                  value: "walking",
                  label: "Walking",
                  icon: <User size={20} />,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        transportType: option.value as any,
                      },
                    }))
                  }
                  className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${
                    formData.location.transportType === option.value
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
            <User size={20} className="mr-2" />
            Resources & Equipment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Driver
              </label>
              <input
                type="text"
                value={formData.resources.assignedDriver || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    resources: {
                      ...prev.resources,
                      assignedDriver: e.target.value,
                    },
                  }))
                }
                placeholder="Enter driver name or ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Vehicle
              </label>
              <input
                type="text"
                value={formData.resources.assignedVehicle || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    resources: {
                      ...prev.resources,
                      assignedVehicle: e.target.value,
                    },
                  }))
                }
                placeholder="Enter vehicle ID or description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Equipment
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Add equipment"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && addEquipment()}
              />
              <button
                type="button"
                onClick={addEquipment}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {formData.resources.requiredEquipment &&
              formData.resources.requiredEquipment.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.resources.requiredEquipment.map(
                    (equipment, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        <span>{equipment}</span>
                        <button
                          type="button"
                          onClick={() => removeEquipment(equipment)}
                          className="hover:text-purple-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )
                  )}
                </div>
              )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
            </label>
            <textarea
              value={formData.resources.specialInstructions || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  resources: {
                    ...prev.resources,
                    specialInstructions: e.target.value,
                  },
                }))
              }
              placeholder="Enter any special instructions for the transfer"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Recurring Settings */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
            <Repeat size={20} className="mr-2" />
            Recurring Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label
                htmlFor="isRecurring"
                className="text-sm font-medium text-gray-700"
              >
                Make this a recurring transfer
              </label>
            </div>

            <AnimatePresence>
              {formData.isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recurrence Pattern
                      </label>
                      <select
                        value={formData.recurrencePattern || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            recurrencePattern: e.target.value as any,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.recurrencePattern
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select pattern</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom</option>
                      </select>
                      {errors.recurrencePattern && (
                        <p className="text-red-600 text-xs mt-1">
                          {errors.recurrencePattern}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interval
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrenceInterval || 1}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            recurrenceInterval: parseInt(e.target.value) || 1,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.recurrenceInterval
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.recurrenceInterval && (
                        <p className="text-red-600 text-xs mt-1">
                          {errors.recurrenceInterval}
                        </p>
                      )}
                    </div>
                  </div>

                  {formData.recurrencePattern === "weekly" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days of Week
                      </label>
                      <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day, index) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const days = formData.recurrenceDays || [];
                                const newDays = days.includes(index)
                                  ? days.filter((d) => d !== index)
                                  : [...days, index];
                                setFormData((prev) => ({
                                  ...prev,
                                  recurrenceDays: newDays,
                                }));
                              }}
                              className={`p-2 text-sm font-medium rounded-lg border transition-colors ${
                                formData.recurrenceDays?.includes(index)
                                  ? "border-orange-500 bg-orange-50 text-orange-700"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {day}
                            </button>
                          )
                        )}
                      </div>
                      {errors.recurrenceDays && (
                        <p className="text-red-600 text-xs mt-1">
                          {errors.recurrenceDays}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={
                        formData.recurrenceEndDate
                          ? formData.recurrenceEndDate
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrenceEndDate: e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exception Dates
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="date"
                        value={exceptionInput}
                        onChange={(e) => setExceptionInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addException}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {formData.recurrenceExceptions &&
                      formData.recurrenceExceptions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.recurrenceExceptions.map((date, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                            >
                              <span>{date.toLocaleDateString()}</span>
                              <button
                                type="button"
                                onClick={() => removeException(date)}
                                className="hover:text-orange-600"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
              <AlertTriangle size={20} className="mr-2" />
              Scheduling Conflicts Detected
            </h3>

            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getConflictSeverityColor(
                    conflict.severity
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{conflict.description}</p>
                      <p className="text-sm opacity-75">
                        {conflict.transfer.patientName} -{" "}
                        {conflict.transfer.fromHospital} to{" "}
                        {conflict.transfer.toHospital}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        conflict.severity === "high"
                          ? "bg-red-200 text-red-800"
                          : conflict.severity === "medium"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {conflict.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={checkingConflicts || Object.keys(errors).length > 0}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkingConflicts ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditing ? "Update Schedule" : "Save Schedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
