/**
 * Turbopack-compatible logging system for Next.js 15+
 * Since Turbopack doesn't use webpack hooks, we use different approaches
 */

let isFirstCompile = true;
let compilationStartTime = 0;

export function logTurbopackStart() {
  compilationStartTime = Date.now();
  console.log('\n⚡ TURBOPACK COMPILATION STARTED');
  console.log('─'.repeat(50));
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Bundler: Turbopack`);
  console.log('─'.repeat(50));
}

export function logTurbopackComplete(success: boolean = true, duration?: number) {
  const endTime = Date.now();
  const actualDuration = duration || (endTime - compilationStartTime);
  
  console.log('─'.repeat(50));
  if (success) {
    console.log('✅ TURBOPACK COMPILATION COMPLETED SUCCESSFULLY');
  } else {
    console.log('❌ TURBOPACK COMPILATION FAILED');
  }
  console.log(`⏱️ Duration: ${actualDuration}ms`);
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(50) + '\n');
  
  if (isFirstCompile) {
    console.log('🎉 Turbopack: First compilation completed - app is ready!');
    isFirstCompile = false;
  } else {
    console.log('🔄 Turbopack: Hot reload compilation completed');
  }
}

export function logTurbopackError(error: any) {
  console.log('─'.repeat(50));
  console.log('❌ TURBOPACK COMPILATION ERROR');
  console.log(`📋 Error: ${error.message || error}`);
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(50) + '\n');
}

export function logTurbopackWarning(warning: string) {
  console.log('─'.repeat(50));
  console.log('⚠️ TURBOPACK WARNING');
  console.log(`📋 Warning: ${warning}`);
  console.log(`🕐 Time: ${new Date().toLocaleString()}`);
  console.log('─'.repeat(50) + '\n');
}

// Log when the module is loaded
console.log('🔧 TurbopackLogger: Module loaded and ready');
