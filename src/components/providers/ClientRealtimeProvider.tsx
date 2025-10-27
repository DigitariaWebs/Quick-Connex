"use client";

import { RealtimeProvider } from "@/contexts/RealtimeContext";

interface ClientRealtimeProviderProps {
  children: React.ReactNode;
}

export function ClientRealtimeProvider({
  children,
}: ClientRealtimeProviderProps) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}
