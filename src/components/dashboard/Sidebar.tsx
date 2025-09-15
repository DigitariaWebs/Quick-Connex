"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  User,
  Activity,
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
    name: "Schedule",
    href: "/schedule",
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onToggle) {
      onToggle(newCollapsedState);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
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

      {/* Sidebar */}
      <motion.div
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={`${
          isCollapsed ? "w-20" : "w-72"
        } text-white h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out shadow-2xl ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background:
            "linear-gradient(-45deg, #10b981, #059669, #047857, #065f46)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 15s ease infinite",
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-green-500/30">
          <div className="flex items-center justify-between">
            {!isCollapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-bold text-lg">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-green-200 text-sm">{user.email}</p>
                </div>
              </motion.div>
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white font-bold text-lg">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: isCollapsed ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 relative group ${
                    isActive
                      ? "bg-white/20 text-white shadow-lg"
                      : "text-green-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div>
                    <Icon size={20} />
                  </div>

                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between flex-1"
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}

                  {isCollapsed && item.badge && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">{item.badge}</span>
                    </div>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-green-500/30">
          <div className="space-y-2">
            {/* Theme Toggle */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={toggleTheme}
              title={
                isCollapsed
                  ? isDarkMode
                    ? "Light Mode"
                    : "Dark Mode"
                  : undefined
              }
              className="flex items-center space-x-3 px-3 py-3 rounded-xl text-green-100 hover:bg-white/10 hover:text-white transition-all duration-200 w-full"
            >
              <div>{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</div>
              {!isCollapsed && (
                <span className="font-medium">
                  {isDarkMode ? "Light" : "Dark"} Mode
                </span>
              )}
            </motion.button>

            {/* Logout */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              title={isCollapsed ? "Sign Out" : undefined}
              className="flex items-center space-x-3 px-3 py-3 rounded-xl text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200 w-full"
            >
              <div>
                <LogOut size={20} />
              </div>
              {!isCollapsed && <span className="font-medium">Sign Out</span>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
