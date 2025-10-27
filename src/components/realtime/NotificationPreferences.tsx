"use client";

/**
 * Notification Preferences Component
 *
 * Allows users to configure their notification preferences including
 * channels, types, and quiet hours.
 */

import { useState, useEffect } from "react";
import { useNotificationPreferences } from "@/hooks/realtime";
import {
  NotificationPreferences,
  NotificationType,
} from "@/lib/realtime/core/types";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "@/lib/realtime/core/constants";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Save,
  Settings,
} from "lucide-react";

interface NotificationPreferencesProps {
  onClose?: () => void;
}

export default function NotificationPreferencesComponent({
  onClose,
}: NotificationPreferencesProps) {
  const { preferences, isLoading, error, savePreferences } =
    useNotificationPreferences();

  const [localPreferences, setLocalPreferences] =
    useState<NotificationPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize local preferences
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
    }
  }, [preferences]);

  // Handle channel toggle
  const handleChannelToggle = (
    channel: keyof NotificationPreferences["channels"]
  ) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      channels: {
        ...localPreferences.channels,
        [channel]: !localPreferences.channels[channel],
      },
    });
  };

  // Handle notification type toggle
  const handleTypeToggle = (type: NotificationType) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      types: {
        ...localPreferences.types,
        [type]: !localPreferences.types[type],
      },
    });
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = () => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      quietHours: {
        enabled: !localPreferences.quietHours?.enabled,
        start: localPreferences.quietHours?.start || "22:00",
        end: localPreferences.quietHours?.end || "08:00",
      },
    });
  };

  // Handle quiet hours time change
  const handleQuietHoursTimeChange = (
    field: "start" | "end",
    value: string
  ) => {
    if (!localPreferences) return;

    setLocalPreferences({
      ...localPreferences,
      quietHours: {
        enabled: localPreferences.quietHours?.enabled || false,
        start: localPreferences.quietHours?.start || "22:00",
        end: localPreferences.quietHours?.end || "08:00",
        [field]: value,
      },
    });
  };

  // Save preferences
  const handleSave = async () => {
    if (!localPreferences) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      await savePreferences(localPreferences);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to save preferences"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Get notification type label
  const getTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case NOTIFICATION_TYPES.TRANSFER_CREATED:
        return "New Transfers";
      case NOTIFICATION_TYPES.TRANSFER_UPDATED:
        return "Transfer Updates";
      case NOTIFICATION_TYPES.TRANSFER_ASSIGNED:
        return "Transfer Assignments";
      case NOTIFICATION_TYPES.TRANSFER_COMPLETED:
        return "Transfer Completions";
      case NOTIFICATION_TYPES.TRANSFER_CANCELLED:
        return "Transfer Cancellations";
      case NOTIFICATION_TYPES.TRANSFER_URGENT:
        return "Urgent Transfers";
      case NOTIFICATION_TYPES.USER_APPROVED:
        return "User Approvals";
      case NOTIFICATION_TYPES.USER_REJECTED:
        return "User Rejections";
      case NOTIFICATION_TYPES.USER_SUSPENDED:
        return "User Suspensions";
      case NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT:
        return "System Announcements";
      case NOTIFICATION_TYPES.SYSTEM_MAINTENANCE:
        return "System Maintenance";
      case NOTIFICATION_TYPES.SYSTEM_ALERT:
        return "System Alerts";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error loading preferences: {error}</p>
      </div>
    );
  }

  if (!localPreferences) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>No preferences available</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Notification Preferences
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Channels Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Delivery Channels
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(localPreferences.channels).map(
            ([channel, enabled]) => (
              <div
                key={channel}
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <button
                  onClick={() =>
                    handleChannelToggle(
                      channel as keyof NotificationPreferences["channels"]
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                <div className="flex items-center space-x-2">
                  {channel === "realtime" && (
                    <Bell className="h-4 w-4 text-gray-600" />
                  )}
                  {channel === "email" && (
                    <Mail className="h-4 w-4 text-gray-600" />
                  )}
                  {channel === "sms" && (
                    <MessageSquare className="h-4 w-4 text-gray-600" />
                  )}
                  {channel === "push" && (
                    <Smartphone className="h-4 w-4 text-gray-600" />
                  )}

                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {channel === "realtime" ? "In-App" : channel}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Notification Types Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notification Types
        </h3>
        <div className="space-y-3">
          {Object.entries(localPreferences.types).map(([type, enabled]) => (
            <div
              key={type}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleTypeToggle(type as NotificationType)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                <span className="text-sm font-medium text-gray-900">
                  {getTypeLabel(type as NotificationType)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
          <button
            onClick={handleQuietHoursToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localPreferences.quietHours?.enabled
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localPreferences.quietHours?.enabled
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {localPreferences.quietHours?.enabled && (
          <div className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <Clock className="h-4 w-4 text-gray-600" />

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">From:</label>
              <input
                type="time"
                value={localPreferences.quietHours?.start}
                onChange={(e) =>
                  handleQuietHoursTimeChange("start", e.target.value)
                }
                className="text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">To:</label>
              <input
                type="time"
                value={localPreferences.quietHours?.end}
                onChange={(e) =>
                  handleQuietHoursTimeChange("end", e.target.value)
                }
                className="text-sm border border-gray-300 rounded px-2 py-1"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          During quiet hours, only urgent notifications will be delivered.
        </p>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
