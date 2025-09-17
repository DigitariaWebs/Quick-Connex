/**
 * Communication System Test Script
 * 
 * This script tests the Twilio SMS and SendGrid email integration
 * to ensure everything is working correctly.
 */

const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PHONE = process.env.TEST_PHONE || '+1234567890';

// You'll need to get a JWT token from your login endpoint
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

/**
 * Test email sending via SendGrid
 */
async function testEmailSending() {
    console.log('🧪 Testing Email Sending via SendGrid...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: TEST_EMAIL,
                    name: 'Test User',
                },
                content: {
                    subject: 'Test Email from Patient Management System',
                    text: 'This is a test email to verify SendGrid integration is working correctly.',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Test Email</h2>
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
                    source: 'test-script',
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
        } else {
            console.log('❌ Email sending failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Email test error:', error.message);
        return null;
    }
}

/**
 * Test SMS sending via Twilio
 */
async function testSMSSending() {
    console.log('🧪 Testing SMS Sending via Twilio...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
            body: JSON.stringify({
                channel: 'sms',
                recipient: {
                    phone: TEST_PHONE,
                    name: 'Test User',
                },
                content: {
                    text: 'Test SMS from Patient Management System - SendGrid + Twilio integration working!',
                },
                metadata: {
                    category: 'test',
                    source: 'test-script',
                },
                priority: 'high',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ SMS sent successfully!');
            console.log('📱 Message ID:', result.data.messageId);
            console.log('📊 Status:', result.data.status);
            console.log('💰 Cost:', result.data.cost, result.data.currency);
        } else {
            console.log('❌ SMS sending failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ SMS test error:', error.message);
        return null;
    }
}

/**
 * Test template rendering
 */
async function testTemplateRendering() {
    console.log('🧪 Testing Template Rendering...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JWT_TOKEN}`,
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

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Template rendered successfully!');
            console.log('📄 Subject:', result.data.content.subject);
            console.log('📝 Text:', result.data.content.text.substring(0, 100) + '...');
        } else {
            console.log('❌ Template rendering failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Template test error:', error.message);
        return null;
    }
}

/**
 * Test getting available templates
 */
async function testGetTemplates() {
    console.log('🧪 Testing Template Retrieval...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/templates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Templates retrieved successfully!');
            console.log('📋 Available templates:', result.data.templates.length);
            result.data.templates.forEach(template => {
                console.log(`  - ${template.name} (${template.channel})`);
            });
        } else {
            console.log('❌ Template retrieval failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Template retrieval error:', error.message);
        return null;
    }
}

/**
 * Test communication configuration
 */
async function testCommunicationConfig() {
    console.log('🧪 Testing Communication Configuration...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Configuration retrieved successfully!');
            console.log('📧 Email providers:', result.data.supportedProviders.email);
            console.log('📱 SMS providers:', result.data.supportedProviders.sms);
            console.log('📏 Max SMS length:', result.data.maxSMSLength);
        } else {
            console.log('❌ Configuration retrieval failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Configuration test error:', error.message);
        return null;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Communication System Tests...\n');

    // Check environment variables
    console.log('🔧 Environment Check:');
    console.log('  - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('  - TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Missing');
    console.log('  - SMS_FROM_NUMBER:', process.env.SMS_FROM_NUMBER || '❌ Missing');
    console.log('  - TEST_EMAIL:', TEST_EMAIL);
    console.log('  - TEST_PHONE:', TEST_PHONE);
    console.log('  - JWT_TOKEN:', JWT_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('');

    if (!process.env.SENDGRID_API_KEY || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('❌ Missing required environment variables. Please check your .env file.');
        return;
    }

    if (JWT_TOKEN === 'your-jwt-token-here') {
        console.log('⚠️  Please set TEST_JWT_TOKEN in your .env file or environment variables.');
        console.log('   You can get a JWT token by logging in through your application.');
        return;
    }

    // Run tests
    await testCommunicationConfig();
    console.log('');

    await testGetTemplates();
    console.log('');

    await testTemplateRendering();
    console.log('');

    await testEmailSending();
    console.log('');

    await testSMSSending();
    console.log('');

    console.log('🎉 All tests completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Check your email inbox for the test email');
    console.log('  2. Check your phone for the test SMS');
    console.log('  3. Set up webhooks for delivery status tracking');
    console.log('  4. Configure production settings');
    console.log('  5. Set up monitoring and alerts');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testEmailSending,
    testSMSSending,
    testTemplateRendering,
    testGetTemplates,
    testCommunicationConfig,
    runAllTests,
};
