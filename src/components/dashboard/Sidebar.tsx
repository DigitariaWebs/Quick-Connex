"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Bell,
  LogOut,
  User,
  ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onToggle?: (isCollapsed: boolean) => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    name: "Transfers",
    href: "/transfers",
    icon: ArrowRightLeft,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    name: "Notification",
    href: "/notifications",
    icon: Bell,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
];

export default function Sidebar({ user, onLogout, onToggle }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Auto-expand on hover, collapse when not hovered
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onToggle) {
      onToggle(false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onToggle) {
      onToggle(true);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container with spacing */}
      <div className="fixed left-4 top-4 bottom-4 z-40 lg:block hidden">
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${
            isHovered ? "w-72" : "w-20"
          } h-full sidebar-container rounded-3xl sidebar-shadow transition-all duration-500 ease-in-out overflow-hidden`}
        >
          {/* Header with User Profile */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-center">
              {isHovered ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    whileHover={{ x: isHovered ? 4 : 0 }}
                    whileTap={{ scale: 0.98 }}
                    title={!isHovered ? item.name : undefined}
                    className={`sidebar-nav-item flex items-center space-x-3 ${
                      isHovered ? "px-4" : "px-2"
                    } py-3 rounded-2xl transition-all duration-200 relative group mb-4 ${
                      isActive
                        ? "active bg-green-50 text-green-700 shadow-sm border border-green-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}
                  >
                    <div
                      className={`${
                        isActive ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      <Icon size={20} />
                    </div>

                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between flex-1"
                      >
                        <span className="font-medium text-sm">{item.name}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            {item.badge}
                          </span>
                        )}
                      </motion.div>
                    )}

                    {!isHovered && item.badge && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {item.badge}
                        </span>
                      </div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
            <div className="space-y-1">
              {/* Profile Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  /* Add profile functionality here */
                }}
                title={!isHovered ? "Profile" : undefined}
                className={`flex items-center space-x-3 ${
                  isHovered ? "px-4" : "px-2"
                } py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all duration-200 w-full`}
              >
                <div className="text-gray-500">
                  <User size={20} />
                </div>
                {isHovered && (
                  <span className="font-medium text-sm">Profile</span>
                )}
              </motion.button>

              {/* Logout */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                title={!isHovered ? "Sign Out" : undefined}
                className={`flex items-center space-x-3 ${
                  isHovered ? "px-4" : "px-2"
                } py-3 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full`}
              >
                <div className="text-red-500">
                  <LogOut size={20} />
                </div>
                {isHovered && (
                  <span className="font-medium text-sm">Sign Out</span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: isMobileOpen ? 0 : -300 }}
        transition={{ duration: 0.3 }}
        className="lg:hidden fixed left-0 top-0 w-72 h-screen sidebar-container z-40 sidebar-shadow"
      >
        {/* Mobile Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
              >
                <div
                  className={`sidebar-nav-item flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 mb-4 ${
                    isActive
                      ? "active bg-green-50 text-green-700 shadow-sm border border-green-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <div
                    className={`${
                      isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="space-y-1">
            <button
              onClick={() => {
                /* Add profile functionality here */
              }}
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-all duration-200 w-full"
            >
              <div className="text-gray-500">
                <User size={20} />
              </div>
              <span className="font-medium text-sm">Profile</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full"
            >
              <div className="text-red-500">
                <LogOut size={20} />
              </div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
