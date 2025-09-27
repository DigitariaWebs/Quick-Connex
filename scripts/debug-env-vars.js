#!/usr/bin/env node

/**
 * Environment Variables Debugging Script
 * This script helps debug environment variable issues in Vercel
 */

console.log('\n' + '='.repeat(80));
console.log('🔍 VERCEL ENVIRONMENT VARIABLES DEBUG SCRIPT');
console.log('='.repeat(80));

// Log basic environment info
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🚀 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
console.log(`🔗 VERCEL_URL: ${process.env.VERCEL_URL}`);
console.log(`📁 Working Directory: ${process.cwd()}`);

// Check for critical environment variables
console.log('\n🔑 CRITICAL ENVIRONMENT VARIABLES CHECK:');
console.log('─'.repeat(60));

const criticalVars = [
    'MONGODB_URI',
    'JWT_SECRET_KEY',
    'BASE_URL',
    'NEXT_PUBLIC_SOCKET_URL',
    'NEXT_PUBLIC_APP_URL',
    'EMAIL_FROM',
    'ADMIN_EMAIL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
];

criticalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ?
        (value.length > 50 ? value.substring(0, 50) + '...' : value) :
        'NOT SET';

    console.log(`${status} ${varName}: ${displayValue}`);

    if (value) {
        console.log(`   📊 Length: ${value.length} characters`);
        console.log(`   🔤 Type: ${typeof value}`);
    }
});

// Check for all environment variables
console.log('\n📋 ALL ENVIRONMENT VARIABLES:');
console.log('─'.repeat(60));

const allEnvVars = Object.keys(process.env).sort();
console.log(`🔍 Total environment variables: ${allEnvVars.length}`);

// Group variables by prefix
const groupedVars = {
    'VERCEL_': allEnvVars.filter(key => key.startsWith('VERCEL_')),
    'NEXT_': allEnvVars.filter(key => key.startsWith('NEXT_')),
    'MONGO': allEnvVars.filter(key => key.includes('MONGO')),
    'JWT': allEnvVars.filter(key => key.includes('JWT')),
    'EMAIL': allEnvVars.filter(key => key.includes('EMAIL')),
    'TWILIO': allEnvVars.filter(key => key.includes('TWILIO')),
    'ADMIN': allEnvVars.filter(key => key.includes('ADMIN')),
    'BASE': allEnvVars.filter(key => key.includes('BASE')),
    'SOCKET': allEnvVars.filter(key => key.includes('SOCKET'))
};

Object.entries(groupedVars).forEach(([prefix, vars]) => {
    if (vars.length > 0) {
        console.log(`\n${prefix} variables (${vars.length}):`);
        vars.forEach(varName => {
            const value = process.env[varName];
            const displayValue = value && value.length > 30 ?
                value.substring(0, 30) + '...' : value;
            console.log(`   ${varName}: ${displayValue}`);
        });
    }
});

// Check for potential issues
console.log('\n⚠️ POTENTIAL ISSUES CHECK:');
console.log('─'.repeat(60));

// Check for empty values
const emptyVars = allEnvVars.filter(key => process.env[key] === '');
if (emptyVars.length > 0) {
    console.log(`❌ Empty environment variables: ${emptyVars.join(', ')}`);
}

// Check for undefined values
const undefinedVars = allEnvVars.filter(key => process.env[key] === undefined);
if (undefinedVars.length > 0) {
    console.log(`❌ Undefined environment variables: ${undefinedVars.join(', ')}`);
}

// Check for variables with spaces
const spaceVars = allEnvVars.filter(key => key.includes(' ') || (process.env[key] && process.env[key].includes(' ')));
if (spaceVars.length > 0) {
    console.log(`⚠️ Variables with spaces: ${spaceVars.join(', ')}`);
}

// Check for very long values
const longVars = allEnvVars.filter(key => process.env[key] && process.env[key].length > 1000);
if (longVars.length > 0) {
    console.log(`⚠️ Very long environment variables: ${longVars.join(', ')}`);
}

console.log('\n' + '='.repeat(80));
console.log('🎯 DEBUGGING COMPLETE');
console.log('='.repeat(80));

// Export for use in other scripts
module.exports = {
    criticalVars,
    allEnvVars,
    groupedVars
};
