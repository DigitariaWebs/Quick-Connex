"use client";

import { motion } from "framer-motion";
import { Bell, Plus, Search } from "lucide-react";

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

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
  pageTitle?: string;
  showPlusButton?: boolean;
  onPlusClick?: () => void;
  showSearchButton?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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
          {/* Left Side - Welcome Message */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-black">
              {pageTitle || `Hello ${user.firstName}`}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {pageTitle ? "" : "Manage your patients today!"}
            </p>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button - Only show when showSearchButton is true */}
            {showSearchButton && (
              <motion.div
                className="relative group"
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

            {/* Notification Bell */}
            <button className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
              <Bell size={18} className="text-gray-600" />
            </button>

            {/* User Profile Section */}
            <div className="flex items-center space-x-3 bg-green-50 rounded-full px-3 py-2 border border-green-200 shadow-sm sidebar-nav-item">
              {/* Profile Picture */}
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>

              {/* User Info */}
              <div className="text-left">
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
