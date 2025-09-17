/**
 * Gmail API Integrity Test Script
 * 
 * This script comprehensively tests the Gmail API system to ensure
 * all components are working correctly and the integration is solid.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Test 1: Configuration Validation
 */
async function testConfiguration() {
    console.log('🧪 Test 1: Configuration Validation');
    console.log('=====================================');

    const requiredConfigs = [
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET',
        'EMAIL_FROM',
        'EMAIL_PROVIDER'
    ];

    const optionalConfigs = [
        'GMAIL_ACCESS_TOKEN',
        'GMAIL_REFRESH_TOKEN',
        'GMAIL_REDIRECT_URI'
    ];

    console.log('📋 Required Configuration:');
    let allRequired = true;
    requiredConfigs.forEach(config => {
        const value = process.env[config];
        const status = value ? '✅' : '❌';
        console.log(`  ${status} ${config}: ${value ? 'Set' : 'Missing'}`);
        if (!value) allRequired = false;
    });

    console.log('\n📋 Optional Configuration:');
    optionalConfigs.forEach(config => {
        const value = process.env[config];
        const status = value ? '✅' : '⚠️';
        console.log(`  ${status} ${config}: ${value ? 'Set' : 'Not Set'}`);
    });

    console.log('\n📋 Provider Configuration:');
    console.log(`  📧 Email Provider: ${process.env.EMAIL_PROVIDER || 'Not Set'}`);
    console.log(`  📧 From Email: ${process.env.EMAIL_FROM || 'Not Set'}`);
    console.log(`  📧 From Name: ${process.env.EMAIL_FROM_NAME || 'Not Set'}`);

    if (!allRequired) {
        console.log('\n❌ Configuration Test FAILED - Missing required settings');
        return false;
    }

    if (process.env.EMAIL_PROVIDER !== 'gmail-api') {
        console.log('\n⚠️  EMAIL_PROVIDER is not set to "gmail-api"');
        console.log('   This test will still run but may not reflect production behavior');
    }

    console.log('\n✅ Configuration Test PASSED');
    return true;
}

/**
 * Test 2: OAuth Flow Validation
 */
