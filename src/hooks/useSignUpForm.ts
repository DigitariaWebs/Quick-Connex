import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
      formData.append('userType', userType);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Account created successfully! Redirecting to login...' });
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login?message=account-created');
        }, 2000);
        
        // Alternative: Auto-login after signup (uncomment if you want this behavior)
        // setTimeout(() => {
        //   router.push('/login?auto-login=true');
        // }, 2000);
      } else {
        if (result.errors && typeof result.errors === 'object') {
          // Handle field-specific errors
          setFieldErrors(result.errors);
          setMessage({ type: 'error', text: result.message || 'Please correct the errors below' });
        } else {
          // Handle general error messages
          setMessage({ type: 'error', text: result.message || 'An error occurred during sign up' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server. Please try again.' });
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
