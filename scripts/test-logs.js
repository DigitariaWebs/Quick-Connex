#!/usr/bin/env node

/**
 * Test script to verify logging is working
 */

console.log('\n🧪 TESTING LOGGING SYSTEM');
console.log('='.repeat(50));
console.log(`📅 Test started at: ${new Date().toLocaleString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
console.log('='.repeat(50));
console.log('✅ If you can see this message, logging is working!');
console.log('='.repeat(50) + '\n');

// Test different log levels
console.log('📝 Testing different log levels:');
console.log('ℹ️  Info message');
console.log('⚠️  Warning message');
console.log('❌ Error message');
console.log('✅ Success message');
console.log('🔨 Compilation message');
console.log('🚀 Startup message');
console.log('📊 Database message');
console.log('🎉 Completion message');

console.log('\n🎯 Logging test completed successfully!');
