/**
 * Runtime Environment Variables Checker
 * This runs when the app actually starts (runtime), not during build
 */

export function checkRuntimeEnvironmentVariables() {
  console.log('\n🔍 RUNTIME ENVIRONMENT VARIABLES CHECK:');
  console.log('─'.repeat(60));
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🚀 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  console.log(`🔗 VERCEL_URL: ${process.env.VERCEL_URL}`);
  
  // Server-side variables that should be available at runtime
  const serverSideVars = [
    'MONGODB_URI',
    'JWT_SECRET_KEY',
    'BASE_URL',
    'EMAIL_FROM',
    'ADMIN_EMAIL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'GMAIL_EMAIL',
    'GMAIL_APP_PASSWORD'
  ];
  
  console.log('\n🖥️ SERVER-SIDE VARIABLES (Runtime Check):');
  let allServerVarsPresent = true;
  
  serverSideVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'Missing';
    console.log(`   ${status} ${varName}: ${displayValue}`);
    
    if (!value) {
      allServerVarsPresent = false;
    }
  });
  
  // Client-side variables
  const clientSideVars = [
    'NEXT_PUBLIC_SOCKET_URL',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  console.log('\n📱 CLIENT-SIDE VARIABLES (Runtime Check):');
  let allClientVarsPresent = true;
  
  clientSideVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'Missing';
    console.log(`   ${status} ${varName}: ${displayValue}`);
    
    if (!value) {
      allClientVarsPresent = false;
    }
  });
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('─'.repeat(40));
  console.log(`🖥️ Server-side variables: ${allServerVarsPresent ? '✅ All present' : '❌ Some missing'}`);
  console.log(`📱 Client-side variables: ${allClientVarsPresent ? '✅ All present' : '❌ Some missing'}`);
  
  if (!allServerVarsPresent || !allClientVarsPresent) {
    console.log('\n⚠️ WARNING: Some environment variables are missing!');
    console.log('   Make sure all variables are set in Vercel dashboard:');
    console.log('   https://vercel.com/your-project/settings/environment-variables');
  } else {
    console.log('\n🎉 All environment variables are properly configured!');
  }
  
  console.log('─'.repeat(60));
  
  return {
    allServerVarsPresent,
    allClientVarsPresent,
    serverSideVars: serverSideVars.map(name => ({ name, present: !!process.env[name] })),
    clientSideVars: clientSideVars.map(name => ({ name, present: !!process.env[name] }))
  };
}

/**
 * Check if we're in a Vercel environment
 */
export function isVercelEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Get environment type
 */
export function getEnvironmentType(): string {
  if (process.env.VERCEL_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'preview') return 'preview';
  if (process.env.NODE_ENV === 'development') return 'development';
  return 'unknown';
}
