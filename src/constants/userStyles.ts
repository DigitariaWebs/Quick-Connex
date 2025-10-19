import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Activity,
  Settings,
  Trash2,
  Edit,
  Eye,
  Ban,
  Unlock,
  Key,
  Download,
  Upload,
  MoreHorizontal,
} from "lucide-react";

import type { UserStatusConfig, UserRoleConfig, UserStatCard } from "@/types/user";

// User Status Configuration
export const USER_STATUSES: Record<string, UserStatusConfig> = {
  approved: {
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    icon: Clock,
  },
  suspended: {
    label: "Suspended",
    color: "text-red-600",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
  },
  rejected: {
    label: "Rejected",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    icon: UserX,
  },
};

// User Role Configuration
export const USER_ROLE_CONFIGS: Record<string, UserRoleConfig> = {
  employee: {
    label: "Employee",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    icon: User,
    level: 1,
  },
  manager: {
    label: "Manager",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    icon: UserCheck,
    level: 2,
  },
  admin: {
    label: "Admin",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Shield,
    level: 3,
  },
  super_admin: {
    label: "Super Admin",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Crown,
    level: 4,
  },
};

// User Statistics Card Colors
export const USER_STAT_CARD_COLORS = {
  total: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    textColor: "text-blue-600",
    valueColor: "text-blue-800",
    iconColor: "text-blue-500",
  },
  approved: {
    bg: "bg-green-50",
    border: "border-green-100",
    textColor: "text-green-600",
    valueColor: "text-green-800",
    iconColor: "text-green-500",
  },
  pending: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    textColor: "text-amber-600",
    valueColor: "text-amber-800",
    iconColor: "text-amber-500",
  },
  suspended: {
    bg: "bg-red-50",
    border: "border-red-100",
    textColor: "text-red-600",
    valueColor: "text-red-800",
    iconColor: "text-red-500",
  },
  rejected: {
    bg: "bg-gray-50",
    border: "border-gray-100",
    textColor: "text-gray-600",
    valueColor: "text-gray-800",
    iconColor: "text-gray-500",
  },
  newUsers: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    textColor: "text-purple-600",
    valueColor: "text-purple-800",
    iconColor: "text-purple-500",
  },
};

// Helper functions
export const getUserStatusConfig = (status: string): UserStatusConfig => {
  return USER_STATUSES[status] || USER_STATUSES.pending;
};

export const getUserRoleConfig = (role: string): UserRoleConfig => {
  return USER_ROLE_CONFIGS[role] || USER_ROLE_CONFIGS.employee;
};

export const getUserInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const getUserDisplayName = (user: any): string => {
  return `${user.firstName} ${user.lastName}`;
};

export const getUserRoleLevel = (role: string): number => {
  return getUserRoleConfig(role).level;
};

export const canManageUser = (currentUserRole: string, targetUserRole: string): boolean => {
  const currentLevel = getUserRoleLevel(currentUserRole);
  const targetLevel = getUserRoleLevel(targetUserRole);
  return currentLevel > targetLevel;
};

export const getUserStatusIcon = (status: string) => {
  return getUserStatusConfig(status).icon;
};

export const getUserRoleIcon = (role: string) => {
  return getUserRoleConfig(role).icon;
};
