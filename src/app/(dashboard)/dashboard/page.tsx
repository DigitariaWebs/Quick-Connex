"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/core/Sidebar";
import DashboardHeader from "@/components/dashboard/core/DashboardHeader";
import TransferOverview from "@/components/dashboard/widgets/TransferOverview";
import UrgentAlerts from "@/components/dashboard/widgets/UrgentAlerts";
import RecentActivity from "@/components/dashboard/widgets/RecentActivity";
import QuickActions from "@/components/dashboard/actions/QuickActions";
import TransferFormModal from "@/components/transfers/modals/TransferFormModal";
import MyAcceptedTransfersModal from "@/components/transfers/modals/MyAcceptedTransfersModal";
import SearchTransfersModal from "@/components/transfers/modals/SearchTransfersModal";
import PendingTransfersModal from "@/components/transfers/modals/PendingTransfersModal";
import TodayScheduleModal from "@/components/transfers/modals/TodayScheduleModal";

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
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    logout,
  } = useSession();
  const {
    stats,
    urgentTransfers,
    recentActivity,
    loading: dataLoading,
    error: dataError,
    refetch,
  } = useDashboardData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMyTransfersModalOpen, setIsMyTransfersModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Redirect to login if not authenticated
  // Add a small delay to prevent race condition where SessionContext hasn't finished initial check yet
  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading) {
      return;
    }

    // Give SessionContext a moment to complete its initial auth check
    // This prevents premature redirects after login
    const checkTimer = setTimeout(() => {
      if (!isAuthenticated) {
        console.log(
          "🔒 Dashboard: User not authenticated, redirecting to login",
          {
            authLoading,
            isAuthenticated,
            hasUser: !!user,
          }
        );
        router.push("/login");
      }
    }, 500); // Small delay to allow SessionContext to finish

    return () => clearTimeout(checkTimer);
  }, [authLoading, isAuthenticated, router, user]);

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
      {/* Sidebar */}
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
          onMobileToggle={setIsMobileMenuOpen}
          isMobileOpen={isMobileMenuOpen}
        />
      )}

      {/* Main Content */}
      <div
        className={`ml-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-28" : "lg:ml-80"
        }`}
      >
        {/* Header */}
        {user && (
          <DashboardHeader
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
            pageTitle="Dashboard"
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                  acceptedCount={stats.totalAccepted}
                  scheduledToday={stats.scheduledToday}
                  onNewTransfer={() => setIsTransferModalOpen(true)}
                  onViewPending={
                    user.userType === "manager"
                      ? () => setIsPendingModalOpen(true)
                      : undefined
                  }
                  onViewUrgent={() => router.push("/transfers?priority=urgent")}
                  onViewAccepted={() => setIsMyTransfersModalOpen(true)}
                  onViewSchedule={() => setIsScheduleModalOpen(true)}
                  onSearchTransfers={() => setIsSearchModalOpen(true)}
                  onGenerateReport={() => router.push("/reports")}
                />
              </div>
            )}
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
          // Scoped refresh: refetch dashboard data without full reload
          refetch();
          setIsTransferModalOpen(false);
        }}
      />

      {/* My Accepted Transfers Modal */}
      {user && (
        <MyAcceptedTransfersModal
          isOpen={isMyTransfersModalOpen}
          onClose={() => setIsMyTransfersModalOpen(false)}
          currentUserId={user._id}
          currentUserType={user.userType}
        />
      )}

      {/* Search Transfers Modal */}
      <SearchTransfersModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectTransfer={(transfer) => {
          // Navigate to transfer details or handle selection
          router.push(`/transfers?selected=${transfer._id}`);
        }}
      />

      {/* Pending Transfers Modal - Only for Managers */}
      {user && user.userType === "manager" && (
        <PendingTransfersModal
          isOpen={isPendingModalOpen}
          onClose={() => setIsPendingModalOpen(false)}
          onSelectTransfer={(transfer) => {
            router.push(`/transfers?selected=${transfer._id}`);
          }}
          currentUserId={user._id}
          currentUserType={user.userType}
        />
      )}

      {/* Today's Schedule Modal */}
      {user && (
        <TodayScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSelectTransfer={(transfer) => {
            router.push(`/transfers?selected=${transfer._id}`);
          }}
          currentUserId={user._id}
          currentUserType={user.userType}
        />
      )}
    </div>
  );
}
