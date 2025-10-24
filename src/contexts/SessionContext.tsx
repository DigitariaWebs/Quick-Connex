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
  logErrorWithContext,
  logInfo,
  logDebug,
  formatErrorForClient,
} from "@/lib/utils/error-handling";

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

      logDebug("Authentication check started", {
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
          logInfo("User authenticated successfully", {
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
          logDebug("Authentication failed - no user data", {
            operation: "auth_check_failed",
            reason: "no_user_data",
            timestamp: new Date(),
          });

          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
      } else {
        logDebug("Authentication failed - server error", {
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
      logErrorWithContext(error, {
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
        logDebug("Skipping refresh for new session", {
          operation: "session_refresh_skipped",
          sessionAge: session.sessionAge,
          timestamp: new Date(),
        });
        return true; // Return success without refreshing
      }

      logDebug("Session refresh started", {
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
          logInfo("Session refreshed successfully", {
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
        logDebug("Session invalid, clearing state", {
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
      logErrorWithContext(error, {
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
      logInfo("Logout process started", {
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

      logInfo("Logout successful", {
        operation: "logout_success",
        timestamp: new Date(),
      });
    } catch (error) {
      logErrorWithContext(error, {
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
      logInfo("Logout all sessions started", {
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

      logInfo("All sessions revoked successfully", {
        operation: "logout_all_success",
        timestamp: new Date(),
      });
    } catch (error) {
      logErrorWithContext(error, {
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
      logDebug("Fetching user sessions", {
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
          logInfo("Sessions retrieved successfully", {
            operation: "get_sessions_success",
            sessionCount: data.sessions?.length || 0,
            timestamp: new Date(),
          });

          return data.sessions || [];
        }
      }

      logDebug("Failed to get sessions", {
        operation: "get_sessions_failed",
        status: response.status,
        timestamp: new Date(),
      });

      return [];
    } catch (error) {
      logErrorWithContext(error, {
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
        logDebug("Revoking session", {
          operation: "revoke_session_start",
          sessionId,
          timestamp: new Date(),
        });

        const response = await fetch(`/api/auth/session/revoke/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          logInfo("Session revoked successfully", {
            operation: "revoke_session_success",
            sessionId,
            timestamp: new Date(),
          });

          return true;
        }

        logDebug("Failed to revoke session", {
          operation: "revoke_session_failed",
          sessionId,
          status: response.status,
          timestamp: new Date(),
        });

        return false;
      } catch (error) {
        logErrorWithContext(error, {
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

      logDebug("Scheduling session refresh", {
        operation: "schedule_refresh",
        remainingMinutes,
        refreshTimeMs: refreshTime,
        timestamp: new Date(),
      });

      setTimeout(async () => {
        logDebug("Auto-refreshing session", {
          operation: "auto_refresh_start",
          timestamp: new Date(),
        });

        const success = await refreshSession();

        if (!success) {
          logDebug("Auto-refresh failed", {
            operation: "auto_refresh_failed",
            timestamp: new Date(),
          });

          // Only logout if this isn't a brand new session (grace period)
          // This prevents immediate logout after login
          if (session && session.sessionAge > 1) {
            logDebug("Session refresh failed after grace period, logging out", {
              operation: "auto_refresh_failed_logout",
              sessionAge: session.sessionAge,
              timestamp: new Date(),
            });
            await logout();
          } else {
            logDebug(
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

    logDebug("Setting up session timeout warnings", {
      operation: "timeout_warnings_setup",
      remainingMinutes,
      timestamp: new Date(),
    });

    // Show warning 10 minutes before expiration
    if (remainingMinutes > 10) {
      const warningTime = (remainingMinutes - 10) * 60 * 1000;

      setTimeout(() => {
        logDebug("Session warning - expires in 10 minutes", {
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
        logDebug("Session final warning - expires in 2 minutes", {
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
