"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function ApprovalErrorContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [transferId, setTransferId] = useState("");
  const [errorType, setErrorType] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const transferIdParam = searchParams.get("transferId");
    const typeParam = searchParams.get("type");

    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    } else {
      setErrorMessage("An error occurred while processing your request");
    }

    if (transferIdParam) {
      setTransferId(transferIdParam);
    }

    if (typeParam) {
      setErrorType(typeParam);
    }
  }, [searchParams]);

  const getErrorIcon = () => {
    if (errorType === "already_processed") {
      return "⚠️";
    } else if (errorType === "not_found") {
      return "🔍";
    } else if (errorType === "unauthorized") {
      return "🔒";
    } else {
      return "❌";
    }
  };

  const getErrorTitle = () => {
    if (errorType === "already_processed") {
      return "Transfer Already Processed";
    } else if (errorType === "not_found") {
      return "Transfer Not Found";
    } else if (errorType === "unauthorized") {
      return "Access Denied";
    } else {
      return "Processing Error";
    }
  };

  const getErrorDescription = () => {
    if (errorType === "already_processed") {
      return "This transfer has already been processed and cannot be modified.";
    } else if (errorType === "not_found") {
      return "The requested transfer could not be found in the system.";
    } else if (errorType === "unauthorized") {
      return "You don't have permission to perform this action.";
    } else {
      return "An unexpected error occurred while processing your request.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6"
        >
          <span className="text-4xl">{getErrorIcon()}</span>
        </motion.div>

        {/* Error Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          {getErrorTitle()}
        </motion.h1>

        {transferId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-600 mb-6"
          >
            Transfer ID:{" "}
            <span className="font-mono font-semibold">{transferId}</span>
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <p className="text-gray-600">{getErrorDescription()}</p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
              <p className="text-sm text-red-800 font-medium mb-1">
                Error Details:
              </p>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>What to do next:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Check if you have the latest email notification</li>
              <li>• Contact the system administrator if you need assistance</li>
              <li>• Verify the transfer status in the dashboard</li>
            </ul>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 pt-6 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500">
            This is an automated notification from the{" "}
            <span className="font-semibold">Quick Connex</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ApprovalErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ApprovalErrorContent />
    </Suspense>
  );
}
