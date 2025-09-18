import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
        // JWT token is now stored in secure HTTP-only cookie
        // No need to store sensitive data in localStorage
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        // Use Next.js router for better navigation
        setTimeout(() => {
          router.push('/dashboard');
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
