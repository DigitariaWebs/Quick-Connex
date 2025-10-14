"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import TransferForm from "@/components/ui/forms/TransferForm";

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function TransferFormModal({
  isOpen,
  onClose,
  onSuccess,
}: TransferFormModalProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
            >
              {/* Modal Header */}
              <div className="relative px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Create New Transfer Request
                  </h2>
                  <button
                    onClick={onClose}
                    className="sticky top-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <TransferForm onSuccess={handleSuccess} isModal={true} />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
