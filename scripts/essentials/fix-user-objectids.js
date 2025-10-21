const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function fixUserObjectIds() {
    try {
        console.log('🔧 Fixing User ObjectId References...');
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users with string references that look like ObjectIds
        console.log('🔍 Finding users with string ObjectId references...');
        const users = await mongoose.connection.db.collection('users').find({}).toArray();

        console.log(`📊 Found ${users.length} total users`);

        let fixedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            const updates = {};
            let hasUpdates = false;

            console.log(`\n👤 Processing: ${user.firstName} ${user.lastName} (${user.email})`);

            // Fix CIUSSS reference
            if (user.ciusss && typeof user.ciusss === 'string') {
                console.log(`  🔍 CIUSSS: "${user.ciusss}" (${typeof user.ciusss})`);

                // Check if it's a valid ObjectId string
                if (mongoose.Types.ObjectId.isValid(user.ciusss)) {
                    updates.ciusss = new mongoose.Types.ObjectId(user.ciusss);
                    hasUpdates = true;
                    console.log(`  ✅ Converting CIUSSS string to ObjectId`);
                } else {
                    console.log(`  ⚠️  CIUSSS string is not a valid ObjectId`);
                }
            }

            // Fix Hospital reference
            if (user.hospital && typeof user.hospital === 'string') {
                console.log(`  🔍 Hospital: "${user.hospital}" (${typeof user.hospital})`);

                // Check if it's a valid ObjectId string
                if (mongoose.Types.ObjectId.isValid(user.hospital)) {
                    updates.hospital = new mongoose.Types.ObjectId(user.hospital);
                    hasUpdates = true;
                    console.log(`  ✅ Converting Hospital string to ObjectId`);
                } else {
                    console.log(`  ⚠️  Hospital string is not a valid ObjectId`);
                }
            }

            // Update user if we have changes
            if (hasUpdates) {
                try {
                    await mongoose.connection.db.collection('users').updateOne(
                        { _id: user._id },
                        { $set: updates }
                    );
                    fixedCount++;
                    console.log(`  ✅ Updated user references`);
                } catch (error) {
                    errorCount++;
                    console.error(`  ❌ Error updating user:`, error.message);
                }
            } else {
                console.log(`  ⏭️  No changes needed`);
            }
        }

        // Verify the fix
        console.log('\n🔍 Verifying fixes...');
        const remainingStringRefs = await mongoose.connection.db.collection('users').find({
            $or: [
                { ciusss: { $type: 'string' } },
                { hospital: { $type: 'string' } }
            ]
        }).toArray();

        console.log('\n📊 Migration Summary:');
        console.log(`  ✅ Successfully fixed: ${fixedCount} users`);
        console.log(`  ❌ Errors: ${errorCount} users`);
        console.log(`  📊 Remaining string references: ${remainingStringRefs.length}`);

        if (remainingStringRefs.length > 0) {
            console.log('\n⚠️  Users still with string references:');
            remainingStringRefs.forEach(user => {
                console.log(`  - ${user.email}: ciusss=${typeof user.ciusss}, hospital=${typeof user.hospital}`);
            });
        } else {
            console.log('\n🎉 All string references have been converted to ObjectIds!');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

fixUserObjectIds();
