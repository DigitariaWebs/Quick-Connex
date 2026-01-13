"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

function ApprovalSuccessContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("approval.success");
  const tCommon = useTranslations("common");
  const [message, setMessage] = useState("");
  const [transferId, setTransferId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const messageParam = searchParams.get("message");
    const transferIdParam = searchParams.get("transferId");

    if (messageParam === "transfer-approved") {
      setMessage(t("approved"));
    } else if (messageParam === "transfer-rejected") {
      setMessage(t("rejected"));
    } else {
      setMessage(t("completed"));
    }

    if (transferIdParam) {
      setTransferId(transferIdParam);
    }

    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        {/* Success Message */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          {message}
        </motion.h1>

        {transferId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-600 mb-6"
          >
            {t("transferId")}{" "}
            <span className="font-mono font-semibold">{transferId}</span>
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <p className="text-gray-600">
            {message.includes(t("approved"))
              ? t("description.approved")
              : t("description.generic")}
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 pt-6 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500">
            {t("automatedNotification")}{" "}
            <span className="font-semibold">Quick Connex</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ApprovalSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {useTranslations("common")("loading")}
            </p>
          </div>
        </div>
      }
    >
      <ApprovalSuccessContent />
    </Suspense>
  );
}
