import { useState, FormEvent } from 'react';

export function useSignUpForm() {
  const [userType, setUserType] = useState('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const formData = new FormData(event.currentTarget);
      formData.append('userType', userType);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Account created successfully!' });
        // Could redirect here if needed
      } else {
        setMessage({ type: 'error', text: result.message || 'An error occurred during sign up' });
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
    handleSubmit,
  };
}
