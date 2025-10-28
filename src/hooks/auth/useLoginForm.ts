import { useState, FormEvent } from 'react';
import { login } from '@/lib/auth/client';
import { toUserError } from '@/lib/api/core/error-handler';

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
      const result = await login({
        email: formData.get('email') as string,
        password: formData.get('password') as string
      });
      
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      
      console.log('✅ Login: Session created by API');
      console.log('🔍 Session data:', result.session);
      console.log('👤 User data:', result.user);
      console.log('👤 User type:', result.user.userType);
      
      // Simple redirect logic based on user type
      const redirectPath = result.user.userType === 'admin' || result.user.userType === 'super_admin' 
        ? '/admin' 
        : '/dashboard';
      
      console.log(`✅ Login: Redirecting ${result.user.userType} to ${redirectPath}`);
      console.log('🔗 Full redirect URL:', window.location.origin + redirectPath);
      
      // Use a shorter delay and force page reload to ensure clean state
      setTimeout(() => {
        console.log('🚀 Executing redirect to:', redirectPath);
        window.location.href = redirectPath;
      }, 1000);
      
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
