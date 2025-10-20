"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

// Simple session types
export interface SessionInfo {
  sessionId: string;
  expiresAt: string;
  lastAccessedAt: string;
  securityRisk: "low" | "medium" | "high";
  isNewDevice: boolean;
  isNewLocation: boolean;
  sessionAge: number;
  remainingTime: number;
}

export interface User {
  _id: string;
  email: string;
  userType: "employee" | "manager" | "admin" | "super_admin";
  firstName: string;
  lastName: string;
  status: string;
}

export interface SessionContextType {
  user: User | null;
  session: SessionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  getSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/verify", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.user) {
          console.log(
            "✅ SessionContext: User authenticated:",
            data.user.email
          );
          setUser(data.user);
          setSession(data.session || null);
          setIsAuthenticated(true);

          // Set up automatic session refresh
          if (data.session) {
            scheduleSessionRefresh(data.session.remainingTime);
          }
        } else {
          console.log("❌ SessionContext: Authentication failed");
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log(
          "❌ SessionContext: Authentication failed:",
          response.status
        );
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session before expiration
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/session/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.session) {
          setSession((prev) => (prev ? { ...prev, ...data.session } : null));
          scheduleSessionRefresh(data.session.remainingTime);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
  }, []);

  // Logout current session
  const logout = useCallback(async () => {
    try {
      console.log("🚪 Session: Starting logout process");

      // Disconnect SSE connection if exists
      try {
        const { unifiedSSEClient } = await import("@/lib/sse");
        unifiedSSEClient.clearUser();
      } catch (error) {
        console.log("SSE manager not available during logout");
      }

      // Revoke current session
      await fetch("/api/auth/session/revoke", {
        method: "DELETE",
        credentials: "include",
      });

      console.log("✅ Session: Logout successful");
    } catch (error) {
      console.error("❌ Session: Logout failed:", error);
    } finally {
      // Clear state and redirect
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      router.push("/login");
    }
  }, [router]);

  // Logout all sessions
  const logoutAllSessions = useCallback(async () => {
    try {
      console.log("🚪 Session: Starting logout all sessions");

      // Disconnect SSE connection
      try {
        const { sseClient } = await import("@/lib/sse");
        sseClient.clearUser();
      } catch (error) {
        console.log("SSE manager not available during logout");
      }

      // Revoke all sessions
      await fetch("/api/auth/session/revoke-all", {
        method: "DELETE",
        credentials: "include",
      });

      console.log("✅ Session: All sessions revoked");
    } catch (error) {
      console.error("❌ Session: Logout all failed:", error);
    } finally {
      // Clear state and redirect
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      router.push("/login");
    }
  }, [router]);

  // Get user's active sessions
  const getSessions = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.sessions : [];
      }

      return [];
    } catch (error) {
      console.error("Failed to get sessions:", error);
      return [];
    }
  }, []);

  // Revoke specific session
  const revokeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/auth/session/revoke/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        });

        return response.ok;
      } catch (error) {
        console.error("Failed to revoke session:", error);
        return false;
      }
    },
    []
  );

  // Schedule automatic session refresh
  const scheduleSessionRefresh = useCallback(
    (remainingMinutes: number) => {
      // Refresh session 5 minutes before expiration
      const refreshTime = Math.max(remainingMinutes - 5, 1) * 60 * 1000;

      setTimeout(async () => {
        console.log("🔄 Session: Auto-refreshing session");
        const success = await refreshSession();

        if (!success) {
          console.log("❌ Session: Auto-refresh failed, logging out");
          await logout();
        }
      }, refreshTime);
    },
    [refreshSession, logout]
  );

  // Set up session timeout warnings
  useEffect(() => {
    if (!session) return;

    const remainingMinutes = session.remainingTime;

    // Show warning 10 minutes before expiration
    if (remainingMinutes > 10) {
      const warningTime = (remainingMinutes - 10) * 60 * 1000;

      setTimeout(() => {
        console.log("⚠️ Session: Warning - Session expires in 10 minutes");
        // You can show a toast notification here
      }, warningTime);
    }

    // Show final warning 2 minutes before expiration
    if (remainingMinutes > 2) {
      const finalWarningTime = (remainingMinutes - 2) * 60 * 1000;

      setTimeout(() => {
        console.log("⚠️ Session: Final warning - Session expires in 2 minutes");
        // You can show a modal or toast here
      }, finalWarningTime);
    }
  }, [session]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up periodic auth checks (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAuth]);

  const value: SessionContextType = {
    user,
    session,
    isAuthenticated,
    isLoading,
    checkAuth,
    refreshSession,
    logout,
    logoutAllSessions,
    getSessions,
    revokeSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
