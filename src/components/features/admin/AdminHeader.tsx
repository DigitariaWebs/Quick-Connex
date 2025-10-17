"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface AdminHeaderProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    isSuperAdmin?: boolean;
  };
  onLogout: () => void;
  pageTitle?: string;
  pageDescription?: string;
  showBackButton?: boolean;
}

export default function AdminHeader({
  user,
  pageTitle,
  showBackButton = false,
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
          {/* Left Side - Welcome Message */}
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.back()}
                  className="w-10 h-10 bg-transparent border-2 border-purple-500 rounded-full flex items-center justify-center hover:bg-purple-50 transition-all duration-200"
                >
                  <ArrowLeft size={20} className="text-purple-500" />
                </motion.button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-black">
                  {pageTitle || `Hello ${user.firstName}`}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {pageTitle ? "" : "Manage your system today!"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - User Profile Only (Floating) */}
          <div className="flex items-center space-x-3">
            {/* User Profile Section - Floating with border */}
            <div className="flex items-center space-x-3 bg-purple-50 rounded-full px-3 py-2 border border-purple-200 shadow-sm">
              {/* Profile Picture */}
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
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
                <p className="text-xs text-purple-600 font-medium capitalize">
                  {user.isSuperAdmin ? "Super Admin" : "Admin"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
