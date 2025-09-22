#!/usr/bin/env node

/**
 * Check Twilio Status Script
 * 
 * This script checks the Twilio account status and message delivery status.
 */

const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

async function checkTwilioStatus() {
    try {
        console.log('📱 Checking Twilio account status...');

        // Create Twilio client
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Get account details
        console.log('\n📊 Account Information:');
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(`   Account SID: ${account.sid}`);
        console.log(`   Account Name: ${account.friendlyName}`);
        console.log(`   Status: ${account.status}`);
        console.log(`   Type: ${account.type}`);
        console.log(`   Created: ${account.dateCreated}`);

        // Check account balance
        console.log('\n💰 Account Balance:');
        try {
            const balance = await client.balance.fetch();
            console.log(`   Balance: ${balance.balance} ${balance.currency}`);
        } catch (error) {
            console.log(`   ❌ Could not fetch balance: ${error.message}`);
        }

        // Check phone numbers
        console.log('\n📞 Phone Numbers:');
        try {
            const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
            if (phoneNumbers.length > 0) {
                phoneNumbers.forEach((number, index) => {
                    console.log(`   ${index + 1}. ${number.phoneNumber} - ${number.friendlyName || 'No name'}`);
                });
            } else {
                console.log('   No phone numbers found');
            }
        } catch (error) {
            console.log(`   ❌ Could not fetch phone numbers: ${error.message}`);
        }

        // Check recent messages
        console.log('\n📨 Recent Messages:');
        try {
            const messages = await client.messages.list({ limit: 5 });
            if (messages.length > 0) {
                messages.forEach((message, index) => {
                    console.log(`   ${index + 1}. ${message.sid}`);
                    console.log(`      From: ${message.from}`);
                    console.log(`      To: ${message.to}`);
                    console.log(`      Status: ${message.status}`);
                    console.log(`      Date: ${message.dateCreated}`);
                    console.log(`      Error: ${message.errorMessage || 'None'}`);
                    console.log('');
                });
            } else {
                console.log('   No recent messages found');
            }
        } catch (error) {
            console.log(`   ❌ Could not fetch messages: ${error.message}`);
        }

        // Check trial account limitations
        if (account.type === 'Trial') {
            console.log('\n⚠️  TRIAL ACCOUNT LIMITATIONS:');
            console.log('   - Can only send SMS to verified phone numbers');
            console.log('   - Limited to 1 SMS per verified number per day');
            console.log('   - Must verify recipient phone numbers first');
            console.log('   - Cannot send to international numbers without verification');

            console.log('\n🔧 To fix SMS delivery issues:');
            console.log('   1. Go to Twilio Console: https://console.twilio.com/');
            console.log('   2. Navigate to Phone Numbers > Manage > Verified Caller IDs');
            console.log('   3. Add and verify your phone number: +213793601892');
            console.log('   4. Or upgrade to a paid account for full functionality');
        }

        // Check if the phone number is verified
        console.log('\n🔍 Checking verified phone numbers...');
        try {
            const verifiedNumbers = await client.outgoingCallerIds.list();
            if (verifiedNumbers.length > 0) {
                console.log('   Verified phone numbers:');
                verifiedNumbers.forEach((number, index) => {
                    console.log(`   ${index + 1}. ${number.phoneNumber} - ${number.friendlyName || 'No name'}`);
                });
            } else {
                console.log('   No verified phone numbers found');
                console.log('   ❌ This is likely why SMS is not being delivered!');
            }
        } catch (error) {
            console.log(`   ❌ Could not fetch verified numbers: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error checking Twilio status:', error.message);
    }
}

// Run the script
if (require.main === module) {
    checkTwilioStatus();
}

module.exports = { checkTwilioStatus };
