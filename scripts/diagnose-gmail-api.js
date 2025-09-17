/**
 * Gmail API Diagnostic Script
 * 
 * This script quickly diagnoses the current state of your Gmail API setup
 * and provides specific guidance on what needs to be fixed.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Quick diagnostic check
 */
async function diagnoseGmailAPI() {
    console.log('🔍 Gmail API System Diagnostic');
    console.log('===============================\n');

    // Check 1: Environment Configuration
    console.log('📋 1. Environment Configuration:');
    const configIssues = [];

    if (!process.env.GMAIL_CLIENT_ID) {
        configIssues.push('❌ GMAIL_CLIENT_ID is missing');
    } else {
        console.log('✅ GMAIL_CLIENT_ID: Set');
    }

    if (!process.env.GMAIL_CLIENT_SECRET) {
        configIssues.push('❌ GMAIL_CLIENT_SECRET is missing');
    } else {
        console.log('✅ GMAIL_CLIENT_SECRET: Set');
    }

    if (!process.env.EMAIL_FROM) {
        configIssues.push('❌ EMAIL_FROM is missing');
    } else {
        console.log('✅ EMAIL_FROM: Set');
    }

    if (process.env.EMAIL_PROVIDER !== 'gmail-api') {
        configIssues.push('⚠️  EMAIL_PROVIDER is not set to "gmail-api"');
    } else {
        console.log('✅ EMAIL_PROVIDER: Set to gmail-api');
    }

    if (!process.env.GMAIL_ACCESS_TOKEN) {
        configIssues.push('❌ GMAIL_ACCESS_TOKEN is missing');
    } else {
        console.log('✅ GMAIL_ACCESS_TOKEN: Set');
    }

    if (!process.env.GMAIL_REFRESH_TOKEN) {
        configIssues.push('❌ GMAIL_REFRESH_TOKEN is missing');
    } else {
        console.log('✅ GMAIL_REFRESH_TOKEN: Set');
    }

    if (configIssues.length > 0) {
        console.log('\n❌ Configuration Issues:');
        configIssues.forEach(issue => console.log(`   ${issue}`));
    } else {
        console.log('\n✅ Configuration: All good!');
    }

    // Check 2: Server Connectivity
    console.log('\n📋 2. Server Connectivity:');
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        if (response.ok) {
            console.log('✅ Server: Running and accessible');
        } else {
            console.log('⚠️  Server: Running but health check failed');
        }
    } catch (error) {
        console.log('❌ Server: Not accessible');
        console.log(`   Error: ${error.message}`);
        console.log('   Make sure your server is running on the correct port');
        return;
    }

    // Check 3: OAuth Endpoints
    console.log('\n📋 3. OAuth Endpoints:');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/gmail`);
        if (response.ok) {
            console.log('✅ OAuth endpoint: Accessible');
            const result = await response.json();
            if (result.data?.authUrl) {
                console.log('✅ OAuth URL generation: Working');
            } else {
                console.log('❌ OAuth URL generation: Failed');
            }
        } else {
            console.log('❌ OAuth endpoint: Not accessible');
        }
    } catch (error) {
        console.log('❌ OAuth endpoint: Error');
        console.log(`   Error: ${error.message}`);
    }

    // Check 4: Communication API
    console.log('\n📋 4. Communication API:');
    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'GET',
        });
        if (response.ok) {
            console.log('✅ Communication API: Accessible');
            const result = await response.json();
            if (result.data?.supportedProviders?.email?.includes('gmail-api')) {
                console.log('✅ Gmail API provider: Supported');
            } else {
                console.log('⚠️  Gmail API provider: Not in supported list');
            }
        } else {
            console.log('❌ Communication API: Not accessible');
        }
    } catch (error) {
        console.log('❌ Communication API: Error');
        console.log(`   Error: ${error.message}`);
    }

    // Check 5: Authentication
    console.log('\n📋 5. Authentication:');
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
            console.log('✅ Login: Working');
            const cookies = response.headers.get('set-cookie');
            if (cookies) {
                console.log('✅ Authentication cookies: Generated');
            } else {
                console.log('⚠️  Authentication cookies: Not generated');
            }
        } else {
            console.log('❌ Login: Failed');
        }
    } catch (error) {
        console.log('❌ Login: Error');
        console.log(`   Error: ${error.message}`);
    }

    // Summary and Recommendations
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=====================');

    const hasConfigIssues = configIssues.length > 0;
    const hasOAuthTokens = process.env.GMAIL_ACCESS_TOKEN && process.env.GMAIL_REFRESH_TOKEN;

    if (hasConfigIssues) {
        console.log('❌ System Status: CONFIGURATION ISSUES');
        console.log('\n🔧 Required Actions:');
        console.log('1. Set up Google Cloud project and get OAuth credentials');
        console.log('2. Add missing environment variables to .env.local');
        console.log('3. Complete OAuth flow to get access tokens');
        console.log('4. Run this diagnostic again');
    } else if (!hasOAuthTokens) {
        console.log('⚠️  System Status: NEEDS OAUTH TOKENS');
        console.log('\n🔧 Required Actions:');
        console.log('1. Complete OAuth flow to get access and refresh tokens');
        console.log('2. Add tokens to .env.local file');
        console.log('3. Run integrity tests');
    } else {
        console.log('✅ System Status: READY FOR TESTING');
        console.log('\n🎯 Next Steps:');
        console.log('1. Run integrity tests: node scripts/test-gmail-api-integrity.js');
        console.log('2. Test email sending with your email address');
        console.log('3. Verify emails are received');
    }

    console.log('\n📚 Helpful Commands:');
    console.log('• Setup: node scripts/setup-gmail-api.js');
    console.log('• Test: node scripts/test-gmail-api-integrity.js your-email@gmail.com');
    console.log('• Quick test: node scripts/test-email-simple.js your-email@gmail.com');
}

// Run diagnostic if this script is executed directly
if (require.main === module) {
    diagnoseGmailAPI().catch(console.error);
}

module.exports = { diagnoseGmailAPI };
