"use client";

import { useNotificationSSE } from "@/hooks/useNotificationSSE";

export default function SSEDebugger() {
  const { connected, error, lastMessage, reconnect, disconnect } =
    useNotificationSSE();

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🔧 SSE Debug Info</h4>
      <div className="space-y-1">
        <div>
          <span className="font-semibold">Connected:</span>{" "}
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {connected ? "Yes" : "No"}
          </span>
        </div>
        {error && (
          <div>
            <span className="font-semibold">Error:</span>{" "}
            <span className="text-red-400">{error}</span>
          </div>
        )}
        {lastMessage && (
          <div>
            <span className="font-semibold">Last Message:</span>
            <div className="mt-1 p-2 bg-gray-800 rounded text-xs">
              <div>Type: {lastMessage.type}</div>
              <div>Title: {lastMessage.title}</div>
              <div>Priority: {lastMessage.priority}</div>
            </div>
          </div>
        )}
        <div className="mt-3 flex space-x-2">
          <button
            onClick={reconnect}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            Reconnect
          </button>
          <button
            onClick={disconnect}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
