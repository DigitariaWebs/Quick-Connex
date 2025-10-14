"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

type AnimatedStatusIconProps = {
  status: "success" | "error";
  message?: string;
  durationMs?: number;
  onHide?: () => void;
  size?: number;
  className?: string;
  showProgress?: boolean;
};

export default function AnimatedStatusIcon({
  status,
  message,
  durationMs = 2500,
  onHide,
  size = 40,
  className = "",
  showProgress = true,
}: AnimatedStatusIconProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      onHide?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onHide]);

  const isSuccess = status === "success";
  const title = isSuccess ? "Success" : "Error";
  const text =
    message ||
    (isSuccess ? "Action completed successfully." : "Something went wrong.");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className={`pointer-events-auto select-none ${className}`}
          role="status"
          aria-live="polite"
          aria-label={isSuccess ? "Action succeeded" : "Action failed"}
        >
          <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-white/90 backdrop-blur px-4 py-3 shadow-xl">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full ${
                  isSuccess ? "bg-green-500" : "bg-red-500"
                } shadow-md`}
                style={{
                  boxShadow: isSuccess
                    ? "0 8px 18px rgba(16,185,129,0.35)"
                    : "0 8px 18px rgba(239,68,68,0.35)",
                }}
              >
                {isSuccess ? (
                  <CheckCircle2 size={size - 10} className="text-white" />
                ) : (
                  <XCircle size={size - 10} className="text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {title}
                </div>
                <div className="text-sm text-gray-600 leading-relaxed truncate max-w-[280px]">
                  {text}
                </div>
              </div>
            </div>
            {showProgress && (
              <motion.div
                className={`absolute bottom-0 left-0 h-0.5 ${
                  isSuccess ? "bg-green-500" : "bg-red-500"
                }`}
                initial={{ width: "100%" }}
                animate={{ width: 0 }}
                transition={{ duration: durationMs / 1000, ease: "linear" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
