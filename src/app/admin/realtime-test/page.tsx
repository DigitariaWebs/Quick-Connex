"use client";

export const dynamic = "force-dynamic";

/**
 * Real-time Test Page
 *
 * Admin-only page for testing the real-time notification system.
 * Provides tools for testing socket connections, notifications, and Web Push.
 */

import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { ClientRealtimeProvider } from "@/components/providers/ClientRealtimeProvider";
import { useWebPush } from "@/hooks/realtime";
import {
  Bell,
  Wifi,
  Smartphone,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Users,
  MessageSquare,
} from "lucide-react";

function RealtimeTestContent() {
  const { user, isAuthenticated } = useSession();
  const { isConnected, connectionError, emitEvent } = useRealtime();
  const {
    isSupported: isPushSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
    testNotification,
  } = useWebPush();

  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState(
    "Test message from admin panel"
  );
  const [targetUserId, setTargetUserId] = useState("");

  // Check if user is admin
  if (
    !isAuthenticated ||
    !user ||
    !["admin", "super_admin"].includes(user.userType)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            This page is only accessible to administrators.
          </p>
        </div>
      </div>
    );
  }

  // Test socket connection
  const testSocketConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test?action=connections");
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, socket: data }));
    } catch (error) {
      console.error("Socket test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test notification
  const testNotificationSend = async () => {
    if (!targetUserId) {
      alert("Please enter a target user ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test_notification",
          targetUsers: [targetUserId],
          message: testMessage,
        }),
      });
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, notification: data }));
    } catch (error) {
      console.error("Notification test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test socket event
  const testSocketEvent = async () => {
    if (!targetUserId) {
      alert("Please enter a target user ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test_socket",
          userId: targetUserId,
          message: testMessage,
        }),
      });
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, socketEvent: data }));
    } catch (error) {
      console.error("Socket event test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test broadcast
  const testBroadcast = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "broadcast",
          message: testMessage,
        }),
      });
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, broadcast: data }));
    } catch (error) {
      console.error("Broadcast test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Web Push
  const testWebPushNotification = async () => {
    setIsLoading(true);
    try {
      const success = await testNotification();
      setTestResults((prev: any) => ({ ...prev, webPush: { success } }));
    } catch (error) {
      console.error("Web Push test failed:", error);
      setTestResults((prev: any) => ({
        ...prev,
        webPush: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Run comprehensive test
  const runComprehensiveTest = async () => {
    if (!targetUserId) {
      alert("Please enter a target user ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "comprehensive_test",
          targetUserId,
          message: testMessage,
        }),
      });
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, comprehensive: data }));
    } catch (error) {
      console.error("Comprehensive test failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get system status
  const getSystemStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/realtime/test?action=status");
      const data = await response.json();
      setTestResults((prev: any) => ({ ...prev, status: data }));
    } catch (error) {
      console.error("Status check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Real-time System Test Panel
          </h1>
          <p className="text-gray-600">
            Test and monitor the real-time notification system
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Wifi
                className={`h-5 w-5 ${
                  isConnected ? "text-green-500" : "text-red-500"
                }`}
              />
              <div>
                <p className="font-medium">Socket Connection</p>
                <p
                  className={`text-sm ${
                    isConnected ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </p>
                {connectionError && (
                  <p className="text-xs text-red-500">{connectionError}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Bell
                className={`h-5 w-5 ${
                  isPushSupported ? "text-green-500" : "text-gray-400"
                }`}
              />
              <div>
                <p className="font-medium">Web Push</p>
                <p
                  className={`text-sm ${
                    isPushSupported ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  {isPushSupported ? "Supported" : "Not Supported"}
                </p>
                {isPushSupported && (
                  <p
                    className={`text-xs ${
                      isSubscribed ? "text-green-600" : "text-orange-600"
                    }`}
                  >
                    {isSubscribed ? "Subscribed" : "Not Subscribed"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">User</p>
                <p className="text-sm text-gray-600">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.userType}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Test Controls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target User ID
                </label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter user ID to test"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Test Buttons */}
            <div className="space-y-3">
              <button
                onClick={getSystemStatus}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Check System Status
              </button>

              <button
                onClick={testSocketConnection}
                disabled={isLoading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Test Socket Connection
              </button>

              <button
                onClick={testNotificationSend}
                disabled={isLoading || !targetUserId}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Notification
              </button>

              <button
                onClick={testSocketEvent}
                disabled={isLoading || !targetUserId}
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Socket Event
              </button>

              <button
                onClick={testBroadcast}
                disabled={isLoading}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Test Broadcast
              </button>

              <button
                onClick={testWebPushNotification}
                disabled={isLoading || !isPushSupported}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Test Web Push
              </button>

              <button
                onClick={runComprehensiveTest}
                disabled={isLoading || !targetUserId}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Run All Tests
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Test Results
            </h2>

            <div className="space-y-4">
              {Object.entries(testResults).map(
                ([key, result]: [string, any]) => (
                  <div
                    key={key}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h3 className="font-medium text-gray-900 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </h3>
                    <pre className="text-sm text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Web Push Controls */}
        {isPushSupported && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Web Push Controls
            </h2>

            <div className="flex space-x-4">
              {!isSubscribed ? (
                <button
                  onClick={subscribe}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe to Push Notifications
                </button>
              ) : (
                <button
                  onClick={unsubscribe}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Unsubscribe from Push Notifications
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RealtimeTestPage() {
  return (
    <ClientRealtimeProvider>
      <RealtimeTestContent />
    </ClientRealtimeProvider>
  );
}
