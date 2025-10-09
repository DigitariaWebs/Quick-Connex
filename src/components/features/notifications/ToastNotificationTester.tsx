"use client";

import { useState } from "react";
import { useSSE } from "@/contexts/SSEContext";

/**
 * Toast Notification Tester Component
 *
 * This component provides a simple interface to test toast notifications
 * by triggering test notifications via the SSE system.
 */
export default function ToastNotificationTester() {
  const [isLoading, setIsLoading] = useState(false);
  const { connected } = useSSE();

  const sendTestNotification = async (type: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/test-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          notificationType: type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${type} notification sent:`, data.message);
      } else {
        console.error(
          `❌ Failed to send ${type} notification:`,
          response.status
        );
      }
    } catch (error) {
      console.error(`❌ Error sending ${type} notification:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          ⚠️ SSE connection not established. Toast notifications will not work.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800 mb-3">
        🧪 Toast Notification Tester
      </h3>
      <p className="text-blue-700 mb-4">
        Test toast notifications by sending different types of notifications:
      </p>

      <div className="space-y-2">
        <button
          onClick={() => sendTestNotification("test")}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Basic Test Notification"}
        </button>

        <button
          onClick={() => sendTestNotification("transfer_status")}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Transfer Status Notification"}
        </button>

        <button
          onClick={() => sendTestNotification("urgent")}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Urgent Alert Notification"}
        </button>
      </div>

      <p className="text-sm text-blue-600 mt-3">
        💡 Toast notifications should appear in the top-right corner when sent.
      </p>
    </div>
  );
}
