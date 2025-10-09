"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessNotificationProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function SuccessNotification({
  isVisible,
  message,
  onClose,
  duration = 3000,
}: SuccessNotificationProps) {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);

    if (isVisible) {
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-green-200 p-6 min-w-[300px] max-w-[400px]">
            <div className="flex items-center space-x-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 15,
                  delay: 0.1,
                }}
                className="flex-shrink-0"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </motion.div>

              <div className="flex-1">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-semibold text-gray-900"
                >
                  Success!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-gray-600 mt-1"
                >
                  {message}
                </motion.p>
              </div>
            </div>

            {/* Animated progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: duration / 1000, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-green-500 rounded-b-2xl"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
