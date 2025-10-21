/**
 * Debug script to check what fields are being set during login
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function debugLoginFields() {
    try {
        console.log('🔍 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get a user to check their fields
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        const users = await User.find({}).limit(3);
        console.log('\n📊 Found users:', users.length);

        for (const user of users) {
            console.log(`\n👤 User: ${user.email}`);
            console.log('📋 Fields present:');

            const fieldsToCheck = [
                'lastLogin',
                'lastLoginIp',
                'lastPasswordChange',
                'loginHistory',
                'accountLockedUntil',
                'failedLoginAttempts'
            ];

            fieldsToCheck.forEach(field => {
                if (user[field] !== undefined) {
                    console.log(`  ✅ ${field}: ${typeof user[field]} - ${JSON.stringify(user[field])}`);
                } else {
                    console.log(`  ❌ ${field}: undefined`);
                }
            });

            if (user.loginHistory && user.loginHistory.length > 0) {
                console.log(`  📝 loginHistory entries: ${user.loginHistory.length}`);
                console.log(`  📝 Latest entry:`, user.loginHistory[user.loginHistory.length - 1]);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

debugLoginFields();
