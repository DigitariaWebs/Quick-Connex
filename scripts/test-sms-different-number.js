#!/usr/bin/env node

/**
 * Test SMS with Different Number Script
 * 
 * This script tests SMS with a different phone number to see if the issue
 * is specific to the Algeria number or a general trial account limitation.
 */

const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

async function testSMSDifferentNumber() {
    try {
        console.log('📱 Testing SMS with different phone number...');

        // Create Twilio client
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Test with a US number (if you have one) or suggest alternatives
        console.log('\n📞 Phone Number Options:');
        console.log('   1. US/Canada number (most likely to work with trial account)');
        console.log('   2. UK number (usually works with trial account)');
        console.log('   3. Your Algeria number (has restrictions)');

        // For testing, let's try with a test number
        const testNumbers = [
            '+1234567890', // This will fail but shows the error
            '+15551234567', // US test number
        ];

        for (const testNumber of testNumbers) {
            console.log(`\n🧪 Testing with: ${testNumber}`);

            try {
                const message = await client.messages.create({
                    body: `🧪 Test SMS - Transfer Approval System

This is a test to check SMS delivery with different numbers.

System: Patient Management
Time: ${new Date().toLocaleString()}

If you receive this, SMS is working for this number.`,
                    from: process.env.SMS_FROM_NUMBER,
                    to: testNumber
                });

                console.log(`   ✅ SMS sent successfully!`);
                console.log(`   📱 Message SID: ${message.sid}`);
                console.log(`   📱 Status: ${message.status}`);

            } catch (error) {
                console.log(`   ❌ SMS failed: ${error.message}`);
                console.log(`   📋 Error code: ${error.code || 'Unknown'}`);
            }
        }

        console.log('\n📋 Summary:');
        console.log('   - If US/UK numbers work but Algeria doesn\'t, it\'s a country restriction');
        console.log('   - If all numbers fail, it\'s a general trial account limitation');
        console.log('   - If some numbers work, you can use those for testing');

        console.log('\n🔧 Recommendations:');
        console.log('   1. For production: Upgrade to paid Twilio account');
        console.log('   2. For testing: Use a US/UK phone number');
        console.log('   3. For Algeria: Consider alternative SMS providers');

    } catch (error) {
        console.error('❌ Error testing SMS:', error.message);
    }
}

// Run the script
if (require.main === module) {
    testSMSDifferentNumber();
}

module.exports = { testSMSDifferentNumber };
