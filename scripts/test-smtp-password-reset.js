/**
 * Test script for SMTP and password reset email functionality
 * 
 * This script tests:
 * 1. SMTP connection
 * 2. Sending a password reset email
 * 3. Email template rendering
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuration from environment variables and command line
const TEST_EMAIL = process.argv[2]; // Get email from command line argument
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Patient Management System';

// Password reset email template
function generatePasswordResetEmail(firstName, lastName, resetUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Patient Management System</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${firstName} ${lastName},</h2>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset your password for your Patient Management System account.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
          Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
            Reset Password
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          <strong>Important:</strong> This link will expire in 1 hour. If you don't reset your password within this time, you'll need to request a new reset link.
        </p>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from the Patient Management System.<br>
          If you have any questions, please contact your system administrator.
        </p>
      </div>
    </body>
    </html>
  `;
}

async function testSMTPConnection() {
    console.log('🔧 Testing SMTP Connection...\n');

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
        console.log('📡 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        return transporter;
    } catch (error) {
        console.error('❌ SMTP connection failed:', error.message);
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Make sure 2-factor authentication is enabled on your Gmail account');
        console.log('2. Generate an app password: https://myaccount.google.com/apppasswords');
        console.log('3. Use the 16-character app password (not your regular password)');
        console.log('4. Make sure "Less secure app access" is not enabled (use app passwords instead)');
        return null;
    }
}

async function sendPasswordResetEmail(transporter) {
    console.log('📧 Sending password reset email...\n');

    try {
        // Generate a test reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

        // Email content
        const mailOptions = {
            from: {
                name: EMAIL_FROM_NAME,
                address: EMAIL_FROM || GMAIL_EMAIL
            },
            to: TEST_EMAIL,
            subject: 'Reset Your Password - Patient Management System',
            html: generatePasswordResetEmail('John', 'Doe', resetUrl),
            text: `Hello John Doe,

We received a request to reset your password for your Patient Management System account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

This is an automated message from the Patient Management System.`
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        console.log('✅ Password reset email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📬 Sent to:', TEST_EMAIL);
        console.log('🔗 Reset URL:', resetUrl);
        console.log('\n📝 Check your email inbox for the password reset link.');

        return true;
    } catch (error) {
        console.error('❌ Failed to send password reset email:', error.message);
        return false;
    }
}

async function runTest() {
    console.log('🧪 SMTP Password Reset Test\n');
    console.log('='.repeat(50));

    // Check configuration
    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
        console.log('❌ Missing required environment variables:');
        console.log('   - GMAIL_EMAIL: Your Gmail address');
        console.log('   - GMAIL_APP_PASSWORD: Your Gmail app password');
        console.log('\n💡 Please add these to your .env.local file');
        return;
    }

    if (!TEST_EMAIL) {
        console.log('❌ Please provide a test email address as a command line argument:');
        console.log('   node scripts/test-smtp-password-reset.js your-email@gmail.com');
        return;
    }

    console.log('📋 Configuration:');
    console.log('   Test Email:', TEST_EMAIL);
    console.log('   Gmail Email:', GMAIL_EMAIL);
    console.log('   App Password:', GMAIL_APP_PASSWORD ? '***set***' : 'not set');
    console.log('   From Email:', EMAIL_FROM || GMAIL_EMAIL);
    console.log('   From Name:', EMAIL_FROM_NAME);
    console.log('');

    // Test SMTP connection
    const transporter = await testSMTPConnection();
    if (!transporter) {
        return;
    }

    // Send test email
    const emailSent = await sendPasswordResetEmail(transporter);

    if (emailSent) {
        console.log('\n🎉 Test completed successfully!');
        console.log('📧 Check your email inbox for the password reset link.');
    } else {
        console.log('\n❌ Test failed. Please check the error messages above.');
    }
}

// Run the test
runTest().catch(console.error);
