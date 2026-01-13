"use client";

import { motion } from "framer-motion";
import { Plus, Search, Menu } from "lucide-react";
import type { User } from "@/types/auth/user.types";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
  pageTitle?: string;
  showPlusButton?: boolean;
  onPlusClick?: () => void;
  showSearchButton?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onMobileMenuToggle?: () => void;
  hideMobileMenu?: boolean;
}

export default function DashboardHeader({
  user,
  onLogout,
  pageTitle,
  showPlusButton = false,
  onPlusClick,
  showSearchButton = false,
  searchValue = "",
  onSearchChange,
  onMobileMenuToggle,
  hideMobileMenu = false,
}: DashboardHeaderProps) {
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
                  console.log("Button clicked in DashboardHeader!");
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
                {pageTitle ? "" : "Manage your patients today!"}
              </p>
            </div>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* Search Button - Only show when showSearchButton is true */}
            {showSearchButton && (
              <motion.div
                className="relative group hidden lg:block"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all duration-300 shadow-sm group-hover:w-64 group-hover:rounded-2xl group-hover:border-0 overflow-hidden">
                  <Search
                    size={18}
                    className="text-gray-600 transition-opacity duration-300 group-hover:opacity-0"
                  />
                  <input
                    type="text"
                    placeholder="Search transfers..."
                    value={searchValue}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="absolute inset-0 w-full h-full px-4 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-transparent focus:border-transparent border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
              </motion.div>
            )}

            {/* Mobile Search Button */}
            {showSearchButton && (
              <button className="lg:hidden w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
                <Search size={18} className="text-gray-600" />
              </button>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Plus Button - Only show when showPlusButton is true */}
            {showPlusButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPlusClick}
                className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow-sm"
              >
                <Plus size={18} className="text-white" />
              </motion.button>
            )}

            {/* User Profile Section - Responsive */}
            <div className="hidden lg:flex items-center space-x-2 lg:space-x-3 bg-green-50 rounded-full px-2 lg:px-3 py-2 border border-green-200 shadow-sm sidebar-nav-item">
              {/* Profile Picture */}
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center">
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
                <p className="text-xs text-gray-500 capitalize">
                  {user.userType}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
