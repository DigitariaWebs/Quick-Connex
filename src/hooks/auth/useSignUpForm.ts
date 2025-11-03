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
      const confirmPassword = formData.get('repeat-password') as string;
      
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        return;
      }
      
      // Submit form data directly (using FormData for file uploads)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Signup failed');
      }

      setMessage({ 
        type: 'success', 
        text: 'Account created successfully! Please verify your email and phone number.' 
      });
      
      // Redirect to verification page with email and phone
      const email = formData.get('email') as string;
      const phoneInput = formData.get('phone') as string;
      const countryCode = formData.get('countryCode') as string || '+1';
      
      // Combine country code with phone number
      const phoneNumber = phoneInput?.replace(/\D/g, "") || "";
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      // Encode for URL
      const encodedPhone = encodeURIComponent(fullPhone);
      const encodedEmail = encodeURIComponent(email);
      
      setTimeout(() => {
        router.replace(`/signup/verify?email=${encodedEmail}&phone=${encodedPhone}&countryCode=${encodeURIComponent(countryCode)}`);
      }, 1500);
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
