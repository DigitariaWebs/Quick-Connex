#!/usr/bin/env node

/**
 * Check SMS Details Script
 * 
 * This script checks the detailed status of a specific SMS message.
 */

const twilio = require('twilio');
require('dotenv').config({ path: '.env.local' });

async function checkSMSDetails() {
    try {
        console.log('📱 Checking SMS message details...');

        // Create Twilio client
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // Check the specific failed message
        const messageSid = 'SM0ad8e722d6edf1be21e5b39530ec6b21';

        console.log(`\n🔍 Checking message: ${messageSid}`);

        try {
            const message = await client.messages(messageSid).fetch();

            console.log('\n📋 Message Details:');
            console.log(`   SID: ${message.sid}`);
            console.log(`   From: ${message.from}`);
            console.log(`   To: ${message.to}`);
            console.log(`   Body: ${message.body.substring(0, 100)}...`);
            console.log(`   Status: ${message.status}`);
            console.log(`   Direction: ${message.direction}`);
            console.log(`   Date Created: ${message.dateCreated}`);
            console.log(`   Date Updated: ${message.dateUpdated}`);
            console.log(`   Date Sent: ${message.dateSent || 'Not sent'}`);
            console.log(`   Error Code: ${message.errorCode || 'None'}`);
            console.log(`   Error Message: ${message.errorMessage || 'None'}`);
            console.log(`   Price: ${message.price || 'Not available'}`);
            console.log(`   Price Unit: ${message.priceUnit || 'Not available'}`);

            // Check message events
            console.log('\n📊 Message Events:');
            try {
                const events = await client.messages(messageSid).events.list();
                if (events.length > 0) {
                    events.forEach((event, index) => {
                        console.log(`   ${index + 1}. ${event.eventType} - ${event.eventDate}`);
                        if (event.eventData) {
                            console.log(`      Data: ${JSON.stringify(event.eventData)}`);
                        }
                    });
                } else {
                    console.log('   No events found');
                }
            } catch (error) {
                console.log(`   ❌ Could not fetch events: ${error.message}`);
            }

        } catch (error) {
            console.log(`❌ Could not fetch message details: ${error.message}`);
        }

        // Check account usage
        console.log('\n📊 Account Usage (Today):');
        try {
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

            const messages = await client.messages.list({
                dateSentAfter: startDate,
                dateSentBefore: endDate
            });

            console.log(`   Messages sent today: ${messages.length}`);
            messages.forEach((msg, index) => {
                console.log(`   ${index + 1}. To: ${msg.to} - Status: ${msg.status} - ${msg.dateCreated}`);
            });

        } catch (error) {
            console.log(`   ❌ Could not fetch usage: ${error.message}`);
        }

        // Check trial account restrictions
        console.log('\n⚠️  Trial Account Restrictions:');
        console.log('   - Can only send SMS to verified phone numbers');
        console.log('   - Limited to 1 SMS per verified number per day');
        console.log('   - International SMS may have additional restrictions');
        console.log('   - Some countries may block SMS from trial accounts');

        console.log('\n🔧 Solutions:');
        console.log('   1. Wait 24 hours and try again (rate limit reset)');
        console.log('   2. Upgrade to a paid Twilio account');
        console.log('   3. Use a different SMS provider for international numbers');
        console.log('   4. Test with a different phone number');

    } catch (error) {
        console.error('❌ Error checking SMS details:', error.message);
    }
}

// Run the script
if (require.main === module) {
    checkSMSDetails();
}

module.exports = { checkSMSDetails };
