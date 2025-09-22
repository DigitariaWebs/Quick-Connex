#!/usr/bin/env node

/**
 * Test Email Configuration Script
 * 
 * This script tests the email configuration to ensure emails are being sent correctly.
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testEmailConfig() {
    try {
        console.log('📧 Testing email configuration...');

        // Check environment variables
        console.log('\n⚙️  Environment Configuration:');
        console.log(`📧 Email Provider: ${process.env.EMAIL_PROVIDER}`);
        console.log(`📧 Gmail Email: ${process.env.GMAIL_EMAIL}`);
        console.log(`📧 Gmail App Password: ${process.env.GMAIL_APP_PASSWORD ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        console.log(`📧 Email From: ${process.env.EMAIL_FROM}`);
        console.log(`📧 Email From Name: ${process.env.EMAIL_FROM_NAME}`);
        console.log(`📧 Admin Email: ${process.env.ADMIN_EMAIL}`);
        console.log(`📧 Admin Phone: ${process.env.ADMIN_PHONE}`);

        // Create transporter
        console.log('\n🔧 Creating email transporter...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_EMAIL,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        // Verify connection
        console.log('🔍 Verifying email connection...');
        await transporter.verify();
        console.log('✅ Email connection verified successfully!');

        // Send test email
        console.log('\n📤 Sending test email...');
        const testEmail = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
            to: process.env.ADMIN_EMAIL,
            subject: '🧪 Test Email - Transfer Approval System',
            text: `
Hello Admin!

This is a test email to verify that the email configuration is working correctly.

Transfer Approval System Test:
- System: Patient Management
- Feature: Transfer Approval Notifications
- Status: ✅ Email configuration working
- Time: ${new Date().toLocaleString()}

If you receive this email, the email system is properly configured and ready to send transfer notifications.

Best regards,
Patient Management System
      `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Test Email - Transfer Approval System</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .test-info { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Transfer Approval System</p>
        </div>
        
        <div class="content">
            <p>Hello Admin!</p>
            
            <p>This is a test email to verify that the email configuration is working correctly.</p>
            
            <div class="test-info">
                <h3>Transfer Approval System Test</h3>
                <p><strong>System:</strong> Patient Management</p>
                <p><strong>Feature:</strong> Transfer Approval Notifications</p>
                <p><strong>Status:</strong> ✅ Email configuration working</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>If you receive this email, the email system is properly configured and ready to send transfer notifications.</p>
            
            <p>Best regards,<br>Patient Management System</p>
        </div>
        
        <div class="footer">
            <p>This is an automated test email from the Patient Management System.</p>
        </div>
    </div>
</body>
</html>
      `
        };

        const result = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log(`📧 To: ${testEmail.to}`);
        console.log(`📧 Subject: ${testEmail.subject}`);

        console.log('\n📝 Next Steps:');
        console.log('1. Check your email inbox for the test email');
        console.log('2. If you received it, the email system is working correctly');
        console.log('3. If you didn\'t receive it, check your spam folder');
        console.log('4. Verify that the Gmail app password is correct');

    } catch (error) {
        console.error('❌ Email test failed:', error.message);

        if (error.message.includes('Invalid login')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check that GMAIL_EMAIL is correct');
            console.log('2. Verify that GMAIL_APP_PASSWORD is the correct app password');
            console.log('3. Make sure 2-factor authentication is enabled on your Gmail account');
            console.log('4. Generate a new app password if needed');
        } else if (error.message.includes('Connection timeout')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your internet connection');
            console.log('2. Verify that Gmail SMTP is accessible');
        }
    }
}

// Run the script
if (require.main === module) {
    testEmailConfig();
}

module.exports = { testEmailConfig };
