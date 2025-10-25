import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/client';
import { ApiError } from '@/lib/client';

/**
 * useSignUpForm Hook
 * 
 * Thin React hook that manages signup form state and delegates business logic to AuthClient.
 * Follows Clean Architecture by separating UI concerns from business logic.
 */
export function useSignUpForm() {
  const router = useRouter();
  const [userType, setUserType] = useState('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    setFieldErrors({});
    
    try {
      const formData = new FormData(event.currentTarget);
      const result = await authClient.signup({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        confirmPassword: formData.get('confirmPassword') as string,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        userType: userType as any,
        hospital: formData.get('hospital') as string || undefined,
        ciusss: formData.get('ciusss') as string || undefined,
      });
      
      setMessage({ 
        type: 'success', 
        text: result.message || 'Account created successfully! Your registration is pending approval. You will receive an email notification once approved.' 
      });
      
      // If user was approved and session was created, redirect to dashboard
      if (result.session && result.user) {
        console.log('✅ Signup: Session created for approved user');
        
        // Get redirect path using AuthClient business logic
        const redirectPath = authClient.getRedirectPath(result.user.userType);
        
        setTimeout(() => {
          router.replace(redirectPath);
        }, 2000);
      } else {
        // Redirect to login page for pending approval
        setTimeout(() => {
          router.replace('/login?message=account-pending-approval');
        }, 4000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error instanceof ApiError) {
        // Handle API-specific errors
        if (error.data?.errors && typeof error.data.errors === 'object') {
          // Handle field-specific errors
          setFieldErrors(error.data.errors);
          setMessage({ type: 'error', text: error.message || 'Please correct the errors below' });
        } else {
          // Handle general error messages
          setMessage({ type: 'error', text: error.message || 'An error occurred during sign up' });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to connect to server. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userType,
    setUserType,
    isLoading,
    message,
    fieldErrors,
    handleSubmit,
  };
}
