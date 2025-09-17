/**
 * Simple Email Test Script
 * 
 * This script tests the email system by logging in first to get authentication,
 * then sending test emails.
 */

require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Get recipient email from command line argument
const RECIPIENT_EMAIL = process.argv[2] || 'test@example.com';

/**
 * Login and get authentication cookie
 */
async function login() {
    console.log('🔐 Logging in to get authentication...');

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

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Login successful!');

            // Extract cookies from response
            const cookies = response.headers.get('set-cookie');
            if (cookies) {
                console.log('🍪 Authentication cookie received');
                return cookies;
            } else {
                console.log('⚠️  No authentication cookie received');
                return null;
            }
        } else {
            console.log('❌ Login failed:', result.message);
            return null;
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return null;
    }
}

/**
 * Test basic email sending
 */
async function testBasicEmail(cookies) {
    console.log('🧪 Testing Basic Email Sending...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: RECIPIENT_EMAIL,
                    name: 'Test User',
                },
                content: {
                    subject: 'Test Email from Patient Management System',
                    text: 'This is a test email to verify SendGrid integration is working correctly.',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>✅ Email System Test</h2>
              <p>This is a test email to verify SendGrid integration is working correctly.</p>
              <p><strong>System:</strong> Patient Management System</p>
              <p><strong>Provider:</strong> SendGrid</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <hr>
              <p><small>This is an automated test message.</small></p>
            </div>
          `,
                },
                metadata: {
                    category: 'test',
                    source: 'email-test-script',
                },
                priority: 'medium',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email sent successfully!');
            console.log('📧 Message ID:', result.data.messageId);
            console.log('📊 Status:', result.data.status);
            console.log('💰 Cost:', result.data.cost, result.data.currency);
            if (result.data.providerId) {
                console.log('🔗 Provider ID:', result.data.providerId);
            }
        } else {
            console.log('❌ Email sending failed:', result.error);
            if (result.details) {
                console.log('📋 Details:', result.details);
            }
        }

        return result;
    } catch (error) {
        console.error('❌ Email test error:', error.message);
        return null;
    }
}

/**
 * Test email with template
 */
async function testEmailWithTemplate(cookies) {
    console.log('🧪 Testing Email with Template...');

    try {
        // First, render a template
        const templateResponse = await fetch(`${BASE_URL}/api/communication/templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
            },
            body: JSON.stringify({
                templateId: 'transfer_notification',
                data: {
                    patientName: 'John Smith',
                    fromHospital: 'City Hospital',
                    toHospital: 'Regional Medical Center',
                    status: 'In Progress',
                    priority: 'High',
                    scheduledDate: new Date().toISOString(),
                },
            }),
        });

        const templateResult = await templateResponse.json();

        if (!templateResponse.ok) {
            console.log('❌ Template rendering failed:', templateResult.error);
            return null;
        }

        console.log('✅ Template rendered successfully');

        // Now send email with rendered template
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: RECIPIENT_EMAIL,
                    name: 'Test User',
                },
                content: templateResult.data.content,
                metadata: {
                    category: 'transfer',
                    source: 'email-test-script',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Template email sent successfully!');
            console.log('📧 Message ID:', result.data.messageId);
            console.log('📊 Status:', result.data.status);
            console.log('💰 Cost:', result.data.cost, result.data.currency);
        } else {
            console.log('❌ Template email sending failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Template email test error:', error.message);
        return null;
    }
}

/**
 * Run email tests
 */
async function runEmailTests() {
    console.log('🚀 Starting Simple Email System Tests...\n');
    console.log(`📧 Recipient Email: ${RECIPIENT_EMAIL}\n`);

    // Check environment variables
    console.log('🔧 Environment Check:');
    console.log('  - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Missing');
    console.log('  - EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '❌ Missing');
    console.log('');

    if (!process.env.SENDGRID_API_KEY) {
        console.log('❌ Missing SENDGRID_API_KEY. Please check your .env.local file.');
        return;
    }

    if (!process.env.EMAIL_FROM) {
        console.log('❌ Missing EMAIL_FROM. Please check your .env.local file.');
        return;
    }

    // Login to get authentication
    const cookies = await login();
    if (!cookies) {
        console.log('❌ Failed to authenticate. Cannot proceed with email tests.');
        return;
    }

    console.log('');

    // Run email tests
    await testBasicEmail(cookies);
    console.log('');

    await testEmailWithTemplate(cookies);
    console.log('');

    console.log('🎉 All email tests completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log(`  1. Check ${RECIPIENT_EMAIL} inbox for the test emails`);
    console.log('  2. Check spam folder if emails are not received');
    console.log('  3. Verify sender authentication in SendGrid');
    console.log('  4. Set up webhooks for delivery status tracking');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runEmailTests().catch(console.error);
}

module.exports = {
    login,
    testBasicEmail,
    testEmailWithTemplate,
    runEmailTests,
};
