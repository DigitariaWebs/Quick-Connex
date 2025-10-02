"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TransferOverview from "@/components/dashboard/TransferOverview";
import UrgentAlerts from "@/components/dashboard/UrgentAlerts";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickActions from "@/components/dashboard/QuickActions";
import SchedulingNotifications from "@/components/notifications/SchedulingNotifications";
import NotificationPopupManager from "@/components/notifications/NotificationPopupManager";
import SSEDebugger from "@/components/notifications/SSEDebugger";
import TransferFormModal from "@/components/modals/TransferFormModal";

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
  const {
    stats,
    urgentTransfers,
    recentActivity,
    loading: dataLoading,
    error: dataError,
  } = useDashboardData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading spinner only for authentication or initial data load
  if (authLoading || (dataLoading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading
              ? "Verifying authentication..."
              : "Loading dashboard data..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show error state if data loading failed
  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Failed to load dashboard
          </h2>
          <p className="text-gray-600 mb-4">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Popup Manager - DISABLED */}
      {/* <NotificationPopupManager
        maxNotifications={5}
        autoHide={true}
        hideDelay={5000}
        position="top-right"
        enableSound={true}
      /> */}

      {/* SSE Debugger - Remove this after testing */}
      <SSEDebugger />

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

        {/* Background refresh indicator */}
        {dataLoading && user && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-700 text-sm">Updating data...</span>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-6">
          {/* Urgent Alerts - DISABLED */}
          {/* {user && urgentTransfers.length > 0 && (
            <div className="mb-6">
              <UrgentAlerts
                urgentTransfers={urgentTransfers}
                onDismiss={(id) => {
                  // Handle alert dismissal
                  console.log("Dismissed alert:", id);
                }}
                onViewTransfer={(id) => {
                  // Navigate to transfer details
                  router.push(`/transfers/${id}`);
                }}
              />
            </div>
          )} */}

          {/* Top Section: Transfer Overview and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Transfer Overview Stats */}
            {user && (
              <div>
                <TransferOverview
                  userType={user.userType}
                  stats={{
                    totalActive:
                      stats.totalPending +
                      stats.totalAccepted +
                      stats.totalInProgress,
                    completedToday: stats.totalCompleted,
                    pendingAcceptance: stats.totalPending,
                    urgent: stats.totalUrgent,
                    averageProcessingTime: stats.averageProcessingTime,
                    successRate: stats.successRate,
                  }}
                />
              </div>
            )}

            {/* Quick Actions */}
            {user && (
              <div>
                <QuickActions
                  userType={user.userType}
                  pendingCount={stats.totalPending}
                  urgentCount={stats.totalUrgent}
                  scheduledToday={stats.scheduledToday}
                  onNewTransfer={() => setIsTransferModalOpen(true)}
                  onViewPending={() => router.push("/transfers?status=pending")}
                  onViewUrgent={() => router.push("/transfers?priority=urgent")}
                  onViewSchedule={() => router.push("/calendar")}
                  onSearchTransfers={() => router.push("/transfers")}
                  onGenerateReport={() => router.push("/reports")}
                />
              </div>
            )}
          </div>

          {/* Scheduling Notifications */}
          <div className="mb-8">
            <SchedulingNotifications limit={5} showSummary={true} />
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <RecentActivity
              userType={user?.userType || "employee"}
              activities={recentActivity}
            />
          </div>
        </div>
      </div>

      {/* Transfer Form Modal */}
      <TransferFormModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          // Refresh dashboard data when a new transfer is created
          window.location.reload();
          setIsTransferModalOpen(false);
        }}
      />
    </div>
  );
}
