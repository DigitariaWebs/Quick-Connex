/**
 * Direct Gmail SMTP Test
 * 
 * This script tests Gmail SMTP directly without going through the API
 */

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

console.log('🚀 Direct Gmail SMTP Test');
console.log('========================\n');

/**
 * Test Gmail SMTP configuration
 */
async function testGmailSMTP() {
    console.log('🔧 Testing Gmail SMTP Configuration...');

    // Check environment variables
    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD || !EMAIL_FROM || !ADMIN_EMAIL) {
        console.log('❌ Missing required environment variables');
        return false;
    }

    console.log('✅ All required environment variables are set');
    console.log(`   Gmail Email: ${GMAIL_EMAIL}`);
    console.log(`   App Password: ${GMAIL_APP_PASSWORD ? 'Set' : 'Missing'}`);
    console.log(`   From Email: ${EMAIL_FROM}`);
    console.log(`   Admin Email: ${ADMIN_EMAIL}`);

    return true;
}

/**
 * Test SMTP connection
 */
async function testSMTPConnection() {
    console.log('\n🔌 Testing SMTP Connection...');

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: GMAIL_EMAIL,
                pass: GMAIL_APP_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Verify connection
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
        return transporter;

    } catch (error) {
        console.log('❌ SMTP connection failed:', error.message);
        return null;
    }
}

/**
 * Send test email
 */
async function sendTestEmail(transporter) {
    console.log('\n📧 Sending Test Email...');

    try {
        const mailOptions = {
            from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
            to: ADMIN_EMAIL,
            subject: '🧪 Gmail SMTP Test - Direct Connection',
            text: `This is a test email to verify Gmail SMTP is working correctly.

Test Details:
- Provider: Gmail SMTP (Direct)
- From: ${EMAIL_FROM}
- To: ${ADMIN_EMAIL}
- Timestamp: ${new Date().toISOString()}

If you receive this email, Gmail SMTP is working correctly! 🎉`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">🧪 Gmail SMTP Test</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">Direct Connection Verification</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #28a745; margin-top: 0;">✅ Test Successful!</h2>
                        <p>This email confirms that Gmail SMTP is working correctly for your Patient Management System.</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3>📋 Test Details</h3>
                            <ul>
                                <li><strong>Provider:</strong> Gmail SMTP (Direct)</li>
                                <li><strong>From:</strong> ${EMAIL_FROM}</li>
                                <li><strong>To:</strong> ${ADMIN_EMAIL}</li>
                                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                            </ul>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4>🎯 Next Steps</h4>
                            <p>Your Gmail SMTP is ready for the authentication flow:</p>
                            <ul>
                                <li>User signup approval emails</li>
                                <li>Admin notification emails</li>
                                <li>User approval/rejection notifications</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                        <p>This is an automated test from the Patient Management System.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Accepted: ${info.accepted.join(', ')}`);

        return true;

    } catch (error) {
        console.log('❌ Failed to send test email:', error.message);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    try {
        // Test configuration
        const configOk = await testGmailSMTP();
        if (!configOk) {
            console.log('\n❌ Configuration test failed');
            return;
        }

        // Test SMTP connection
        const transporter = await testSMTPConnection();
        if (!transporter) {
            console.log('\n❌ SMTP connection test failed');
            return;
        }

        // Send test email
        const emailSent = await sendTestEmail(transporter);

        // Summary
        console.log('\n📊 Test Summary');
        console.log('================');
        console.log('✅ Configuration: PASS');
        console.log('✅ SMTP Connection: PASS');
        console.log(emailSent ? '✅ Email Sending: PASS' : '❌ Email Sending: FAIL');

        if (emailSent) {
            console.log('\n🎉 Gmail SMTP is working correctly!');
            console.log('📧 Check your email inbox for the test message.');
            console.log('\n🚀 You can now test the complete authentication flow:');
            console.log('   node scripts/test-gmail-signup-approval.js test@example.com');
        } else {
            console.log('\n⚠️  Email sending failed. Please check your Gmail credentials.');
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the tests
runTests();
