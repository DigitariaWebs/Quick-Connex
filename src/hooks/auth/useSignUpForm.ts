import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/auth/client';
import { toUserError } from '@/lib/utils/error-handling';

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
      
      // Basic validation
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        return;
      }
      
      const result = await signup({
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        password: password,
        userType: userType as 'employee' | 'manager',
        post: formData.get('post') as string || undefined,
        ciusss: formData.get('ciusss') as string || undefined,
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Account created successfully! Your registration is pending approval. You will receive an email notification once approved.' 
      });
      
      // If user was approved and session was created, redirect to dashboard
      if (result.session && result.user) {
        console.log('✅ Signup: Session created for approved user');
        
        // Simple redirect logic based on user type
        const redirectPath = result.user.userType === 'admin' || result.user.userType === 'super_admin' 
          ? '/admin' 
          : '/dashboard';
        
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
      
      const { code, message: errorMessage } = toUserError(error);
      
      // Handle validation errors
      if (code === 'VALIDATION_ERROR' || code === 'INVALID_INPUT') {
        setMessage({ type: 'error', text: errorMessage });
      } else if (code === 'CONFLICT' || code === 'DUPLICATE_ENTRY') {
        setMessage({ type: 'error', text: 'An account with this email already exists.' });
      } else {
        setMessage({ type: 'error', text: errorMessage });
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
