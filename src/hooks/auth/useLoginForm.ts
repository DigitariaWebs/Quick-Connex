import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Dashboard routing logic moved to AuthService
const getDashboardRoute = (userType: string) => {
  switch (userType) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'manager':
      return '/dashboard';
    case 'employee':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

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
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        console.log('✅ Login: Session created by API');
        console.log('🔍 Session data:', result.session);
        console.log('👤 User data:', result.user);
        
        // Determine redirect path based on user type using utility
        const redirectPath = getDashboardRoute(result.user.userType);
        
        console.log(`✅ Login: Redirecting ${result.user.userType} to ${redirectPath}`);
        
        // Use a shorter delay and force page reload to ensure clean state
        setTimeout(() => {
          // Force a hard navigation to ensure all contexts are reset
          window.location.href = redirectPath;
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
      console.error('Login error:', error);
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
