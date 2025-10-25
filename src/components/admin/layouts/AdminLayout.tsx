"use client";

import { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
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
  const { user, isLoading, isAuthenticated, logout } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle authentication and authorization checks
  useEffect(() => {
    // Only proceed if we're not loading
    if (isLoading) return;

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        console.log(
          "🔒 AdminLayout: User not authenticated, redirecting to login"
        );
        router.push("/login");
        return;
      }

      // If authenticated but no user data yet, wait
      if (!user) {
        console.log("⏳ AdminLayout: Waiting for user data...");
        return;
      }

      // Check if user is admin
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
    }, 100); // Small delay to prevent race conditions

    return () => clearTimeout(timeoutId);
  }, [isLoading, isAuthenticated, user, router]);

  // Debug authentication state
  useEffect(() => {
    console.log("🔍 AdminLayout: Auth state debug:", {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      userType: user?.userType,
    });
  }, [isLoading, isAuthenticated, user]);

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
        user={{
          ...user,
          phone: user.phone || "",
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
          status: user.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
        }}
        onLogout={logout}
        onToggle={setSidebarCollapsed}
        onMobileToggle={setIsMobileMenuOpen}
        isMobileOpen={isMobileMenuOpen}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-28" : "lg:ml-80"
        }`}
      >
        {/* Header */}
        <AdminHeader
          user={{
            ...user,
            phone: user.phone || "",
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
            status: user.status as
              | "pending"
              | "approved"
              | "rejected"
              | "suspended",
          }}
          onLogout={logout}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          showBackButton={showBackButton}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
