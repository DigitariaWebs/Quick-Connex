/**
 * Startup logging utility for the Patients Management System
 */

import { logBuildTimeEnvVars } from './build-time-env';

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
  
  // Log environment file access information
  console.log('\n📋 ENVIRONMENT FILE STATUS:');
  console.log('─'.repeat(40));
  
  // Skip filesystem checks in Vercel environment
  if (process.env.VERCEL) {
    console.log('🌐 Vercel Environment - Skipping filesystem checks');
  } else {
    // Check for environment files that Vercel/Next.js might try to access
    const fs = require('fs');
    const path = require('path');
    
    const envFiles = [
      '.env',
      '.env.local', 
      '.env.development',
      '.env.production',
      '.env.test',
      '.env.vercel'
    ];
    
    const workingDir = process.cwd();
    console.log(`🔍 Working directory: ${workingDir}`);
    
    envFiles.forEach(file => {
      const fullPath = path.join(workingDir, file);
      const exists = fs.existsSync(fullPath);
      console.log(`${exists ? '✅' : '❌'} ${file}`);
    });
  }
  
  // Log critical environment variables status
  console.log('\n🔑 CRITICAL ENVIRONMENT VARIABLES:');
  console.log('─'.repeat(40));
  
  // Client-side variables (available at build time)
  const clientSideVars = [
    'NEXT_PUBLIC_SOCKET_URL',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  // Server-side variables (only available at runtime)
  const serverSideVars = [
    'MONGODB_URI',
    'JWT_SECRET_KEY', 
    'BASE_URL',
    'EMAIL_FROM',
    'ADMIN_EMAIL'
  ];
  
  console.log('📱 CLIENT-SIDE VARIABLES (Build Time):');
  clientSideVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'Missing';
    console.log(`   ${status} ${varName}: ${displayValue}`);
  });
  
  console.log('\n🖥️ SERVER-SIDE VARIABLES (Runtime Only):');
  serverSideVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (value.length > 30 ? value.substring(0, 30) + '...' : value) : 'Missing';
    console.log(`   ${status} ${varName}: ${displayValue}`);
    
    // Add explanation for missing server-side variables
    if (!value) {
      console.log(`   ℹ️  Note: ${varName} is only available at runtime, not build time`);
    }
  });
  
  console.log('='.repeat(60));
  
  // Log build-time environment variables
  logBuildTimeEnvVars();
  
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
