/**
 * Clear reset token for testing
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

async function clearResetToken() {
    try {
        console.log('🧹 Clearing reset token for testing...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get user by email
        const email = process.argv[2] || 'arselene.tests@gmail.com';
        console.log(`📧 Clearing token for user: ${email}`);

        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            resetPasswordToken: String,
            resetPasswordExpires: Date
        }));

        const result = await User.updateOne(
            { email: email.toLowerCase() },
            {
                $unset: {
                    resetPasswordToken: 1,
                    resetPasswordExpires: 1
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log('✅ Reset token cleared successfully');
        } else {
            console.log('ℹ️  No token was set (user might not exist)');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

clearResetToken();
