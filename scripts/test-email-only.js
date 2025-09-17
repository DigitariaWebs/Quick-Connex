/**
 * Email System Test Script
 * 
 * This script tests only the SendGrid email integration
 * to ensure email sending is working correctly.
 * 
 * Usage:
 *   node scripts/test-email-only.js [recipient-email]
 * 
 * Examples:
 *   node scripts/test-email-only.js
 *   node scripts/test-email-only.js user@example.com
 *   node scripts/test-email-only.js test@yourdomain.com
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Get recipient email from command line argument or environment variable
const TEST_EMAIL = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';

// You'll need to get a JWT token from your login endpoint
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-jwt-token-here';

/**
 * Test basic email sending
 */
async function testBasicEmail() {
    console.log('🧪 Testing Basic Email Sending...');

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
async function testEmailWithTemplate() {
    console.log('🧪 Testing Email with Template...');

    try {
        // First, render a template
        const templateResponse = await fetch(`${BASE_URL}/api/communication/templates`, {
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
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
            body: JSON.stringify({
                channel: 'email',
                recipient: {
                    email: TEST_EMAIL,
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
 * Test getting available email templates
 */
async function testGetEmailTemplates() {
    console.log('🧪 Testing Email Template Retrieval...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/templates?channel=email`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email templates retrieved successfully!');
            console.log('📋 Available email templates:', result.data.templates.length);
            result.data.templates.forEach(template => {
                console.log(`  - ${template.name} (${template.category})`);
                console.log(`    Variables: ${template.variables.join(', ')}`);
            });
        } else {
            console.log('❌ Email template retrieval failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Email template retrieval error:', error.message);
        return null;
    }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    console.log('🧪 Testing Email Configuration...');

    try {
        const response = await fetch(`${BASE_URL}/api/communication/send`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
            },
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Email configuration retrieved successfully!');
            console.log('📧 Email providers:', result.data.supportedProviders.email);
            console.log('📏 Max email length: No limit');
        } else {
            console.log('❌ Email configuration retrieval failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Email configuration test error:', error.message);
        return null;
    }
}

/**
 * Test urgent email
 */
async function testUrgentEmail() {
    console.log('🧪 Testing Urgent Email...');

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
                    subject: '🚨 URGENT: Test Urgent Email',
                    text: 'This is an urgent test email to verify priority handling.',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ff0000; padding: 20px;">
              <h2 style="color: #ff0000;">🚨 URGENT EMAIL TEST</h2>
              <p>This is an urgent test email to verify priority handling.</p>
              <p><strong>Priority:</strong> <span style="color: #ff0000; font-weight: bold;">URGENT</span></p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <hr>
              <p style="color: #ff0000; font-weight: bold;">This is a test urgent email.</p>
            </div>
          `,
                },
                metadata: {
                    category: 'urgent',
                    source: 'email-test-script',
                },
                priority: 'urgent',
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Urgent email sent successfully!');
            console.log('📧 Message ID:', result.data.messageId);
            console.log('📊 Status:', result.data.status);
            console.log('💰 Cost:', result.data.cost, result.data.currency);
        } else {
            console.log('❌ Urgent email sending failed:', result.error);
        }

        return result;
    } catch (error) {
        console.error('❌ Urgent email test error:', error.message);
        return null;
    }
}

/**
 * Run all email tests
 */
async function runEmailTests() {
    console.log('🚀 Starting Email System Tests...\n');

    // Check environment variables
    console.log('🔧 Environment Check:');
    console.log('  - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Missing');
    console.log('  - EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || '❌ Missing');
    console.log('  - RECIPIENT_EMAIL:', TEST_EMAIL);
    console.log('  - JWT_TOKEN:', JWT_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('');

    if (!process.env.SENDGRID_API_KEY) {
        console.log('❌ Missing SENDGRID_API_KEY. Please check your .env file.');
        console.log('   Get your API key from: https://app.sendgrid.com/settings/api_keys');
        return;
    }

    if (!process.env.EMAIL_FROM) {
        console.log('❌ Missing EMAIL_FROM. Please set this in your .env file.');
        console.log('   Example: EMAIL_FROM=noreply@yourdomain.com');
        return;
    }

    if (JWT_TOKEN === 'your-jwt-token-here') {
        console.log('⚠️  Please set TEST_JWT_TOKEN in your .env file or environment variables.');
        console.log('   You can get a JWT token by logging in through your application.');
        console.log('   Or temporarily disable authentication for testing.');
        return;
    }

    // Run tests
    await testEmailConfig();
    console.log('');

    await testGetEmailTemplates();
    console.log('');

    await testBasicEmail();
    console.log('');

    await testEmailWithTemplate();
    console.log('');

    await testUrgentEmail();
    console.log('');

    console.log('🎉 All email tests completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log(`  1. Check ${TEST_EMAIL} inbox for the test emails`);
    console.log('  2. Check spam folder if emails are not received');
    console.log('  3. Verify sender authentication in SendGrid');
    console.log('  4. Set up webhooks for delivery status tracking');
    console.log('  5. Configure production settings (domain authentication)');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runEmailTests().catch(console.error);
}

module.exports = {
    testBasicEmail,
    testEmailWithTemplate,
    testGetEmailTemplates,
    testEmailConfig,
    testUrgentEmail,
    runEmailTests,
};
