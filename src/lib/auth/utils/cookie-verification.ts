 /**
 * Cookie Verification Utility
 * 
 * Utility functions to verify that authentication cookies are properly set
 * and available before proceeding with redirects or authentication flows.
 */

/**
 * Verify that the auth cookie is set and valid by calling the verify API
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param retryDelay Initial delay between retries in ms (default: 200)
 * @returns Promise resolving to true if cookie is verified, false otherwise
 */
export async function verifyAuthCookie(
  maxRetries: number = 3,
  retryDelay: number = 200
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Ensure cookies are included
        cache: 'no-store', // Prevent caching
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          console.log(`✅ Cookie verified successfully (attempt ${attempt + 1}/${maxRetries})`);
          return true;
        }
      }

      // If not successful, wait before retrying (except on last attempt)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`⏳ Cookie verification failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ Cookie verification error (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ Cookie verification failed after ${maxRetries} attempts`);
  return false;
}

