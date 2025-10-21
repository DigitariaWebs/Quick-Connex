/**
 * Cleanup script to remove lastPasswordChange field from all users
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function cleanupLastPasswordChange() {
    try {
        console.log('🚀 Starting lastPasswordChange cleanup...');
        console.log('⏰ Started at:', new Date().toISOString());

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Find users with lastPasswordChange field
        const usersWithField = await User.find({ lastPasswordChange: { $exists: true } });
        console.log(`📊 Found ${usersWithField.length} users with lastPasswordChange field`);

        if (usersWithField.length > 0) {
            console.log('🧹 Removing lastPasswordChange field from all users...');

            const result = await User.updateMany(
                { lastPasswordChange: { $exists: true } },
                { $unset: { lastPasswordChange: "" } }
            );

            console.log(`✅ Cleanup complete: ${result.modifiedCount} users updated`);
        } else {
            console.log('✅ No users found with lastPasswordChange field');
        }

        // Verify cleanup
        const remainingUsers = await User.find({ lastPasswordChange: { $exists: true } });
        console.log(`🔍 Verification: ${remainingUsers.length} users still have lastPasswordChange field`);

        if (remainingUsers.length === 0) {
            console.log('✅ All lastPasswordChange fields successfully removed');
        } else {
            console.log('❌ Some users still have lastPasswordChange field');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

cleanupLastPasswordChange();
