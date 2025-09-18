/**
 * Test script to check email configuration
 */

console.log('🔍 Checking Email Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || 'not set (defaults to nodemailer)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || 'not set');
console.log('GMAIL_EMAIL:', process.env.GMAIL_EMAIL || 'not set');
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***set***' : 'not set');
console.log('COMMUNICATION_ENABLED:', process.env.COMMUNICATION_ENABLED || 'not set');
console.log('EMAIL_ENABLED:', process.env.EMAIL_ENABLED || 'not set');

console.log('\n📋 Recommended Configuration for Gmail SMTP:');
console.log('EMAIL_PROVIDER=gmail-smtp');
console.log('GMAIL_EMAIL=your-email@gmail.com');
console.log('GMAIL_APP_PASSWORD=your-16-character-app-password');
console.log('EMAIL_FROM=your-email@gmail.com');
console.log('EMAIL_FROM_NAME=Patient Management System');
console.log('COMMUNICATION_ENABLED=true');
console.log('EMAIL_ENABLED=true');

console.log('\n💡 To fix the email issue:');
console.log('1. Create or update your .env.local file with the above variables');
console.log('2. Make sure you have a valid Gmail app password');
console.log('3. Restart your development server (npm run dev)');
