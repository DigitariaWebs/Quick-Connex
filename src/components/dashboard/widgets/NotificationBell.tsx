"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { Bell } from "lucide-react";
import {
  isSupported,
  getExistingSubscription,
  subscribePush,
  registerSubscriptionWithServer,
  unsubscribePush,
} from "@/lib/sw/registrar";

interface NotificationBellProps {
  showToasts?: boolean;
  showPanel?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export default function NotificationBell({
  showToasts = false,
  showPanel = false,
  position = "top-right",
}: NotificationBellProps) {
  const { user } = useSession();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = 0;

  if (!user) {
    return null;
  }

  useEffect(() => {
    let mounted = true;
    async function check() {
      const supported = isSupported();
      if (!mounted) return;
      setPushSupported(supported);
      if (!supported) return;
      const sub = await getExistingSubscription();
      if (!mounted) return;
      setPushEnabled(!!sub && Notification.permission === "granted");
    }
    check();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const ok = window.confirm("Enable browser push notifications?");
      if (!ok) return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
      if (!vapidKey) throw new Error("Missing VAPID public key");
      const sub = await subscribePush(vapidKey);
      if (!sub) throw new Error("Subscription failed or denied");
      const registered = await registerSubscriptionWithServer(sub);
      if (!registered) throw new Error("Failed to register subscription");
      setPushEnabled(true);
    } catch (e: any) {
      setError(e?.message || "Failed to enable push");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await unsubscribePush();
      setPushEnabled(false);
    } catch (e: any) {
      setError(e?.message || "Failed to disable push");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <button
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title={`Notifications`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Quick Push Toggle */}
        {showNotificationPanel && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            {!pushSupported ? (
              <div className="text-sm text-gray-600">
                Push not supported on this device.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-800 font-medium">
                    Browser Push
                  </div>
                  {!pushEnabled ? (
                    <button
                      disabled={busy}
                      onClick={handleEnable}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                      Enable
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={handleDisable}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded disabled:opacity-50"
                    >
                      Disable
                    </button>
                  )}
                </div>
                {error && <div className="text-xs text-red-600">{error}</div>}
                <div className="text-xs text-gray-500">
                  Manage advanced settings in your profile.
                </div>
                <a href="/profile" className="text-xs text-blue-600 underline">
                  Open Settings
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
