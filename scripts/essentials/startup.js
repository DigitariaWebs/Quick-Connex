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

// Log environment file access attempts
console.log('\n📋 ENVIRONMENT FILE ACCESS LOGGING:');
console.log('─'.repeat(50));

// Check for common environment file patterns
const fs = require('fs');
const path = require('path');

const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    '.env.vercel',
    'env.local.backup'
];

const workingDir = process.cwd();
console.log(`🔍 Checking for environment files in: ${workingDir}`);

envFiles.forEach(file => {
    const fullPath = path.join(workingDir, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file} - ${exists ? 'Found' : 'Not found'}`);

    if (exists) {
        try {
            const stats = fs.statSync(fullPath);
            console.log(`   📊 Size: ${stats.size} bytes, Modified: ${stats.mtime.toLocaleString()}`);
        } catch (err) {
            console.log(`   ⚠️ Could not read file stats: ${err.message}`);
        }
    }
});

// Log Vercel-specific environment variables
console.log('\n🌐 VERCEL ENVIRONMENT VARIABLES:');
console.log('─'.repeat(50));
const vercelVars = Object.keys(process.env).filter(key => key.startsWith('VERCEL_'));
console.log(`🔍 Found ${vercelVars.length} Vercel environment variables:`);
vercelVars.forEach(varName => {
    const value = process.env[varName];
    const displayValue = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`   ${varName}: ${displayValue}`);
});

// Log Next.js environment variables
console.log('\n⚛️ NEXT.JS ENVIRONMENT VARIABLES:');
console.log('─'.repeat(50));
const nextVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_'));
console.log(`🔍 Found ${nextVars.length} Next.js environment variables:`);
nextVars.forEach(varName => {
    const value = process.env[varName];
    const displayValue = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`   ${varName}: ${displayValue}`);
});

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
