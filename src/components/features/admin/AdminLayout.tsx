"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  showBackButton?: boolean;
}

export default function AdminLayout({
  children,
  pageTitle,
  pageDescription,
  showBackButton = false,
}: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, sessionData } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const isAdmin =
        user?.userType === "admin" || user?.userType === "super_admin";
      if (!isAdmin) {
        console.log(
          "🔒 AdminLayout: User is not admin, redirecting to dashboard"
        );
        router.push("/dashboard");
      } else {
        console.log("✅ AdminLayout: User is admin, allowing access");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(
        "🔒 AdminLayout: User not authenticated, redirecting to login"
      );
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Debug authentication state
  useEffect(() => {
    console.log("🔍 AdminLayout: Auth state debug:", {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      userType: user?.userType,
      hasSessionData: !!sessionData,
    });
  }, [isLoading, isAuthenticated, user, sessionData]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <p className="mt-6 text-white text-lg font-medium">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.userType !== "admin" && user.userType !== "super_admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        user={user}
        onLogout={logout}
        onToggle={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-28" : "lg:ml-80"
        }`}
      >
        {/* Header */}
        <AdminHeader
          user={user}
          onLogout={logout}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          showBackButton={showBackButton}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
