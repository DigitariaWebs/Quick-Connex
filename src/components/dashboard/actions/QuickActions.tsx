"use client";

import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  Hospital,
  Users,
  Calendar,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: number;
}

interface QuickActionsProps {
  userType: "employee" | "manager" | "admin" | "super_admin";
  onNewTransfer?: () => void;
  onViewPending?: () => void;
  onViewSchedule?: () => void;
  onGenerateReport?: () => void;
  onViewUrgent?: () => void;
  onViewAccepted?: () => void;
  onSearchTransfers?: () => void;
  pendingCount?: number;
  urgentCount?: number;
  acceptedCount?: number;
  scheduledToday?: number;
  loading?: boolean;
  error?: string | null;
}

export default function QuickActions({
  userType,
  onNewTransfer,
  onViewPending,
  onViewSchedule,
  onGenerateReport,
  onViewUrgent,
  onViewAccepted,
  onSearchTransfers,
  pendingCount = 0,
  urgentCount = 0,
  acceptedCount = 0,
  scheduledToday = 0,
  loading = false,
  error = null,
}: QuickActionsProps) {
  const t = useTranslations("dashboardWidgets.quickActions");
  const tTransfers = useTranslations("transfers");

  const employeeActions: QuickAction[] = [
    {
      id: "view-accepted",
      title: t("viewAccepted"),
      description: tTransfers("viewAccepted"),
      icon: <CheckCircle size={20} className="text-blue-600" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
      onClick: onViewAccepted || (() => {}),
      badge: acceptedCount,
    },
    {
      id: "view-schedule",
      title: t("viewSchedule"),
      description: tTransfers("viewSchedule"),
      icon: <Calendar size={20} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
      onClick: onViewSchedule || (() => {}),
      badge: scheduledToday,
    },
    {
      id: "search-transfers",
      title: t("searchTransfers"),
      description: tTransfers("searchTransfers"),
      icon: <Search size={20} className="text-purple-600" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
      onClick: onSearchTransfers || (() => {}),
    },
  ];

  const managerActions: QuickAction[] = [
    {
      id: "new-transfer",
      title: t("newTransfer"),
      description: tTransfers("createTransfer"),
      icon: <Plus size={20} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
      onClick: onNewTransfer || (() => {}),
    },
    {
      id: "view-pending",
      title: t("viewPending"),
      description: tTransfers("viewPending"),
      icon: <CheckCircle size={20} className="text-green-600" />,
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
      onClick: onViewPending || (() => {}),
      badge: pendingCount,
    },
  ];

  const actions = userType === "manager" ? managerActions : employeeActions;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">{t("title")}</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-200 animate-pulse"
            >
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <p className="text-red-600 text-sm mb-2">{t("failedToLoad")}</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={action.onClick}
              className={`relative p-4 rounded-lg border border-gray-200 text-left transition-all duration-200 ${action.bgColor}`}
            >
              {action.badge !== undefined && action.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                  {action.badge > 99 ? "99+" : action.badge}
                </span>
              )}

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
