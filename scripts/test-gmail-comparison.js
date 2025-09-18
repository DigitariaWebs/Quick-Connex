/**
 * Gmail API vs Gmail SMTP Comparison Test
 * 
 * This script tests both Gmail API and Gmail SMTP implementations
 * to help you decide which approach works best for your needs.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Test Gmail API implementation
 */
async function testGmailAPI(recipientEmail) {
    console.log('🧪 Testing Gmail API Implementation');
    console.log('===================================');

    // Check if Gmail API is configured
    if (!process.env.GMAIL_ACCESS_TOKEN || !process.env.GMAIL_REFRESH_TOKEN) {
        console.log('❌ Gmail API not configured - missing tokens');
        console.log('   Run: node scripts/complete-gmail-oauth.js');
        return false;
    }

    try {
        // Get authentication cookie
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'manager@test.com',
                password: 'TestPassword123!',
            }),
        });

        if (!loginResponse.ok) {
            console.log('❌ Authentication failed');
            return false;
        }

        const authCookie = loginResponse.headers.get('set-cookie');

        // Test Gmail API email sending
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookie,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: recipientEmail,
                    name: 'Gmail API Test User',
                },
                content: {
                    subject: 'Gmail API Test - OAuth 2.0 Implementation 🚀',
                    text: `This email was sent using Gmail API with OAuth 2.0 authentication.

Features:
✅ OAuth 2.0 authentication
✅ High rate limits (1 billion/day)
✅ Delivery tracking
✅ Google's infrastructure
✅ Industry-standard security

Test completed at: ${new Date().toISOString()}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #4285f4 0%, #34a853 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🚀 Gmail API Test</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">OAuth 2.0 Implementation</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #4285f4; margin-top: 0;">Gmail API Features:</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285f4;">
                  <h3 style="margin-top: 0; color: #333;">✅ Advantages:</h3>
                  <ul style="color: #666;">
                    <li><strong>OAuth 2.0 authentication</strong> - Industry standard security</li>
                    <li><strong>High rate limits</strong> - 1 billion emails per day</li>
                    <li><strong>Delivery tracking</strong> - Full message status tracking</li>
                    <li><strong>Google's infrastructure</strong> - Reliable and scalable</li>
                    <li><strong>Quota management</strong> - Built-in usage monitoring</li>
                  </ul>
                </div>
                
                <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1976d2;">
                    <strong>Test completed at:</strong> ${new Date().toISOString()}
                  </p>
                </div>
              </div>
            </div>
          `,
                },
                metadata: {
                    category: 'gmail-api-test',
                    source: 'gmail-api-comparison',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Gmail API: SUCCESS');
            console.log(`   Message ID: ${result.data.messageId}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Provider ID: ${result.data.providerId}`);
            return true;
        } else {
            console.log('❌ Gmail API: FAILED');
            console.log(`   Error: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Gmail API: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test Gmail SMTP implementation
 */
async function testGmailSMTP(recipientEmail) {
    console.log('\n🧪 Testing Gmail SMTP Implementation');
    console.log('====================================');

    // Check if Gmail SMTP is configured
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
        console.log('❌ Gmail SMTP not configured - missing email or app password');
        console.log('   Add GMAIL_EMAIL and GMAIL_APP_PASSWORD to .env.local');
        return false;
    }

    try {
        // Get authentication cookie
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'manager@test.com',
                password: 'TestPassword123!',
            }),
        });

        if (!loginResponse.ok) {
            console.log('❌ Authentication failed');
            return false;
        }

        const authCookie = loginResponse.headers.get('set-cookie');

        // Test Gmail SMTP email sending
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookie,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: recipientEmail,
                    name: 'Gmail SMTP Test User',
                },
                content: {
                    subject: 'Gmail SMTP Test - Nodemailer Implementation 📧',
                    text: `This email was sent using Gmail SMTP with Nodemailer.

Features:
✅ App password authentication
✅ Simple setup process
✅ Standard SMTP protocol
✅ Nodemailer library
✅ Free Gmail SMTP service

Test completed at: ${new Date().toISOString()}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ea4335 0%, #fbbc04 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">📧 Gmail SMTP Test</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Nodemailer Implementation</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #ea4335; margin-top: 0;">Gmail SMTP Features:</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea4335;">
                  <h3 style="margin-top: 0; color: #333;">✅ Advantages:</h3>
                  <ul style="color: #666;">
                    <li><strong>Simple setup</strong> - Just need app password</li>
                    <li><strong>Standard SMTP</strong> - Works with any SMTP client</li>
                    <li><strong>Nodemailer library</strong> - Popular Node.js email library</li>
                    <li><strong>Free service</strong> - Gmail SMTP is free</li>
                    <li><strong>Easy debugging</strong> - Standard SMTP logs</li>
                  </ul>
                </div>
                
                <div style="background: #fce8e6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #d93025;">
                    <strong>Test completed at:</strong> ${new Date().toISOString()}
                  </p>
                </div>
              </div>
            </div>
          `,
                },
                metadata: {
                    category: 'gmail-smtp-test',
                    source: 'gmail-smtp-comparison',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Gmail SMTP: SUCCESS');
            console.log(`   Message ID: ${result.data.messageId}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Provider ID: ${result.data.providerId}`);
            return true;
        } else {
            console.log('❌ Gmail SMTP: FAILED');
            console.log(`   Error: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Gmail SMTP: ERROR');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Compare both implementations
 */
function compareImplementations(gmailApiSuccess, gmailSmtpSuccess) {
    console.log('\n📊 Implementation Comparison');
    console.log('============================');

    console.log('\n🔍 Test Results:');
    console.log(`   Gmail API: ${gmailApiSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Gmail SMTP: ${gmailSmtpSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

    console.log('\n📋 Feature Comparison:');
    console.log('┌─────────────────┬─────────────┬─────────────┐');
    console.log('│ Feature         │ Gmail API   │ Gmail SMTP  │');
    console.log('├─────────────────┼─────────────┼─────────────┤');
    console.log('│ Authentication  │ OAuth 2.0   │ App Password│');
    console.log('│ Setup Complexity│ Complex     │ Simple      │');
    console.log('│ Rate Limits     │ 1B/day      │ 500/day     │');
    console.log('│ Delivery Track  │ ✅ Full     │ ❌ Limited  │');
    console.log('│ Security        │ ✅ High     │ ⚠️  Medium  │');
    console.log('│ Reliability     │ ✅ High     │ ✅ High     │');
    console.log('│ Cost            │ Free        │ Free        │');
    console.log('│ Debugging       │ ⚠️  Complex │ ✅ Simple  │');
    console.log('└─────────────────┴─────────────┴─────────────┘');

    console.log('\n🎯 Recommendations:');

    if (gmailApiSuccess && gmailSmtpSuccess) {
        console.log('✅ Both implementations work! Choose based on your needs:');
        console.log('   • Use Gmail API for production (better security, tracking)');
        console.log('   • Use Gmail SMTP for development (simpler setup)');
    } else if (gmailApiSuccess) {
        console.log('✅ Gmail API works! Recommended for production use.');
        console.log('   • Better security with OAuth 2.0');
        console.log('   • Higher rate limits');
        console.log('   • Full delivery tracking');
    } else if (gmailSmtpSuccess) {
        console.log('✅ Gmail SMTP works! Good for development and simple use cases.');
        console.log('   • Simpler setup with app password');
        console.log('   • Standard SMTP protocol');
        console.log('   • Easy to debug');
    } else {
        console.log('❌ Both implementations failed. Check your configuration.');
        console.log('   • Verify Gmail API OAuth setup');
        console.log('   • Verify Gmail SMTP app password');
        console.log('   • Check environment variables');
    }
}

/**
 * Main comparison function
 */
async function runGmailComparison() {
    const recipientEmail = process.argv[2] || 'test@example.com';

    console.log('🚀 Gmail API vs Gmail SMTP Comparison Test');
    console.log('==========================================\n');
    console.log(`📧 Testing with recipient: ${recipientEmail}\n`);

    // Test Gmail API
    const gmailApiSuccess = await testGmailAPI(recipientEmail);

    // Test Gmail SMTP
    const gmailSmtpSuccess = await testGmailSMTP(recipientEmail);

    // Compare implementations
    compareImplementations(gmailApiSuccess, gmailSmtpSuccess);

    console.log('\n📚 Next Steps:');
    if (gmailApiSuccess || gmailSmtpSuccess) {
        console.log('1. Check your email inbox for test messages');
        console.log('2. Choose the implementation that works best for you');
        console.log('3. Update EMAIL_PROVIDER in .env.local');
        console.log('4. Run integrity tests: node scripts/test-gmail-api-integrity.js');
    } else {
        console.log('1. Fix the configuration issues above');
        console.log('2. Re-run this comparison test');
        console.log('3. Check the setup documentation');
    }
}

// Run if this script is executed directly
if (require.main === module) {
    runGmailComparison().catch(console.error);
}

module.exports = {
    testGmailAPI,
    testGmailSMTP,
    compareImplementations,
    runGmailComparison,
};


