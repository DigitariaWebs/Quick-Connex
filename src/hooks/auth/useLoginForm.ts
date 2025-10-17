import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function useLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      if (response.ok) {
        // JWT token is now stored in secure HTTP-only cookie
        // No need to store sensitive data in localStorage
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        // Trigger immediate authentication check to establish SSE connection
        console.log('🔐 Login: Triggering immediate auth check for SSE connection');
        try {
          const authResponse = await fetch('/api/auth/verify', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            console.log('✅ Login: Auth verification successful, SSE should connect now');
            
            // Import and set user in SSE manager immediately
            const { globalSSEManager } = await import('@/lib/notifications/global-sse-manager');
            globalSSEManager.setUser(authData.user);
            
            // Redirect based on user type
            const redirectPath = (authData.user.userType === 'admin' || authData.user.userType === 'super_admin') 
              ? '/admin/dashboard' 
              : '/dashboard';
            
            console.log(`✅ Login: Redirecting ${authData.user.userType} to ${redirectPath}`);
            setTimeout(() => {
              router.push(redirectPath);
            }, 1000);
            return;
          }
        } catch (authError) {
          console.error('⚠️ Login: Auth verification failed, SSE will connect on page load:', authError);
        }
        
        // Fallback: Use Next.js router for better navigation
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        // Handle different error types
        if (response.status === 403 && result.status === 'pending') {
          setMessage({ 
            type: 'warning', 
            text: 'Your account is pending approval. You will receive an email notification once approved.' 
          });
        } else if (response.status === 403 && result.status === 'rejected') {
          setMessage({ 
            type: 'error', 
            text: 'Your account registration has been rejected. Please contact support for more information.' 
          });
        } else {
          setMessage({ type: 'error', text: result.message || 'Login failed' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    message,
    handleSubmit,
  };
}
