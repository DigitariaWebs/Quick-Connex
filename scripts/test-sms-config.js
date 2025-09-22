#!/usr/bin/env node

/**
 * Test SMS Configuration Script
 * 
 * This script tests the SMS configuration to ensure SMS messages are being sent correctly.
 */

const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

async function testSMSConfig() {
    try {
        console.log('📱 Testing SMS configuration...');

        // Check environment variables
        console.log('\n⚙️  Environment Configuration:');
        console.log(`📱 SMS Provider: ${process.env.SMS_PROVIDER}`);
        console.log(`📱 SMS From Number: ${process.env.SMS_FROM_NUMBER}`);
        console.log(`📱 Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        console.log(`📱 Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        console.log(`📱 Admin Phone: ${process.env.ADMIN_PHONE}`);

        // Validate configuration
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.log('\n❌ Twilio configuration is incomplete!');
            console.log('Please check your .env.local file and ensure:');
            console.log('- TWILIO_ACCOUNT_SID is set');
            console.log('- TWILIO_AUTH_TOKEN is set');
            return;
        }

        if (!process.env.SMS_FROM_NUMBER) {
            console.log('\n❌ SMS From Number is not configured!');
            console.log('Please set SMS_FROM_NUMBER in your .env.local file');
            return;
        }

        if (!process.env.ADMIN_PHONE) {
            console.log('\n❌ Admin phone number is not configured!');
            console.log('Please set ADMIN_PHONE in your .env.local file');
            return;
        }

        // Create Twilio client
        console.log('\n🔧 Creating Twilio client...');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Test Twilio connection
        console.log('🔍 Testing Twilio connection...');
        try {
            const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            console.log('✅ Twilio connection successful!');
            console.log(`📱 Account Status: ${account.status}`);
            console.log(`📱 Account Type: ${account.type}`);
        } catch (error) {
            console.log('❌ Twilio connection failed:', error.message);
            return;
        }

        // Check phone number format
        console.log('\n📞 Validating phone numbers...');
        const fromNumber = process.env.SMS_FROM_NUMBER;
        const toNumber = process.env.ADMIN_PHONE;

        console.log(`📱 From Number: ${fromNumber}`);
        console.log(`📱 To Number: ${toNumber}`);

        // Validate phone number format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(fromNumber)) {
            console.log('❌ From number format is invalid. Should be in format: +1234567890');
            return;
        }

        if (!phoneRegex.test(toNumber)) {
            console.log('❌ To number format is invalid. Should be in format: +1234567890');
            return;
        }

        console.log('✅ Phone number formats are valid');

        // Send test SMS
        console.log('\n📤 Sending test SMS...');
        const testMessage = {
            body: `🧪 Test SMS - Transfer Approval System

Hello Admin!

This is a test SMS to verify that the SMS configuration is working correctly.

System: Patient Management
Feature: Transfer Approval Notifications
Status: ✅ SMS configuration working
Time: ${new Date().toLocaleString()}

If you receive this SMS, the SMS system is properly configured and ready to send transfer notifications.

Best regards,
Patient Management System`,
            from: fromNumber,
            to: toNumber
        };

        console.log('📋 SMS Details:');
        console.log(`   From: ${testMessage.from}`);
        console.log(`   To: ${testMessage.to}`);
        console.log(`   Message: ${testMessage.body.substring(0, 100)}...`);

        const result = await client.messages.create(testMessage);
        console.log('✅ Test SMS sent successfully!');
        console.log(`📱 Message SID: ${result.sid}`);
        console.log(`📱 Status: ${result.status}`);
        console.log(`📱 To: ${result.to}`);
        console.log(`📱 From: ${result.from}`);

        console.log('\n📝 Next Steps:');
        console.log('1. Check your phone for the test SMS');
        console.log('2. If you received it, the SMS system is working correctly');
        console.log('3. If you didn\'t receive it, check the following:');
        console.log('   - Phone number format (+country code)');
        console.log('   - Twilio account balance');
        console.log('   - Phone number verification in Twilio');
        console.log('   - SMS delivery status in Twilio console');

    } catch (error) {
        console.error('❌ SMS test failed:', error.message);

        if (error.message.includes('not a valid phone number')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check that phone numbers are in international format (+country code)');
            console.log('2. Verify that the from number is a valid Twilio phone number');
            console.log('3. Ensure the to number is a valid mobile number');
        } else if (error.message.includes('not authorized')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check that TWILIO_ACCOUNT_SID is correct');
            console.log('2. Verify that TWILIO_AUTH_TOKEN is correct');
            console.log('3. Ensure your Twilio account is active');
        } else if (error.message.includes('insufficient funds')) {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your Twilio account balance');
            console.log('2. Add funds to your Twilio account');
        }
    }
}

// Run the script
if (require.main === module) {
    testSMSConfig();
}

module.exports = { testSMSConfig };
