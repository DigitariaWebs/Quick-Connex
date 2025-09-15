#!/usr/bin/env node

/**
 * Startup script for Patients Management System
 * This script runs before the Next.js application starts
 */

console.log('\n' + '='.repeat(70));
console.log('🏥 PATIENTS MANAGEMENT SYSTEM - STARTUP SCRIPT');
console.log('='.repeat(70));
console.log(`📅 Started at: ${new Date().toLocaleString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
console.log(`📁 Working Directory: ${process.cwd()}`);
console.log(`🖥️ Platform: ${process.platform}`);
console.log(`📦 Node Version: ${process.version}`);
console.log(`⚡ Bundler: Turbopack (Next.js 15+)`);
console.log('='.repeat(70));
console.log('🚀 Starting Next.js application with Turbopack...');
console.log('='.repeat(70) + '\n');

// Set environment variables for logging
process.env.STARTUP_TIME = new Date().toISOString();
process.env.STARTUP_SCRIPT = 'true';

// Log when the script exits
process.on('exit', (code) => {
    console.log(`\n📤 Startup script exiting with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Startup script interrupted');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Startup script terminated');
    process.exit(0);
});