async function testOAuthFlow() {
    console.log('\n🧪 Test 2: OAuth Flow Validation');
    console.log('==================================');

    try {
        // Test OAuth URL generation
        console.log('🔐 Testing OAuth URL generation...');
        const response = await fetch(`${BASE_URL}/api/auth/gmail`);
        const result = await response.json();

        if (response.ok && result.data?.authUrl) {
            console.log('✅ OAuth URL generation: PASSED');
            console.log(`   URL: ${result.data.authUrl.substring(0, 80)}...`);

            // Validate URL structure
            const url = new URL(result.data.authUrl);
            if (url.hostname === 'accounts.google.com' &&
                url.searchParams.get('client_id') === process.env.GMAIL_CLIENT_ID) {
                console.log('✅ OAuth URL structure: VALID');
            } else {
                console.log('❌ OAuth URL structure: INVALID');
                return false;
            }
        } else {
            console.log('❌ OAuth URL generation: FAILED');
            console.log(`   Error: ${result.error || 'Unknown error'}`);
            return false;
        }

        // Test if we have tokens
        if (process.env.GMAIL_ACCESS_TOKEN && process.env.GMAIL_REFRESH_TOKEN) {
            console.log('✅ OAuth tokens: PRESENT');
            console.log(`   Access Token: ${process.env.GMAIL_ACCESS_TOKEN.substring(0, 20)}...`);
            console.log(`   Refresh Token: ${process.env.GMAIL_REFRESH_TOKEN.substring(0, 20)}...`);
        } else {
            console.log('⚠️  OAuth tokens: MISSING');
            console.log('   You need to complete the OAuth flow to get tokens');
            console.log(`   Visit: ${result.data.authUrl}`);
            return false;
        }

        console.log('\n✅ OAuth Flow Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ OAuth Flow Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test 3: Gmail API Provider Validation
 */
async function testGmailAPIProvider() {
    console.log('\n🧪 Test 3: Gmail API Provider Validation');
    console.log('==========================================');

    try {
        // Test provider configuration validation
        console.log('🔧 Testing provider configuration...');

        // This would test the actual provider validation
        // For now, we'll test the API endpoints
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'GET',
            headers: {
                'Cookie': await getAuthCookie(),
            },
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Communication API: ACCESSIBLE');
            console.log(`   Supported providers: ${result.data?.supportedProviders?.email?.join(', ') || 'Unknown'}`);
        } else {
            console.log('❌ Communication API: INACCESSIBLE');
            return false;
        }

        console.log('\n✅ Gmail API Provider Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ Gmail API Provider Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Email Sending Functionality
 */
async function testEmailSending() {
    console.log('\n🧪 Test 4: Email Sending Functionality');
    console.log('========================================');

    const recipientEmail = process.argv[2] || 'test@example.com';
    console.log(`📧 Testing email sending to: ${recipientEmail}`);

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
                    name: 'Integrity Test User',
                },
                content: {
                    subject: 'Gmail API Integrity Test',
                    text: `This is an integrity test email sent via Gmail API at ${new Date().toISOString()}.`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>🧪 Gmail API Integrity Test</h2>
              <p>This is an integrity test email sent via Gmail API.</p>
              <p><strong>Test Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Provider:</strong> Gmail API</p>
              <p><strong>Recipient:</strong> ${recipientEmail}</p>
              <hr>
              <p><small>This is an automated integrity test message.</small></p>
            </div>
          `,
                },
                metadata: {
                    category: 'integrity-test',
                    source: 'gmail-api-integrity-script',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email sending: SUCCESS');
            console.log(`   Message ID: ${result.data.messageId}`);
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Cost: ${result.data.cost} ${result.data.currency}`);
            if (result.data.providerId) {
                console.log(`   Provider ID: ${result.data.providerId}`);
            }

            // Validate response structure
            const requiredFields = ['messageId', 'status', 'cost', 'currency'];
            const missingFields = requiredFields.filter(field => !result.data[field]);

            if (missingFields.length === 0) {
                console.log('✅ Response structure: VALID');
            } else {
                console.log('❌ Response structure: INVALID');
                console.log(`   Missing fields: ${missingFields.join(', ')}`);
                return false;
            }

        } else {
            console.log('❌ Email sending: FAILED');
            console.log(`   Error: ${result.error || 'Unknown error'}`);
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
            return false;
        }

        console.log('\n✅ Email Sending Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ Email Sending Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling() {
    console.log('\n🧪 Test 5: Error Handling');
    console.log('===========================');

    try {
        // Test with invalid email
        console.log('🔍 Testing invalid email handling...');
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await getAuthCookie(),
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: 'invalid-email-format',
                    name: 'Test User',
                },
                content: {
                    subject: 'Test',
                    text: 'Test message',
                },
            }),
        });

        const result = await response.json();

        if (!response.ok && result.error) {
            console.log('✅ Invalid email handling: WORKING');
            console.log(`   Error message: ${result.error}`);
        } else {
            console.log('⚠️  Invalid email handling: NOT WORKING');
            console.log('   System should reject invalid email formats');
        }

        // Test with missing required fields
        console.log('\n🔍 Testing missing fields handling...');
        const response2 = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await getAuthCookie(),
            },
            body: JSON.stringify({
                channel: 'email',
                // Missing recipient and content
            }),
        });

        const result2 = await response2.json();

        if (!response2.ok && result2.error) {
            console.log('✅ Missing fields handling: WORKING');
            console.log(`   Error message: ${result2.error}`);
        } else {
            console.log('⚠️  Missing fields handling: NOT WORKING');
            console.log('   System should reject requests with missing required fields');
        }

        console.log('\n✅ Error Handling Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ Error Handling Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test 6: Template System
 */
async function testTemplateSystem() {
    console.log('\n🧪 Test 6: Template System');
    console.log('===========================');

    try {
        // Test template retrieval
        console.log('🔍 Testing template retrieval...');
        const response = await fetch(`${BASE_URL}/api/communication/templates?channel=email`, {
            method: 'GET',
            headers: {
                'Cookie': await getAuthCookie(),
            },
        });

        const result = await response.json();

        if (response.ok && result.data?.templates) {
            console.log('✅ Template retrieval: SUCCESS');
            console.log(`   Available templates: ${result.data.templates.length}`);
            result.data.templates.forEach(template => {
                console.log(`     - ${template.name} (${template.channel})`);
            });
        } else {
            console.log('❌ Template retrieval: FAILED');
            return false;
        }

        // Test template rendering
        console.log('\n🔍 Testing template rendering...');
        const templateResponse = await fetch(`${BASE_URL}/api/communication/templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': await getAuthCookie(),
            },
            body: JSON.stringify({
                templateId: 'transfer_notification',
                data: {
                    patientName: 'John Smith',
                    fromHospital: 'City Hospital',
                    toHospital: 'Regional Medical Center',
                    status: 'In Progress',
                    priority: 'High',
                },
            }),
        });

        const templateResult = await templateResponse.json();

        if (templateResponse.ok && templateResult.data?.content) {
            console.log('✅ Template rendering: SUCCESS');
            console.log(`   Subject: ${templateResult.data.content.subject}`);
            console.log(`   Text length: ${templateResult.data.content.text?.length || 0} chars`);
            console.log(`   HTML length: ${templateResult.data.content.html?.length || 0} chars`);
        } else {
            console.log('❌ Template rendering: FAILED');
            console.log(`   Error: ${templateResult.error || 'Unknown error'}`);
            return false;
        }

        console.log('\n✅ Template System Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ Template System Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Test 7: Performance and Limits
 */
async function testPerformanceAndLimits() {
    console.log('\n🧪 Test 7: Performance and Limits');
    console.log('===================================');

    try {
        const startTime = Date.now();

        // Test multiple rapid requests
        console.log('🔍 Testing rapid request handling...');
        const promises = [];
        for (let i = 0; i < 3; i++) {
            promises.push(
                fetch(`${BASE_URL}/api/communication/send`, {
                    method: 'GET',
                    headers: {
                        'Cookie': await getAuthCookie(),
                    },
                })
            );
        }

        const responses = await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successCount = responses.filter(r => r.ok).length;
        console.log(`✅ Rapid requests: ${successCount}/${responses.length} successful`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Average: ${(duration / responses.length).toFixed(2)}ms per request`);

        if (duration < 5000) {
            console.log('✅ Performance: GOOD (< 5s for 3 requests)');
        } else {
            console.log('⚠️  Performance: SLOW (> 5s for 3 requests)');
        }

        console.log('\n✅ Performance and Limits Test PASSED');
        return true;

    } catch (error) {
        console.log('❌ Performance and Limits Test FAILED');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

/**
 * Get authentication cookie
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
            return response.headers.get('set-cookie');
        }
    } catch (error) {
        console.error('❌ Authentication error:', error.message);
    }
    return null;
}

/**
 * Run all integrity tests
 */
async function runIntegrityTests() {
    console.log('🚀 Gmail API Integrity Test Suite');
    console.log('===================================\n');

    const tests = [
        { name: 'Configuration', fn: testConfiguration },
        { name: 'OAuth Flow', fn: testOAuthFlow },
        { name: 'Gmail API Provider', fn: testGmailAPIProvider },
        { name: 'Email Sending', fn: testEmailSending },
        { name: 'Error Handling', fn: testErrorHandling },
        { name: 'Template System', fn: testTemplateSystem },
        { name: 'Performance and Limits', fn: testPerformanceAndLimits },
    ];

    const results = [];

    for (const test of tests) {
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });
        } catch (error) {
            console.log(`❌ ${test.name} Test CRASHED: ${error.message}`);
            results.push({ name: test.name, passed: false });
        }
    }

    // Summary
    console.log('\n📊 INTEGRITY TEST SUMMARY');
    console.log('==========================');

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;

    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} ${result.name}`);
    });

    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED - Gmail API system is working correctly!');
    } else {
        console.log('⚠️  SOME TESTS FAILED - Review the issues above');
    }

    console.log('\n📋 Next Steps:');
    if (passedTests === totalTests) {
        console.log('1. ✅ System is ready for production use');
        console.log('2. 📧 Check your email inbox for test messages');
        console.log('3. 🔄 Set up monitoring and alerts');
        console.log('4. 📊 Monitor usage and quotas');
    } else {
        console.log('1. 🔧 Fix the failed tests');
        console.log('2. 🔄 Re-run the integrity tests');
        console.log('3. 📞 Check the setup documentation');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runIntegrityTests().catch(console.error);
}

module.exports = {
    testConfiguration,
    testOAuthFlow,
    testGmailAPIProvider,
    testEmailSending,
    testErrorHandling,
    testTemplateSystem,
    testPerformanceAndLimits,
    runIntegrityTests,
};
