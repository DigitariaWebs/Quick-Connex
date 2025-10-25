import { useState, FormEvent } from 'react';
import { authClient } from '@/lib/client';
import { ApiError } from '@/lib/client';

/**
 * useLoginForm Hook
 * 
 * Thin React hook that manages login form state and delegates business logic to AuthClient.
 * Follows Clean Architecture by separating UI concerns from business logic.
 */
export function useLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const formData = new FormData(event.currentTarget);
      const result = await authClient.login({
        email: formData.get('email') as string,
        password: formData.get('password') as string
      });
      
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      
      console.log('✅ Login: Session created by API');
      console.log('🔍 Session data:', result.session);
      console.log('👤 User data:', result.user);
      console.log('👤 User type:', result.user.userType);
      
      // Get redirect path using AuthClient business logic
      const redirectPath = authClient.getRedirectPath(result.user.userType);
      
      console.log(`✅ Login: Redirecting ${result.user.userType} to ${redirectPath}`);
      console.log('🔗 Full redirect URL:', window.location.origin + redirectPath);
      
      // Use a shorter delay and force page reload to ensure clean state
      setTimeout(() => {
        console.log('🚀 Executing redirect to:', redirectPath);
        window.location.href = redirectPath;
      }, 1000);
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof ApiError) {
        // Handle API-specific errors
        if (error.statusCode === 403) {
          const errorData = error.data;
          if (errorData?.status === 'pending') {
            setMessage({ 
              type: 'warning', 
              text: 'Your account is pending approval. You will receive an email notification once approved.' 
            });
          } else if (errorData?.status === 'rejected') {
            setMessage({ 
              type: 'error', 
              text: 'Your account registration has been rejected. Please contact support for more information.' 
            });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        } else {
          setMessage({ type: 'error', text: error.message });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to connect to server. Please try again.' });
      }
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
