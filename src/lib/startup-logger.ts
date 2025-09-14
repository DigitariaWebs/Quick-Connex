/**
 * Startup logging utility for the Patients Management System
 */

export function logApplicationStartup() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏥 PATIENTS MANAGEMENT SYSTEM');
  console.log('='.repeat(60));
  console.log(`🚀 Starting application...`);
  console.log(`📅 Start time: ${new Date().toLocaleString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🏗️ Build ID: ${process.env.BUILD_ID || 'Not available'}`);
  console.log(`🕐 Build Time: ${process.env.BUILD_TIME || 'Not available'}`);
  console.log('='.repeat(60));
  
  // Log when compilation is complete
  setTimeout(() => {
    const endTime = Date.now();
    const startupDuration = endTime - startTime;
    console.log(`⚡ Application startup completed in ${startupDuration}ms`);
    console.log('🎉 Ready to accept requests!');
    console.log('='.repeat(60) + '\n');
  }, 1000);
}

export function logCompilationStart() {
  console.log('\n🔨 COMPILATION STARTED');
  console.log('─'.repeat(40));
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('─'.repeat(40));
}

export function logCompilationComplete(success: boolean, duration?: number) {
  console.log('─'.repeat(40));
  if (success) {
    console.log('✅ COMPILATION COMPLETED SUCCESSFULLY');
  } else {
    console.log('❌ COMPILATION FAILED');
  }
  if (duration) {
    console.log(`⏱️ Duration: ${duration}ms`);
  }
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(40) + '\n');
}
