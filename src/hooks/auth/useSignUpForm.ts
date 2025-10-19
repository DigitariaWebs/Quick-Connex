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
        setMessage({ 
          type: 'success', 
          text: result.message || 'Account created successfully! Your registration is pending approval. You will receive an email notification once approved.' 
        });
        
        // If user was approved and session was created, set up SSE connection
        if (result.session && result.user) {
          console.log('✅ Signup: Session created for approved user');
          
          // Import and set user in unified SSE manager
          const { unifiedSSEClient } = await import('@/lib/sse/unified-client-manager');
          unifiedSSEClient.setUser(result.user, result.session.sessionId);
          
          // Redirect to appropriate dashboard
          const redirectPath = (result.user.userType === 'admin' || result.user.userType === 'super_admin') 
            ? '/admin/dashboard' 
            : '/dashboard';
          
          setTimeout(() => {
            router.replace(redirectPath); // Use replace to avoid history issues
          }, 2000);
        } else {
          // Redirect to login page for pending approval
          setTimeout(() => {
            router.replace('/login?message=account-pending-approval'); // Use replace to avoid history issues
          }, 4000);
        }
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
