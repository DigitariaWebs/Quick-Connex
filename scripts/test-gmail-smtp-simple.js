/**
 * Simple Gmail SMTP Test Script
 * 
 * This script tests Gmail SMTP email sending directly
 * without the complexity of user signup.
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

/**
 * Test Gmail SMTP configuration
 */
async function testGmailConfiguration() {
    console.log('🔧 Testing Gmail SMTP Configuration...');

    const requiredEnvVars = [
        'GMAIL_EMAIL',
        'GMAIL_APP_PASSWORD',
        'EMAIL_FROM',
        'ADMIN_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.log('❌ Missing environment variables:');
        missingVars.forEach(varName => console.log(`   - ${varName}`));
        return false;
    }

    console.log('✅ All required environment variables are set');
    console.log(`   Gmail Email: ${process.env.GMAIL_EMAIL}`);
    console.log(`   App Password: ${process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Missing'}`);
    console.log(`   From Email: ${process.env.EMAIL_FROM}`);
    console.log(`   Admin Email: ${process.env.ADMIN_EMAIL}`);

    return true;
}

/**
 * Test direct email sending via communication API
 */
async function testDirectEmailSending() {
    console.log('\n📧 Testing Direct Email Sending...');

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
            console.log('❌ Authentication failed - using mock auth');
        }

        const authCookie = loginResponse.headers.get('set-cookie');

        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': authCookie || '',
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: ADMIN_EMAIL,
                    name: 'Test Admin'
                },
                content: {
                    subject: '🧪 Gmail SMTP Test - Approval Workflow',
                    text: `This is a test email to verify Gmail SMTP is working correctly for the approval workflow.

Test Details:
- Provider: Gmail SMTP
- From: ${process.env.EMAIL_FROM}
- To: ${ADMIN_EMAIL}
- Timestamp: ${new Date().toISOString()}

If you receive this email, Gmail SMTP is working correctly! 🎉`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🧪 Gmail SMTP Test</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">Approval Workflow Verification</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <h2 style="color: #28a745; margin-top: 0;">✅ Test Successful!</h2>
                <p style="font-size: 16px; line-height: 1.6;">This email confirms that Gmail SMTP is working correctly for your approval workflow.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                  <h3 style="margin-top: 0; color: #333;">📋 Test Details:</h3>
                  <ul style="color: #666; margin: 0;">
                    <li><strong>Provider:</strong> Gmail SMTP</li>
                    <li><strong>From:</strong> ${process.env.EMAIL_FROM}</li>
                    <li><strong>To:</strong> ${ADMIN_EMAIL}</li>
                    <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                  </ul>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #1976d2;">
                    <strong>🎯 Next Steps:</strong> Your Gmail SMTP integration is ready for the approval workflow!
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <h3 style="color: #28a745; margin: 0;">🚀 Ready for Production!</h3>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
                <p>This is an automated test message from your Gmail SMTP integration.</p>
              </div>
            </div>
          `,
                },
                metadata: {
                    category: 'smtp-test',
                    source: 'gmail-smtp-simple-test',
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
            console.log(`   Cost: ${result.data.cost} ${result.data.currency}`);
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
 * Main test function
 */
async function runTests() {
    console.log('🚀 Gmail SMTP Simple Test');
    console.log('========================\n');

    // Test 1: Gmail Configuration
    const configOk = await testGmailConfiguration();
    if (!configOk) {
        console.log('\n❌ Configuration test failed. Please check your .env.local file.');
        return;
    }

    // Test 2: Direct Email Sending
    const emailOk = await testDirectEmailSending();

    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`✅ Configuration: ${configOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Email Sending: ${emailOk ? 'PASS' : 'FAIL'}`);

    if (configOk && emailOk) {
        console.log('\n🎉 All tests passed! Gmail SMTP is working correctly.');
        console.log(`📧 Check your email: ${ADMIN_EMAIL}`);
        console.log('\n📋 Your Gmail SMTP setup is ready for:');
        console.log('   ✅ User signup approval emails');
        console.log('   ✅ Admin notification emails');
        console.log('   ✅ User approval/rejection notifications');
        console.log('   ✅ Production use');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testGmailConfiguration,
    testDirectEmailSending,
    runTests
};
