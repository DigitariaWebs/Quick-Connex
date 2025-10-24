"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  AppError,
  AuthError,
  ValidationError,
  NotFoundError,
  formatErrorForClient,
} from "@/lib/utils/error-handling";

// Client-side logging helpers (using console directly since LogService is server-only)
const log = {
  info: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[INFO] ${message}`, context);
    }
  },
  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG] ${message}`, context);
    }
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(`[ERROR] ${message}`, error, context);
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context);
  },
};

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
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionContextType {
  user: User | null;
  session: SessionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  getSessions: () => Promise<any[]>;
  revokeSession: (sessionId: string) => Promise<boolean>;
  clearError: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      log.debug("Authentication check started", {
        operation: "auth_check_start",
        timestamp: new Date(),
      });

      const response = await fetch("/api/auth/verify", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.user) {
          log.info("User authenticated successfully", {
            operation: "auth_check_success",
            email: data.user.email,
            userType: data.user.userType,
            timestamp: new Date(),
          });

          setUser(data.user);
          setSession(data.session || null);
          setIsAuthenticated(true);

          // Set up automatic session refresh
          if (data.session) {
            scheduleSessionRefresh(data.session.remainingTime);
          }
        } else {
          log.debug("Authentication failed - no user data", {
            operation: "auth_check_failed",
            reason: "no_user_data",
            timestamp: new Date(),
          });

          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      } else {
        log.debug("Authentication failed - server error", {
          operation: "auth_check_failed",
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date(),
        });

        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      log.error("Authentication check error", error, {
        operation: "auth_check_error",
        timestamp: new Date(),
      });

      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setError("Authentication check failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh session before expiration
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      // Don't refresh if not authenticated
      if (!isAuthenticated) {
        return false;
      }

      // Don't refresh if session is brand new (within first 2 minutes)
      if (session && session.sessionAge < 2) {
        log.debug("Skipping refresh for new session", {
          operation: "session_refresh_skipped",
          sessionAge: session.sessionAge,
          timestamp: new Date(),
        });
        return true; // Return success without refreshing
      }

      log.debug("Session refresh started", {
        operation: "session_refresh_start",
        timestamp: new Date(),
      });

      const response = await fetch("/api/auth/session/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.session) {
          log.info("Session refreshed successfully", {
            operation: "session_refresh_success",
            sessionId: data.session.sessionId,
            timestamp: new Date(),
          });

          setSession((prev) => (prev ? { ...prev, ...data.session } : null));
          scheduleSessionRefresh(data.session.remainingTime);
          return true;
        }
      } else if (response.status === 401) {
        // Session is invalid, clear state and redirect
        log.debug("Session invalid, clearing state", {
          operation: "session_refresh_failed",
          reason: "session_invalid",
          timestamp: new Date(),
        });

        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        router.push("/login");
        return false;
      }

      return false;
    } catch (error) {
      log.error("Session refresh error", error, {
        operation: "session_refresh_error",
        timestamp: new Date(),
      });

      setError("Session refresh failed");
      return false;
    }
  }, [isAuthenticated, router]);

  // Logout current session
  const logout = useCallback(async () => {
    try {
      log.info("Logout process started", {
        operation: "logout_start",
        timestamp: new Date(),
      });

      // Clear state first to stop any ongoing refresh calls
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setError(null);

      // Call the proper logout endpoint
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      log.info("Logout successful", {
        operation: "logout_success",
        timestamp: new Date(),
      });
    } catch (error) {
      log.error("Logout error", error, {
        operation: "logout_error",
        timestamp: new Date(),
      });

      setError("Logout failed");
    } finally {
      // Ensure state is cleared and redirect
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      router.push("/login");
    }
  }, [router]);

  // Logout all sessions
  const logoutAllSessions = useCallback(async () => {
    try {
      log.info("Logout all sessions started", {
        operation: "logout_all_start",
        timestamp: new Date(),
      });

      // Clear state first to stop any ongoing refresh calls
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setError(null);

      // Call the proper logout endpoint (which handles all sessions)
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      log.info("All sessions revoked successfully", {
        operation: "logout_all_success",
        timestamp: new Date(),
      });
    } catch (error) {
      log.error("Logout all sessions error", error, {
        operation: "logout_all_error",
        timestamp: new Date(),
      });

      setError("Logout all sessions failed");
    } finally {
      // Ensure state is cleared and redirect
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      router.push("/login");
    }
  }, [router]);

  // Get user's active sessions
  const getSessions = useCallback(async (): Promise<any[]> => {
    try {
      log.debug("Fetching user sessions", {
        operation: "get_sessions_start",
        timestamp: new Date(),
      });

      const response = await fetch("/api/auth/sessions", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          log.info("Sessions retrieved successfully", {
            operation: "get_sessions_success",
            sessionCount: data.sessions?.length || 0,
            timestamp: new Date(),
          });

          return data.sessions || [];
        }
      }

      log.debug("Failed to get sessions", {
        operation: "get_sessions_failed",
        status: response.status,
        timestamp: new Date(),
      });

      return [];
    } catch (error) {
      log.error("Get sessions error", error, {
        operation: "get_sessions_error",
        timestamp: new Date(),
      });

      setError("Failed to get sessions");
      return [];
    }
  }, []);

  // Revoke specific session
  const revokeSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        log.debug("Revoking session", {
          operation: "revoke_session_start",
          sessionId,
          timestamp: new Date(),
        });

        const response = await fetch(`/api/auth/session/revoke/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          log.info("Session revoked successfully", {
            operation: "revoke_session_success",
            sessionId,
            timestamp: new Date(),
          });

          return true;
        }

        log.debug("Failed to revoke session", {
          operation: "revoke_session_failed",
          sessionId,
          status: response.status,
          timestamp: new Date(),
        });

        return false;
      } catch (error) {
        log.error("Revoke session error", error, {
          operation: "revoke_session_error",
          sessionId,
          timestamp: new Date(),
        });

        setError("Failed to revoke session");
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

      log.debug("Scheduling session refresh", {
        operation: "schedule_refresh",
        remainingMinutes,
        refreshTimeMs: refreshTime,
        timestamp: new Date(),
      });

      setTimeout(async () => {
        log.debug("Auto-refreshing session", {
          operation: "auto_refresh_start",
          timestamp: new Date(),
        });

        const success = await refreshSession();

        if (!success) {
          log.debug("Auto-refresh failed", {
            operation: "auto_refresh_failed",
            timestamp: new Date(),
          });

          // Only logout if this isn't a brand new session (grace period)
          // This prevents immediate logout after login
          if (session && session.sessionAge > 1) {
            log.debug(
              "Session refresh failed after grace period, logging out",
              {
                operation: "auto_refresh_failed_logout",
                sessionAge: session.sessionAge,
                timestamp: new Date(),
              }
            );
            await logout();
          } else {
            log.debug(
              "Session refresh failed but within grace period, not logging out",
              {
                operation: "auto_refresh_failed_grace",
                sessionAge: session?.sessionAge || 0,
                timestamp: new Date(),
              }
            );
          }
        }
      }, refreshTime);
    },
    [refreshSession, logout]
  );

  // Set up session timeout warnings
  useEffect(() => {
    if (!session) return;

    const remainingMinutes = session.remainingTime;

    log.debug("Setting up session timeout warnings", {
      operation: "timeout_warnings_setup",
      remainingMinutes,
      timestamp: new Date(),
    });

    // Show warning 10 minutes before expiration
    if (remainingMinutes > 10) {
      const warningTime = (remainingMinutes - 10) * 60 * 1000;

      setTimeout(() => {
        log.debug("Session warning - expires in 10 minutes", {
          operation: "session_warning_10min",
          timestamp: new Date(),
        });
        // You can show a toast notification here
      }, warningTime);
    }

    // Show final warning 2 minutes before expiration
    if (remainingMinutes > 2) {
      const finalWarningTime = (remainingMinutes - 2) * 60 * 1000;

      setTimeout(() => {
        log.debug("Session final warning - expires in 2 minutes", {
          operation: "session_warning_2min",
          timestamp: new Date(),
        });
        // You can show a modal or toast here
      }, finalWarningTime);
    }
  }, [session]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up periodic auth checks (every 5 minutes) - only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkAuth();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkAuth, isAuthenticated]);

  const value: SessionContextType = {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    checkAuth,
    refreshSession,
    logout,
    logoutAllSessions,
    getSessions,
    revokeSession,
    clearError,
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
