import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  userType: 'employee' | 'manager';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  post?: string;
  class?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Include cookies in request
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logout: Starting logout process');
      
      // Import and disconnect SSE connection immediately
      const { globalSSEManager } = await import('@/lib/notifications/global-sse-manager');
      console.log('🔌 Logout: Disconnecting SSE connection');
      globalSSEManager.clearUser(); // This will disconnect the SSE connection
      
      console.log('🌐 Logout: Calling logout API');
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      console.log('✅ Logout: Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    } finally {
      console.log('🧹 Logout: Clearing user state and redirecting');
      setUser(null);
      setIsAuthenticated(false);
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    checkAuth,
  };
}
