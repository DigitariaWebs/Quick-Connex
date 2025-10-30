#!/usr/bin/env node

/**
 * VAPID Key Generator
 * 
 * Generates VAPID keys for Web Push notifications.
 * Run this script to generate keys for your environment.
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// ===== VAPID KEY GENERATION =====

function generateVAPIDKeys() {
    try {
        console.log('🔑 Generating VAPID keys for Web Push...');

        const vapidKeys = webpush.generateVAPIDKeys();

        console.log('\n✅ VAPID Keys Generated Successfully!');
        console.log('='.repeat(50));
        console.log('📋 Add these to your .env.local file:');
        console.log('='.repeat(50));
        console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
        console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
        console.log(`VAPID_EMAIL=mailto:admin@your-domain.com`);
        console.log('='.repeat(50));

        // Save to file
        const envContent = `# VAPID Keys for Web Push Notifications
# Generated on ${new Date().toISOString()}

VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:admin@your-domain.com

# Web Push Configuration
ENABLE_WEB_PUSH=true
ENABLE_PRESENCE=true
ENABLE_ANALYTICS=true
ENABLE_RATE_LIMITING=true
`;

        const envPath = path.join(process.cwd(), '.env.local');

        // Check if .env.local exists
        if (fs.existsSync(envPath)) {
            console.log('\n⚠️  .env.local already exists. Please add the VAPID keys manually.');
            console.log('📄 Keys have been saved to vapid-keys.txt for reference.');

            fs.writeFileSync('vapid-keys.txt', envContent);
        } else {
            fs.writeFileSync(envPath, envContent);
            console.log('\n✅ Keys have been added to .env.local');
        }

        console.log('\n🚀 Next Steps:');
        console.log('1. Update VAPID_EMAIL with your actual email');
        console.log('2. Restart your development server');
        console.log('3. Test Web Push notifications in your browser');

    } catch (error) {
        console.error('❌ Failed to generate VAPID keys:', error);
        process.exit(1);
    }
}

// ===== VALIDATION =====

function validateKeys() {
    try {
        console.log('🔍 Validating VAPID keys...');

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const email = process.env.VAPID_EMAIL;

        if (!publicKey || !privateKey || !email) {
            console.error('❌ VAPID keys not found in environment variables');
            console.log('💡 Run: npm run generate-vapid-keys');
            process.exit(1);
        }

        if (!email.startsWith('mailto:')) {
            console.error('❌ VAPID_EMAIL must start with "mailto:"');
            process.exit(1);
        }

        // Test key format
        try {
            webpush.setVapidDetails(email, publicKey, privateKey);
            console.log('✅ VAPID keys are valid');
        } catch (error) {
            console.error('❌ Invalid VAPID key format:', error.message);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

// ===== MAIN EXECUTION =====

const command = process.argv[2];

switch (command) {
    case 'generate':
        generateVAPIDKeys();
        break;

    case 'validate':
        validateKeys();
        break;

    default:
        console.log('🔑 VAPID Key Manager');
        console.log('='.repeat(30));
        console.log('Usage:');
        console.log('  node scripts/generate-vapid-keys.js generate  - Generate new VAPID keys');
        console.log('  node scripts/generate-vapid-keys.js validate  - Validate existing keys');
        console.log('');
        console.log('Examples:');
        console.log('  npm run generate-vapid-keys');
        console.log('  npm run validate-vapid-keys');
        break;
}
