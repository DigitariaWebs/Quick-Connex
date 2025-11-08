import { useState, FormEvent } from 'react';
import { authClient } from '@/lib/client';
import { ApiError } from '@/lib/client';
import { toUserError } from '@/lib/utils/error-handling';

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
      
      console.log('✅ Login: Session created by API');
      console.log('🔍 Session data:', result.session);
      console.log('👤 User data:', result.user);
      console.log('👤 User type:', result.user.userType);
      
      // Get redirect path using AuthClient business logic
      const redirectPath = authClient.getRedirectPath(result.user.userType);
      
      console.log(`✅ Redirecting ${result.user.userType} to ${redirectPath}`);
      
      // Show success message
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      
      // Delay to ensure cookie is fully set in browser before redirect
      // This prevents race conditions where middleware doesn't see the cookie
      // Increased delay to ensure cookie is available for subsequent requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🚀 Performing redirect to:', redirectPath);
      console.log('🍪 Cookie should be set by now');
      
      // Use full page reload to ensure clean state and cookie availability
      window.location.href = redirectPath;
      
    } catch (error) {
      console.error('Login error:', error);
      
      const { code, message: errorMessage } = toUserError(error);
      
      // Handle specific error cases
      if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') {
        setMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
      } else if (code === 'FORBIDDEN') {
        setMessage({ 
          type: 'warning', 
          text: 'Your account is pending approval. You will receive an email notification once approved.' 
        });
      } else {
        setMessage({ type: 'error', text: errorMessage });
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
