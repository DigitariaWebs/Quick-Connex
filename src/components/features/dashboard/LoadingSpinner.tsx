"use client";

import { motion } from "framer-motion";

export default function LoadingSpinner() {
  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        repeat: Infinity,
        duration: 1,
        ease: "linear" as const,
      },
    },
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.6, 0.8, 0.6],
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <div className="flex items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center space-y-6"
      >
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            variants={pulseVariants}
            animate="animate"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur-sm"
          />

          {/* Inner spinner */}
          <motion.div
            variants={spinnerVariants}
            animate="animate"
            className="w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500"
          />

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-gray-700 font-medium mb-1">Loading transfers</p>
          <p className="text-gray-500 text-sm">
            Please wait while we fetch the latest data
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
