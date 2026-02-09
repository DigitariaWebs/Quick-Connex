"use client";

import { ReactNode, useState } from "react";
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
  const { user, isLoading, logout } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show loading spinner while fetching user data
  // Middleware handles authentication and admin role verification, so we trust user is authenticated and authorized if page loads
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <p className="mt-6 text-white text-lg font-medium">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
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
