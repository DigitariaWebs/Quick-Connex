import { useSession } from '@/contexts/SessionContext';
import type { User } from '@/types/user';
import { useMemo } from 'react';

// Legacy useAuth hook that wraps the new SessionContext
export function useAuth() {
  const sessionContext = useSession();
  
  // Convert session user to legacy User type for backward compatibility
  // Memoize the user object to prevent unnecessary re-renders
  const user: User | null = useMemo(() => {
    if (!sessionContext.user) return null;
    
    return {
      _id: sessionContext.user._id,
      email: sessionContext.user.email,
      userType: sessionContext.user.userType,
      firstName: sessionContext.user.firstName,
      lastName: sessionContext.user.lastName,
      status: sessionContext.user.status as 'pending' | 'approved' | 'rejected' | 'suspended',
      phone: (sessionContext.user as any).phone || '',
      // Add other required fields with defaults
      permissions: [],
      isSuperAdmin: sessionContext.user.userType === 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [sessionContext.user]);

  return {
    user,
    isLoading: sessionContext.isLoading,
    isAuthenticated: sessionContext.isAuthenticated,
    logout: sessionContext.logout,
    checkAuth: sessionContext.checkAuth,
    // Additional session-specific methods
    session: sessionContext.session,
    sessionData: sessionContext.sessionData,
    refreshSession: sessionContext.refreshSession,
    logoutAllSessions: sessionContext.logoutAllSessions,
    getSessions: sessionContext.getSessions,
    revokeSession: sessionContext.revokeSession,
  };
}
