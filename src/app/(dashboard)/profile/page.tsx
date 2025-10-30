"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import Sidebar from "@/components/dashboard/core/Sidebar";
import { User, Phone, Mail, MapPin, Calendar, Award, Bell } from "lucide-react";
import {
  isSupported as swSupported,
  getExistingSubscription,
  subscribePush,
  unregisterSubscriptionWithServer,
  registerSubscriptionWithServer,
} from "@/lib/sw/registrar";

interface UserProfile {
  _id: string;
  userType: "employee" | "manager";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  post?: string;
  ciusss?: string;
  documents?: Array<{
    fileId: string;
    documentType: "cv" | "opiqPermit" | "rcr";
    originalName: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isVerified?: boolean;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/profile", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      } else {
        console.error(
          "Failed to fetch profile data:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Sidebar */}
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
        />
      )}

      {/* Main Content with Sidebar Spacing */}
      <div
        className={`ml-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-28" : "lg:ml-80"
        }`}
      >
        <div className="flex min-h-screen py-8">
          {/* Left Sidebar - Personal Information */}
          {profile && (
            <div className="w-80 bg-white shadow-lg border-r border-gray-200 p-8 rounded-3xl mx-4">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-sm text-gray-600 capitalize">
                  {profile.userType === "manager" ? "Manager" : "Employee"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Role</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {profile.userType === "manager" ? "Manager" : "Employee"}
                    </p>
                  </div>
                </div>

                {profile.userType === "manager" && profile.post && (
                  <div className="flex items-center space-x-3">
                    <Award className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        Position
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {profile.post}
                      </p>
                    </div>
                  </div>
                )}

                {profile.userType === "manager" && profile.ciusss && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        CIUSSS
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {typeof profile.ciusss === "string"
                          ? profile.ciusss
                          : (profile.ciusss as any)?.name || "N/A"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Email</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      Member Since
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(profile.createdAt).toLocaleDateString("en-CA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 p-8">
            {profile ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 mx-4">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome, {profile.firstName}!
                  </h1>
                  <p className="text-gray-600">
                    Here's your profile information
                  </p>
                </div>

                {/* Notifications Settings */}
                <div className="mt-8 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-5 w-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Browser Push Notifications
                    </h2>
                  </div>
                  <NotificationsSettings />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 mx-4">
                <div className="text-center">
                  <p className="text-gray-600">No profile data available.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [hasSub, setHasSub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subs, setSubs] = useState<{ endpoint: string; createdAt: string }[]>(
    []
  );

  useEffect(() => {
    let mounted = true;
    async function init() {
      const ok = swSupported();
      if (!mounted) return;
      setSupported(ok);
      setPermission(
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default"
      );
      if (!ok) return;
      const s = await getExistingSubscription();
      if (!mounted) return;
      setHasSub(!!s && Notification.permission === "granted");
      try {
        const res = await fetch("/api/realtime/subscriptions");
        if (res.ok) {
          const data = await res.json();
          setSubs(
            (data.subscriptions || []).map((x: any) => ({
              endpoint: x.endpoint,
              createdAt: x.createdAt,
            }))
          );
        }
      } catch {}
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const confirm = window.confirm("Enable browser push notifications?");
      if (!confirm) return;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
      if (!key) throw new Error("Missing VAPID public key");
      const sub = await subscribePush(key);
      if (!sub) throw new Error("Subscription failed or denied");
      const ok = await registerSubscriptionWithServer(sub);
      if (!ok) throw new Error("Server registration failed");
      setHasSub(true);
      setPermission("granted");
      await refreshSubs();
    } catch (e: any) {
      setError(e?.message || "Failed to enable");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const s = await getExistingSubscription();
      if (s) await unregisterSubscriptionWithServer(s);
      if (s) await s.unsubscribe();
      setHasSub(false);
      await refreshSubs();
    } catch (e: any) {
      setError(e?.message || "Failed to disable");
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/realtime/subscriptions", { method: "PUT" });
      if (!res.ok) throw new Error("Failed to dispatch test");
      alert("Test notification sent");
    } catch (e: any) {
      setError(e?.message || "Failed to send test");
    } finally {
      setBusy(false);
    }
  }

  async function refreshSubs() {
    try {
      const res = await fetch("/api/realtime/subscriptions");
      if (res.ok) {
        const data = await res.json();
        setSubs(
          (data.subscriptions || []).map((x: any) => ({
            endpoint: x.endpoint,
            createdAt: x.createdAt,
          }))
        );
      }
    } catch {}
  }

  const status = !supported
    ? "Not supported"
    : permission === "denied"
    ? "Permission denied"
    : hasSub
    ? "Enabled"
    : "Available";
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/.test(navigator.userAgent);

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Status</div>
          <div className="font-medium text-gray-900">{status}</div>
        </div>
        <div className="flex items-center gap-2">
          {!supported ? null : hasSub ? (
            <button
              disabled={busy}
              onClick={disable}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded disabled:opacity-50"
            >
              Disable
            </button>
          ) : (
            <button
              disabled={busy || permission === "denied"}
              onClick={enable}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Enable
            </button>
          )}
          <button
            disabled={busy || !hasSub}
            onClick={testPush}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded disabled:opacity-50"
          >
            Test
          </button>
        </div>
      </div>

      {permission === "denied" && (
        <div className="mt-2 text-xs text-red-600">
          Permission denied in browser settings. Enable notifications in site
          settings to proceed.
        </div>
      )}

      {isIOS && (
        <div className="mt-2 text-xs text-gray-600">
          On iOS, add this app to your Home Screen (Share → Add to Home Screen)
          to receive push notifications.
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm font-medium text-gray-900 mb-2">
          Active Subscriptions
        </div>
        {subs.length === 0 ? (
          <div className="text-sm text-gray-500">
            No subscriptions found on server.
          </div>
        ) : (
          <ul className="space-y-1">
            {subs.map((s) => (
              <li key={s.endpoint} className="text-xs text-gray-600 break-all">
                {s.endpoint}
                <span className="ml-2 text-[10px] text-gray-400">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
    </div>
  );
}
