"use client";

import { RealtimeProvider } from "@/contexts/RealtimeContext";
// Ably wiring is handled inside RealtimeContext via hooks; this provider remains a thin wrapper

interface ClientRealtimeProviderProps {
  children: React.ReactNode;
}

export function ClientRealtimeProvider({
  children,
}: ClientRealtimeProviderProps) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
