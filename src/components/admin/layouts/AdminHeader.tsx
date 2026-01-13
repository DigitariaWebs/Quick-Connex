"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import type { User } from "@/types/auth/user.types";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

interface AdminHeaderProps {
  user: User;
  onLogout: () => void;
  pageTitle?: string;
  pageDescription?: string;
  showBackButton?: boolean;
  onMobileMenuToggle?: () => void;
  hideMobileMenu?: boolean;
}

export default function AdminHeader({
  user,
  pageTitle,
  showBackButton = false,
  onMobileMenuToggle,
  hideMobileMenu = false,
}: AdminHeaderProps) {
  const router = useRouter();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="px-4 py-4">
        {/* Top Navigation Bar - Mobile App Style */}
        <div className="flex items-center justify-between">
          {/* Left Side - Mobile Menu + Welcome Message */}
          <div className="flex items-center space-x-3 flex-1">
            {/* Mobile Menu Button */}
            {!hideMobileMenu && (
              <button
                onClick={() => {
                  console.log("Admin hamburger button clicked!");
                  onMobileMenuToggle?.();
                }}
                className="lg:hidden w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm relative z-[9999] touch-manipulation cursor-pointer"
                aria-label="Open mobile menu"
              >
                <Menu size={18} className="text-gray-600" />
              </button>
            )}

            {/* Welcome Message */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-black truncate">
                {pageTitle || `Hello ${user.firstName}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1 hidden lg:block">
                {pageTitle ? "" : "Manage your system today!"}
              </p>
            </div>
          </div>

          {/* Right Side - Language Switcher & User Profile */}
          <div className="hidden lg:flex items-center space-x-2 lg:space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* User Profile Section - Responsive */}
            <div className="flex items-center space-x-2 lg:space-x-3 bg-purple-50 rounded-full px-2 lg:px-3 py-2 border border-purple-200 shadow-sm">
              {/* Profile Picture */}
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>

              {/* User Info - Hidden on mobile, shown on desktop */}
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium text-black">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-purple-600 font-medium capitalize">
                  {user.userType === "super_admin" ? "Super Admin" : "Admin"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
