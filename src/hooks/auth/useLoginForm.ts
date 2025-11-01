import { useState, FormEvent } from 'react';
import { authClient } from '@/lib/client';
import { ApiError } from '@/lib/client';
import { verifyAuthCookie } from '@/lib/auth/utils/cookie-verification';
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
      
      // Verify cookie is actually set before redirecting
      setMessage({ type: 'success', text: 'Login successful! Verifying...' });
      console.log('🔍 Verifying authentication cookie before redirect...');
      
      const cookieVerified = await verifyAuthCookie(3, 200);
      
      if (!cookieVerified) {
        console.error('❌ Cookie verification failed - cannot redirect safely');
        setMessage({ 
          type: 'error', 
          text: 'Authentication cookie not available. Please try logging in again.' 
        });
        setIsLoading(false);
        return;
      }
      
      // Get redirect path using AuthClient business logic
      const redirectPath = authClient.getRedirectPath(result.user.userType);
      
      console.log(`✅ Cookie verified - Redirecting ${result.user.userType} to ${redirectPath}`);
      
      // Use full page reload to ensure cookie is available when SessionContext initializes
      // This prevents race conditions where the dashboard checks auth before SessionContext finishes
      setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
      
      // Small delay to show success message, then full page reload
      setTimeout(() => {
        console.log('🚀 Executing redirect with full page reload to:', redirectPath);
        window.location.href = redirectPath;
      }, 300);
      
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
