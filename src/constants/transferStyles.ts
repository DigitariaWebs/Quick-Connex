/**
 * Transfer Styling Configuration
 * 
 * Centralized styling for transfer categories, statuses, and priorities.
 * Ensures consistent visual representation across the entire system.
 */

import {
  User,
  Package,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Flag,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Transfer Category Types
export type TransferCategoryType = "patient" | "envelope" | "medical_instruments";
export type TransferStatusType = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
export type TransferPriorityType = "low" | "medium" | "high" | "urgent";

// Transfer Category Configuration
export interface TransferCategoryConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
}

export const TRANSFER_CATEGORIES: Record<TransferCategoryType, TransferCategoryConfig> = {
  patient: {
    icon: User,
    label: "Patient",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  envelope: {
    icon: Package,
    label: "Envelope",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  medical_instruments: {
    icon: Stethoscope,
    label: "Medical Instruments",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
} as const;

// Transfer Status Configuration
export interface TransferStatusConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  badgeClass: string;
}

export const TRANSFER_STATUSES: Record<TransferStatusType, TransferStatusConfig> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  accepted: {
    icon: CheckCircle2,
    label: "Accepted",
    color: "text-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    badgeClass: "bg-green-100 text-green-800",
  },
  in_progress: {
    icon: RefreshCw,
    label: "In Progress",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-800",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  cancelled: {
    icon: XCircle,
    label: "Cancelled",
    color: "text-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
    badgeClass: "bg-red-100 text-red-800",
  },
} as const;

// Transfer Priority Configuration
export interface TransferPriorityConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
  badgeClass: string;
}

export const TRANSFER_PRIORITIES: Record<TransferPriorityType, TransferPriorityConfig> = {
  low: {
    icon: Flag,
    label: "Low",
    color: "text-green-500",
    bgColor: "bg-green-50",
    dotColor: "bg-green-500",
    badgeClass: "bg-green-100 text-green-800",
  },
  medium: {
    icon: Flag,
    label: "Medium",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  high: {
    icon: Flag,
    label: "High",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    dotColor: "bg-orange-500",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  urgent: {
    icon: AlertTriangle,
    label: "Urgent",
    color: "text-red-500",
    bgColor: "bg-red-50",
    dotColor: "bg-red-500",
    badgeClass: "bg-red-100 text-red-800",
  },
} as const;

// Helper Functions
export const getTransferCategoryConfig = (category: TransferCategoryType): TransferCategoryConfig => {
  return TRANSFER_CATEGORIES[category];
};

export const getTransferStatusConfig = (status: TransferStatusType): TransferStatusConfig => {
  return TRANSFER_STATUSES[status];
};

export const getTransferPriorityConfig = (priority: TransferPriorityType): TransferPriorityConfig => {
  return TRANSFER_PRIORITIES[priority];
};

// Stat Card Colors (for the overview cards)
export const STAT_CARD_COLORS = {
  total: {
    bg: "bg-[#F5E6D3]",
    border: "border-[#E5D6C3]",
    iconBg: "bg-white/60",
    iconColor: "text-[#8B7355]",
    textColor: "text-[#8B7355]",
    valueColor: "text-[#5C4A3A]",
  },
  pending: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-white/60",
    iconColor: "text-amber-500",
    textColor: "text-amber-600",
    valueColor: "text-amber-800",
  },
  inProgress: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    iconBg: "bg-white/60",
    iconColor: "text-blue-500",
    textColor: "text-blue-600",
    valueColor: "text-blue-800",
  },
  urgent: {
    bg: "bg-red-50",
    border: "border-red-100",
    iconBg: "bg-white/60",
    iconColor: "text-red-500",
    textColor: "text-red-600",
    valueColor: "text-red-800",
  },
  completed: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    iconBg: "bg-white/60",
    iconColor: "text-purple-500",
    textColor: "text-purple-600",
    valueColor: "text-purple-800",
  },
  cancelled: {
    bg: "bg-gray-50",
    border: "border-gray-100",
    iconBg: "bg-white/60",
    iconColor: "text-gray-500",
    textColor: "text-gray-600",
    valueColor: "text-gray-800",
  },
} as const;

