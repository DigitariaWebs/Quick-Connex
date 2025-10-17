"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Radio,
  Database,
  Zap,
  AlertTriangle,
  ArrowRightLeft,
  Users,
  Bell,
  CheckSquare,
  BarChart3,
  FileText,
  Settings,
  Shield,
  HardDrive,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutConfirmationModal from "../../ui/modals/LogoutConfirmationModal";

interface AdminUser {
  _id: string;
  userType: "admin" | "super_admin";
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin?: boolean;
}

interface AdminSidebarProps {
  user: AdminUser;
  onLogout: () => void;
  onToggle?: (isCollapsed: boolean) => void;
}

interface NavigationSection {
  section: string;
  items: NavigationItem[];
  superAdminOnly?: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  color: string;
  bgColor: string;
  superAdminOnly?: boolean;
}

const navigation: NavigationSection[] = [
  {
    section: "Dashboard",
    items: [
      {
        name: "Overview",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
    ],
  },
  {
    section: "Monitoring",
    items: [
      {
        name: "SSE Connections",
        href: "/admin/monitoring/sse",
        icon: Radio,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        name: "Database",
        href: "/admin/monitoring/database",
        icon: Database,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
      },
      {
        name: "API Performance",
        href: "/admin/monitoring/api",
        icon: Zap,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      },
      {
        name: "Error Logs",
        href: "/admin/monitoring/errors",
        icon: AlertTriangle,
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
    ],
    superAdminOnly: true,
  },
  {
    section: "Management",
    items: [
      {
        name: "Transfers",
        href: "/admin/transfers",
        icon: ArrowRightLeft,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      },
      {
        name: "Users",
        href: "/admin/users",
        icon: Users,
        color: "text-pink-600",
        bgColor: "bg-pink-50",
      },
      {
        name: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        name: "Approval Queue",
        href: "/admin/users/approval-queue",
        icon: CheckSquare,
        color: "text-teal-600",
        bgColor: "bg-teal-50",
      },
    ],
  },
  {
    section: "Analytics",
    items: [
      {
        name: "System Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        color: "text-violet-600",
        bgColor: "bg-violet-50",
      },
      {
        name: "Reports",
        href: "/admin/analytics",
        icon: FileText,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50",
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        name: "Settings",
        href: "/admin/system/settings",
        icon: Settings,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
      },
      {
        name: "Audit Logs",
        href: "/admin/audit-logs",
        icon: Shield,
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      {
        name: "Backups",
        href: "/admin/system/backups",
        icon: HardDrive,
        color: "text-slate-600",
        bgColor: "bg-slate-50",
        superAdminOnly: true,
      },
    ],
    superAdminOnly: true,
  },
];

export default function AdminSidebar({
  user,
  onLogout,
  onToggle,
}: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();

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

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    onLogout();
  };

  // Filter out super admin only items and sections if user is not super admin
  const filteredNavigation = navigation
    .filter((section) => !section.superAdminOnly || user.isSuperAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.superAdminOnly || user.isSuperAdmin
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Sidebar Container */}
      <div className="fixed left-4 top-4 bottom-4 z-40 lg:block hidden">
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`${
            isHovered ? "w-72" : "w-20"
          } h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 rounded-3xl shadow-2xl transition-all duration-500 ease-in-out overflow-hidden`}
        >
          {/* Header with User Profile */}
          <div className="p-6 border-b border-purple-700/50">
            <div className="flex items-center justify-center">
              {isHovered ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-purple-300">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white whitespace-nowrap truncate">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-purple-200 text-xs whitespace-nowrap truncate">
                      {user.isSuperAdmin ? "🛡️ Super Admin" : "👑 Admin"}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-purple-300">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav
            className="p-4 overflow-y-auto"
            style={{ maxHeight: "calc(100% - 180px)" }}
          >
            {filteredNavigation.map((section) => (
              <div key={section.section} className="mb-6">
                {/* Section Header - Always Visible */}
                {isHovered && (
                  <div className="w-full flex items-center justify-between px-3 py-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
                    <span>{section.section}</span>
                  </div>
                )}

                {/* Section Items - Always Visible */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                      <Link key={item.name} href={item.href}>
                        <motion.div
                          whileHover={{
                            x: isHovered ? 4 : 0,
                            scale: isHovered ? 1.02 : 1,
                          }}
                          whileTap={{ scale: 0.98 }}
                          title={!isHovered ? item.name : undefined}
                          className={`flex items-center space-x-3 ${
                            isHovered ? "px-4" : "px-2"
                          } py-3 rounded-2xl transition-all duration-200 relative group mb-1 ${
                            isActive
                              ? "bg-white/20 text-white shadow-lg border border-white/30 backdrop-blur-sm"
                              : "text-purple-100 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div
                            className={
                              isActive ? "text-white" : "text-purple-200"
                            }
                          >
                            <Icon size={20} />
                          </div>

                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between flex-1 min-w-0"
                            >
                              <span className="font-medium text-sm whitespace-nowrap truncate">
                                {item.name}
                              </span>
                            </motion.div>
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-700/50 bg-purple-900/50 backdrop-blur-sm rounded-b-3xl">
            <motion.button
              whileHover={{ x: isHovered ? 4 : 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogoutClick}
              title={!isHovered ? "Sign Out" : undefined}
              className={`flex items-center space-x-3 ${
                isHovered ? "px-4" : "px-2"
              } py-3 rounded-2xl text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 w-full border border-red-500/30`}
            >
              <div className="text-red-300">
                <LogOut size={20} />
              </div>
              {isHovered && (
                <span className="font-medium text-sm whitespace-nowrap truncate">
                  Sign Out
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
