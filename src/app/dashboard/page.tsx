"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TransferOverview from "@/components/dashboard/TransferOverview";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import SchedulingNotifications from "@/components/notifications/SchedulingNotifications";

interface DashboardStats {
  totalPending: number;
  totalAccepted: number;
  totalInProgress: number;
  totalCompleted: number;
}

interface User {
  _id: string;
  userType: "employee" | "manager";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  post?: string;
  class?: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    totalAccepted: 0,
    totalInProgress: 0,
    totalCompleted: 0,
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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

  // Don't render dashboard if not authenticated
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
        {/* New Header */}
        {user && (
          <DashboardHeader
            user={user}
            onLogout={logout}
            pageTitle="Dashboard"
          />
        )}

        <div className="p-4 lg:p-6">
          {/* Urgent Alerts */}
          {user && (
            <div className="mb-6">
              <UrgentAlerts
                urgentTransfers={[
                  {
                    id: "1",
                    transferId: "TRF-STAT-001",
                    patientName: "John Doe",
                    fromHospital: "Toronto General Hospital",
                    toHospital: "Sick Kids Hospital",
                    priority: "stat",
                    requestedTime: "2024-01-15 14:30",
                    reason: "Cardiac emergency - immediate transfer required",
                    timeElapsed: "15 min",
                  },
                ]}
              />
            </div>
          )}

          {/* Transfer Overview Stats */}
          {user && (
            <div className="mb-8">
              <TransferOverview
                userType={user.userType}
                stats={{
                  totalActive:
                    stats.totalPending +
                    stats.totalAccepted +
                    stats.totalInProgress,
                  completedToday: stats.totalCompleted,
                  pendingAcceptance: stats.totalPending,
                  urgent: 3,
                  averageProcessingTime: "2.5h",
                  successRate: 94,
                }}
              />
            </div>
          )}

          {/* Scheduling Notifications */}
          <div className="mb-8">
            <SchedulingNotifications
              limit={5}
              showSummary={true}
              autoRefresh={true}
              refreshInterval={30000}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Quick Actions */}
            {user && (
              <QuickActions
                userType={user.userType}
                pendingCount={stats.totalPending}
                urgentCount={3}
                scheduledToday={5}
              />
            )}

            {/* Recent Activity */}
            <RecentActivity
              userType={user?.userType || "employee"}
              activities={[
                {
                  id: "1",
                  type: "transfer_accepted",
                  transferId: "TRF-001",
                  patientName: "Jane Smith",
                  description:
                    "Transfer accepted and assigned to transport team",
                  timestamp: "2 hours ago",
                  priority: "high",
                  fromHospital: "Mount Sinai Hospital",
                  toHospital: "Princess Margaret Hospital",
                  user: "Dr. Wilson",
                },
                {
                  id: "2",
                  type: "transfer_completed",
                  transferId: "TRF-002",
                  patientName: "Robert Johnson",
                  description: "Transfer completed successfully",
                  timestamp: "4 hours ago",
                  priority: "medium",
                  fromHospital: "St. Michael's Hospital",
                  toHospital: "Toronto Western Hospital",
                  user: "Nurse Kelly",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
