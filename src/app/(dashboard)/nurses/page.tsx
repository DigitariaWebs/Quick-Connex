"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/core/Sidebar";
import DashboardHeader from "@/components/dashboard/core/DashboardHeader";
import { useTranslations } from "next-intl";

export default function NursesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useSession();
  const t = useTranslations("nursesListPage");
  const tCommon = useTranslations("common");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Show loading spinner while fetching user data
  // Middleware handles authentication, so we trust user is authenticated if page loads
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("loading")}</p>
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
            pageTitle={t("title")}
          />
        )}

        <div className="p-4 lg:p-6">
          {/* Placeholder Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {t("managementTitle")}
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                {t("underDevelopment")}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
