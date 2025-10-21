/**
 * Check what fields are actually stored in the database
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkDatabaseSchema() {
    try {
        console.log('🔍 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get a user document to see what fields are actually stored
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        const user = await User.findOne({ email: 'arselene.tests@gmail.com' });
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('\n📋 User Document Fields:');
        console.log('📊 Total fields:', Object.keys(user.toObject()).length);

        // Check for the problematic fields
        const problematicFields = ['lastLogin', 'lastLoginIp', 'failedLoginAttempts', 'lastPasswordChange'];

        problematicFields.forEach(field => {
            if (user[field] !== undefined) {
                console.log(`❌ Found ${field}:`, user[field]);
            } else {
                console.log(`✅ ${field}: Not found`);
            }
        });

        // Check all fields
        console.log('\n📋 All Fields:');
        Object.keys(user.toObject()).forEach(field => {
            console.log(`  ${field}: ${typeof user[field]} - ${JSON.stringify(user[field])}`);
        });

        // Check if there are any hidden fields in the document
        console.log('\n📋 Document Keys:');
        console.log('  _id:', user._id);
        console.log('  __v:', user.__v);
        console.log('  email:', user.email);
        console.log('  userType:', user.userType);
        console.log('  loginHistory length:', user.loginHistory?.length || 0);
        console.log('  accountLockedUntil:', user.accountLockedUntil);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

checkDatabaseSchema();
