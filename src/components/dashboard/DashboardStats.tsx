"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { Clock, CheckCircle, RotateCw, CheckSquare } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalPending: number;
    totalAccepted: number;
    totalInProgress: number;
    totalCompleted: number;
  };
  onFilterChange: (
    filter: "all" | "pending" | "accepted" | "in_progress" | "completed"
  ) => void;
  currentFilter: "all" | "pending" | "accepted" | "in_progress" | "completed";
}

const StatCard = ({
  title,
  value,
  icon,
  color,
  gradient,
  delay,
  filterKey,
  isActive,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  delay: number;
  filterKey: "all" | "pending" | "accepted" | "in_progress" | "completed";
  isActive: boolean;
  onClick: () => void;
}) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: isActive ? -4 : 0,
          boxShadow: isActive
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          transition: { duration: 0.5, delay },
        },
      }}
      whileHover={
        !isActive
          ? {
              y: -5,
              boxShadow:
                "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }
          : {}
      }
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white cursor-pointer transition-all duration-200 ${
        isActive ? "ring-2 ring-offset-2 ring-indigo-500" : ""
      }`}
    >
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 opacity-${
          isActive ? "20" : "10"
        } ${gradient}`}
      ></div>

      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
          >
            {icon}
          </div>
          <div className="flex flex-col items-end">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.3 }}
              className="text-3xl font-bold text-gray-800"
            >
              {value}
            </motion.span>
            <span className="text-xs text-white uppercase tracking-wider">
              Total
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-700">{title}</h3>
        </div>
      </div>
    </motion.div>
  );
};

export default function DashboardStats({
  stats,
  onFilterChange,
  currentFilter,
}: DashboardStatsProps) {
  const statCards = [
    {
      title: "All Requests",
      value:
        stats.totalPending +
        stats.totalAccepted +
        stats.totalInProgress +
        stats.totalCompleted,
      icon: <CheckSquare size={24} className="text-white" />,
      color: "bg-gray-500",
      gradient: "bg-gradient-to-br from-gray-500 to-gray-600",
      filterKey: "all" as const,
      delay: 0,
    },
    {
      title: "Pending Requests",
      value: stats.totalPending,
      icon: <Clock size={24} className="text-white" />,
      color: "bg-amber-500",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
      filterKey: "pending" as const,
      delay: 0.1,
    },
    {
      title: "Accepted",
      value: stats.totalAccepted,
      icon: <CheckCircle size={24} className="text-white" />,
      color: "bg-emerald-500",
      gradient: "bg-gradient-to-br from-emerald-500 to-green-500",
      filterKey: "accepted" as const,
      delay: 0.2,
    },
    {
      title: "In Progress",
      value: stats.totalInProgress,
      icon: <RotateCw size={24} className="text-white" />,
      color: "bg-blue-500",
      gradient: "bg-gradient-to-br from-blue-500 to-indigo-500",
      filterKey: "in_progress" as const,
      delay: 0.3,
    },
    {
      title: "Completed",
      value: stats.totalCompleted,
      icon: <CheckSquare size={24} className="text-white" />,
      color: "bg-violet-500",
      gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
      filterKey: "completed" as const,
      delay: 0.4,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {statCards.map((card) => (
        <StatCard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          gradient={card.gradient}
          delay={card.delay}
          filterKey={card.filterKey}
          isActive={currentFilter === card.filterKey}
          onClick={() => onFilterChange(card.filterKey)}
        />
      ))}
    </div>
  );
}
