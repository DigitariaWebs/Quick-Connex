/**
 * Complete Gmail OAuth Flow Script
 * 
 * This script completes the Gmail OAuth flow and saves the tokens
 * to the .env.local file for immediate use.
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Get authentication cookie using provided credentials
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
            const setCookieHeader = response.headers.get('set-cookie');
            if (setCookieHeader) {
                console.log('✅ Authentication successful');
                return setCookieHeader;
            }
        }

        const result = await response.json();
        console.log('❌ Authentication failed:', result.error || 'Unknown error');
        return null;
    } catch (error) {
        console.log('❌ Authentication error:', error.message);
        return null;
    }
}

/**
 * Get OAuth authorization URL
 */
async function getAuthUrl() {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/gmail`);
        const result = await response.json();

        if (result.success && result.data?.authUrl) {
            console.log('✅ OAuth URL generated successfully');
            return result.data.authUrl;
        } else {
            console.log('❌ Failed to generate OAuth URL:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ Error getting OAuth URL:', error.message);
        return null;
    }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
    try {
        const response = await fetch(`${BASE_URL}/api/auth/gmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const result = await response.json();

        if (result.success && result.data?.tokens) {
            console.log('✅ Tokens received successfully');
            console.log(`   Email: ${result.data.email}`);
            console.log(`   Access Token: ${result.data.tokens.access_token.substring(0, 20)}...`);
            console.log(`   Refresh Token: ${result.data.tokens.refresh_token.substring(0, 20)}...`);
            return result.data.tokens;
        } else {
            console.log('❌ Failed to exchange code for tokens:', result.error);
            return null;
        }
    } catch (error) {
        console.log('❌ Error exchanging code for tokens:', error.message);
        return null;
    }
}

/**
 * Save tokens to .env.local file
 */
function saveTokensToEnv(tokens) {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Remove existing token entries
        envContent = envContent.replace(/^GMAIL_ACCESS_TOKEN=.*$/m, '');
        envContent = envContent.replace(/^GMAIL_REFRESH_TOKEN=.*$/m, '');

        // Add new token entries
        envContent += `\nGMAIL_ACCESS_TOKEN=${tokens.access_token}`;
        envContent += `\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}`;

        // Clean up extra newlines
        envContent = envContent.replace(/\n\n+/g, '\n\n');

        fs.writeFileSync(envPath, envContent);
        console.log('✅ Tokens saved to .env.local file');
        return true;
    } catch (error) {
        console.log('❌ Error saving tokens:', error.message);
        return false;
    }
}

/**
 * Test email sending with new tokens
 */
async function testEmailSending(recipientEmail) {
    console.log(`\n📧 Testing email sending to: ${recipientEmail}`);

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
                    name: 'Gmail API Test User',
                },
                content: {
                    subject: 'Gmail API OAuth Test - SUCCESS! 🎉',
                    text: `Congratulations! Your Gmail API OAuth flow is working correctly.

This email was sent using:
- Gmail API with OAuth 2.0 authentication
- Access token: ${process.env.GMAIL_ACCESS_TOKEN?.substring(0, 20)}...
- Refresh token: ${process.env.GMAIL_REFRESH_TOKEN?.substring(0, 20)}...

Test completed at: ${new Date().toISOString()}

Your Gmail API integration is now fully functional! 🚀`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Gmail API OAuth Test - SUCCESS!</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #28a745; margin-top: 0;">Congratulations!</h2>
                <p style="font-size: 16px; line-height: 1.6;">Your Gmail API OAuth flow is working correctly.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                  <h3 style="margin-top: 0; color: #333;">✅ What's Working:</h3>
                  <ul style="color: #666;">
                    <li>Gmail API with OAuth 2.0 authentication</li>
                    <li>Access token: <code>${process.env.GMAIL_ACCESS_TOKEN?.substring(0, 20)}...</code></li>
                    <li>Refresh token: <code>${process.env.GMAIL_REFRESH_TOKEN?.substring(0, 20)}...</code></li>
                    <li>Email sending functionality</li>
                  </ul>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1976d2;">
                    <strong>Test completed at:</strong> ${new Date().toISOString()}
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <h3 style="color: #28a745; margin: 0;">🚀 Your Gmail API integration is now fully functional!</h3>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
                <p>This is an automated test message from your Gmail API integration.</p>
              </div>
            </div>
          `,
                },
                metadata: {
                    category: 'oauth-test',
                    source: 'gmail-api-oauth-completion',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email sent successfully!');
            console.log(`   Message ID: ${result.data.messageId}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Provider ID: ${result.data.providerId}`);
            return true;
        } else {
            console.log('❌ Email sending failed:', result.error);
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
            return false;
        }
    } catch (error) {
        console.log('❌ Email sending error:', error.message);
        return false;
    }
}

/**
 * Main OAuth completion flow
 */
async function completeGmailOAuth() {
    console.log('🚀 Gmail API OAuth Completion Script');
    console.log('====================================\n');

    // Step 1: Get OAuth URL
    console.log('📋 Step 1: Getting OAuth authorization URL...');
    const authUrl = await getAuthUrl();
    if (!authUrl) {
        console.log('❌ Cannot proceed without OAuth URL');
        return;
    }

    console.log('\n🔐 OAuth Authorization Required');
    console.log('===============================');
    console.log('Please follow these steps:');
    console.log('1. Open this URL in your browser:');
    console.log(`   ${authUrl}`);
    console.log('\n2. Sign in with your Google account');
    console.log('3. Grant permission for Gmail API access');
    console.log('4. Copy the authorization code from the callback URL');
    console.log('\nThe callback URL will look like:');
    console.log('http://localhost:3000/api/auth/gmail/callback?code=4/0AX4XfWh...');
    console.log('\nCopy the code parameter value (everything after "code=")');

    // For automated testing, we'll simulate the OAuth flow
    // In a real scenario, the user would complete this manually
    console.log('\n⚠️  For automated testing, we need the authorization code.');
    console.log('Please complete the OAuth flow manually and provide the code.');

    // We'll wait for user input in a real scenario
    // For now, let's check if tokens are already available
    if (process.env.GMAIL_ACCESS_TOKEN && process.env.GMAIL_REFRESH_TOKEN) {
        console.log('\n✅ Tokens already available in environment');
        console.log('Testing email sending...');

        const recipientEmail = process.argv[2] || 'test@example.com';
        await testEmailSending(recipientEmail);
    } else {
        console.log('\n❌ No tokens available. Please complete OAuth flow manually.');
        console.log('\n📚 Manual Steps:');
        console.log('1. Visit the OAuth URL above');
        console.log('2. Complete authorization');
        console.log('3. Copy the authorization code');
        console.log('4. Run: node scripts/exchange-gmail-code.js YOUR_CODE');
    }
}

// Run if this script is executed directly
if (require.main === module) {
    completeGmailOAuth().catch(console.error);
}

module.exports = {
    getAuthCookie,
    getAuthUrl,
    exchangeCodeForTokens,
    saveTokensToEnv,
    testEmailSending,
    completeGmailOAuth,
};
