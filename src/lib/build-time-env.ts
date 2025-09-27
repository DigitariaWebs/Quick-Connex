/**
 * Build-Time Environment Variables Loader
 * This makes server-side environment variables available at build time
 */

interface BuildTimeEnvVars {
  BASE_URL: string;
  EMAIL_FROM: string;
  ADMIN_EMAIL: string;
  MONGODB_URI: string;
  JWT_SECRET_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  GMAIL_EMAIL: string;
  GMAIL_APP_PASSWORD: string;
}

/**
 * Get build-time environment variables
 * These are available during the build process
 */
export function getBuildTimeEnvVars(): Partial<BuildTimeEnvVars> {
  return {
    BASE_URL: process.env.BASE_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    GMAIL_EMAIL: process.env.GMAIL_EMAIL,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  };
}

/**
 * Check if build-time environment variables are available
 */
export function checkBuildTimeEnvVars(): {
  available: string[];
  missing: string[];
  allPresent: boolean;
} {
  const vars = getBuildTimeEnvVars();
  const available: string[] = [];
  const missing: string[] = [];
  
  Object.entries(vars).forEach(([key, value]) => {
    if (value) {
      available.push(key);
    } else {
      missing.push(key);
    }
  });
  
  return {
    available,
    missing,
    allPresent: missing.length === 0
  };
}

/**
 * Log build-time environment variables status
 */
export function logBuildTimeEnvVars(): void {
  console.log('\n🔧 BUILD-TIME ENVIRONMENT VARIABLES:');
  console.log('─'.repeat(50));
  
  const { available, missing, allPresent } = checkBuildTimeEnvVars();
  
  console.log(`📊 Status: ${allPresent ? '✅ All present' : '❌ Some missing'}`);
  console.log(`✅ Available (${available.length}): ${available.join(', ')}`);
  
  if (missing.length > 0) {
    console.log(`❌ Missing (${missing.length}): ${missing.join(', ')}`);
    console.log('\n💡 To fix missing variables:');
    console.log('   1. Add them to Vercel dashboard');
    console.log('   2. Or use NEXT_PUBLIC_ prefix for client-side access');
    console.log('   3. Or configure them in next.config.ts');
  }
  
  console.log('─'.repeat(50));
}
