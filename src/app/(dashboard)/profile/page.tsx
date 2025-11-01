"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import Sidebar from "@/components/dashboard/core/Sidebar";
import { User, Phone, Mail, MapPin, Calendar, Award, Bell } from "lucide-react";

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
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="text-sm text-gray-600">
        Push notification functionality has been removed. This feature is no
        longer available.
      </div>
    </div>
  );
}
