/**
 * Gmail SMTP Setup Verification Script
 * 
 * This script helps verify that your Gmail SMTP setup is correct
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Gmail SMTP Setup Verification\n');

// Check required environment variables
const requiredVars = [
    'EMAIL_PROVIDER',
    'GMAIL_EMAIL',
    'GMAIL_APP_PASSWORD',
    'EMAIL_FROM',
    'ADMIN_EMAIL'
];

console.log('📋 Checking Environment Variables:');
let allVarsSet = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== `your-${varName.toLowerCase().replace(/_/g, '-')}`) {
        console.log(`✅ ${varName}: ${varName.includes('PASSWORD') ? '***SET***' : value}`);
    } else {
        console.log(`❌ ${varName}: ${value || 'NOT SET'}`);
        allVarsSet = false;
    }
});

console.log('\n🔧 Configuration Check:');
console.log(`Email Provider: ${process.env.EMAIL_PROVIDER}`);
console.log(`Communication Enabled: ${process.env.COMMUNICATION_ENABLED}`);
console.log(`Email Enabled: ${process.env.EMAIL_ENABLED}`);

if (allVarsSet) {
    console.log('\n✅ All environment variables are properly configured!');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: node scripts/test-gmail-smtp-simple.js');
    console.log('2. Run: node scripts/test-gmail-signup-approval.js test@example.com');
} else {
    console.log('\n❌ Please update your .env.local file with real Gmail credentials');
    console.log('\n📝 Required updates:');
    console.log('- GMAIL_EMAIL: Your actual Gmail address');
    console.log('- GMAIL_APP_PASSWORD: Your 16-character app password');
    console.log('- EMAIL_FROM: Your actual Gmail address');
    console.log('- ADMIN_EMAIL: Email address to receive approval requests');
}

console.log('\n📚 Gmail SMTP Setup Guide:');
console.log('1. Enable 2-Factor Authentication on your Gmail account');
console.log('2. Generate an App Password for "Mail"');
console.log('3. Update .env.local with your credentials');
console.log('4. Test the connection');
