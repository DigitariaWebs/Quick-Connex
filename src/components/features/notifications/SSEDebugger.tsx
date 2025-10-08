"use client";

import { useSSE } from "@/contexts/SSEContext";

export default function SSEDebugger() {
  const {
    connected,
    connecting,
    error,
    lastMessage,
    connectionQuality,
    retryCount,
    subscribers,
  } = useSSE();

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
        <div>
          <span className="font-semibold">Connecting:</span>{" "}
          <span className={connecting ? "text-yellow-400" : "text-gray-400"}>
            {connecting ? "Yes" : "No"}
          </span>
        </div>
        <div>
          <span className="font-semibold">Quality:</span>{" "}
          <span className="text-blue-400">{connectionQuality}</span>
        </div>
        <div>
          <span className="font-semibold">Subscribers:</span>{" "}
          <span className="text-blue-400">{subscribers}</span>
        </div>
        <div>
          <span className="font-semibold">Retry Count:</span>{" "}
          <span className="text-blue-400">{retryCount}</span>
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
              {lastMessage.data && (
                <div>Data: {JSON.stringify(lastMessage.data)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
