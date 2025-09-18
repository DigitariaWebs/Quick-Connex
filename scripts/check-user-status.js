/**
 * Check user status in database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

async function checkUserStatus() {
    try {
        console.log('🔍 Checking user status in database...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get user by email
        const email = process.argv[2] || 'arselene.tests@gmail.com';
        console.log(`📧 Looking for user: ${email}`);

        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            firstName: String,
            lastName: String,
            status: String,
            resetPasswordToken: String,
            resetPasswordExpires: Date
        }));

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found in database');
            console.log('\n💡 The user needs to exist and be approved for password reset to work');
            return;
        }

        console.log('✅ User found:');
        console.log('   Name:', `${user.firstName} ${user.lastName}`);
        console.log('   Email:', user.email);
        console.log('   Status:', user.status);
        console.log('   Reset Token:', user.resetPasswordToken ? '***set***' : 'not set');
        console.log('   Reset Expires:', user.resetPasswordExpires || 'not set');

        if (user.status !== 'approved') {
            console.log('\n⚠️  User is not approved! Password reset only works for approved users.');
            console.log('   Current status:', user.status);
        } else {
            console.log('\n✅ User is approved and can reset password');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkUserStatus();
