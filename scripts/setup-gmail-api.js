/**
 * Gmail API Setup Script
 * 
 * This script helps you set up Gmail API authentication
 * and test the Gmail API email sending functionality.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Check Gmail API configuration
 */
function checkGmailAPIConfig() {
    console.log('🔧 Gmail API Configuration Check:');
    console.log('  - GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('  - GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('  - GMAIL_ACCESS_TOKEN:', process.env.GMAIL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  - GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Missing');
    console.log('  - EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER || '❌ Missing');
    console.log('');

    const missing = [];
    if (!process.env.GMAIL_CLIENT_ID) missing.push('GMAIL_CLIENT_ID');
    if (!process.env.GMAIL_CLIENT_SECRET) missing.push('GMAIL_CLIENT_SECRET');
    if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');

    if (missing.length > 0) {
        console.log('❌ Missing required configuration:');
        missing.forEach(config => console.log(`   - ${config}`));
        console.log('');
        return false;
    }

    return true;
}

/**
 * Generate OAuth2 authorization URL
 */
async function generateAuthUrl() {
    console.log('🔐 Generating Gmail OAuth2 authorization URL...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/gmail`);
        const result = await response.json();

        if (response.ok) {
            console.log('✅ Authorization URL generated successfully!');
            console.log('');
            console.log('📋 Next Steps:');
            console.log('1. Visit this URL to authorize Gmail API access:');
            console.log(`   ${result.data.authUrl}`);
            console.log('');
            console.log('2. After authorization, you will be redirected to a page with tokens');
            console.log('3. Copy the tokens and add them to your .env.local file:');
            console.log('   GMAIL_ACCESS_TOKEN=your-access-token');
            console.log('   GMAIL_REFRESH_TOKEN=your-refresh-token');
            console.log('');
            console.log('4. Set EMAIL_PROVIDER=gmail-api in your .env.local file');
            console.log('5. Run this script again to test email sending');
        } else {
            console.log('❌ Failed to generate authorization URL:', result.error);
        }
    } catch (error) {
        console.error('❌ Error generating authorization URL:', error.message);
    }
}

/**
 * Test Gmail API email sending
 */
async function testGmailAPIEmail() {
    console.log('🧪 Testing Gmail API Email Sending...');

    const recipientEmail = process.argv[2] || 'test@example.com';

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await getAuthCookie(),
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: recipientEmail,
                    name: 'Test User',
                },
                content: {
                    subject: 'Test Email via Gmail API',
                    text: 'This is a test email sent via Gmail API to verify the integration is working correctly.',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>✅ Gmail API Test</h2>
              <p>This is a test email sent via Gmail API to verify the integration is working correctly.</p>
              <p><strong>Provider:</strong> Gmail API</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <hr>
              <p><small>This is an automated test message.</small></p>
            </div>
          `,
                },
                metadata: {
                    category: 'test',
                    source: 'gmail-api-setup-script',
                },
                priority: 'medium',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Gmail API email sent successfully!');
            console.log('📧 Message ID:', result.data.messageId);
            console.log('📊 Status:', result.data.status);
            console.log('💰 Cost:', result.data.cost, result.data.currency);
            if (result.data.providerId) {
                console.log('🔗 Provider ID:', result.data.providerId);
            }
            console.log('');
            console.log(`📋 Check ${recipientEmail} inbox for the test email`);
        } else {
            console.log('❌ Gmail API email sending failed:', result.error);
            if (result.details) {
                console.log('📋 Details:', result.details);
            }
        }
    } catch (error) {
        console.error('❌ Gmail API test error:', error.message);
    }
}

/**
 * Get authentication cookie (simplified)
 */
async function getAuthCookie() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'manager@test.com',
                password: 'TestPassword123!',
            }),
        });

        if (response.ok) {
            const cookies = response.headers.get('set-cookie');
            return cookies;
        }
    } catch (error) {
        console.error('❌ Authentication error:', error.message);
    }
    return null;
}

/**
 * Main setup function
 */
async function setupGmailAPI() {
    console.log('🚀 Gmail API Setup Script\n');

    // Check configuration
    const configValid = checkGmailAPIConfig();

    if (!configValid) {
        console.log('📋 Setup Instructions:');
        console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
        console.log('2. Create a new project or select existing one');
        console.log('3. Enable Gmail API in the API Library');
        console.log('4. Go to "APIs & Services" → "Credentials"');
        console.log('5. Create OAuth 2.0 Client ID credentials');
        console.log('6. Add the following to your .env.local file:');
        console.log('   GMAIL_CLIENT_ID=your-client-id');
        console.log('   GMAIL_CLIENT_SECRET=your-client-secret');
        console.log('   EMAIL_FROM=your-gmail@gmail.com');
        console.log('   EMAIL_PROVIDER=gmail-api');
        console.log('');
        console.log('7. Run this script again to generate authorization URL');
        return;
    }

    // Check if we have tokens
    if (!process.env.GMAIL_ACCESS_TOKEN || !process.env.GMAIL_REFRESH_TOKEN) {
        console.log('🔐 Gmail API tokens not found. Generating authorization URL...');
        await generateAuthUrl();
        return;
    }

    // Check if provider is set correctly
    if (process.env.EMAIL_PROVIDER !== 'gmail-api') {
        console.log('⚠️  EMAIL_PROVIDER is not set to "gmail-api"');
        console.log('   Please set EMAIL_PROVIDER=gmail-api in your .env.local file');
        console.log('');
    }

    // Test email sending
    console.log('✅ Gmail API configuration looks good!');
    console.log('🧪 Testing email sending...\n');

    await testGmailAPIEmail();

    console.log('🎉 Gmail API setup completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Verify the test email was received');
    console.log('2. Set up webhooks for delivery tracking (optional)');
    console.log('3. Configure production settings');
    console.log('4. Monitor usage and quotas');
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupGmailAPI().catch(console.error);
}

module.exports = {
    checkGmailAPIConfig,
    generateAuthUrl,
    testGmailAPIEmail,
    setupGmailAPI,
};
