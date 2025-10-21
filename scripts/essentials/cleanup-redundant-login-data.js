#!/usr/bin/env node

/**
 * Cleanup Redundant Login Data Script
 * 
 * Removes redundant login tracking fields and migrates to simplified system
 * - Removes: lastLogin, lastLoginIp, failedLoginAttempts
 * - Keeps: loginHistory, accountLockedUntil
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function cleanupRedundantFields() {
    console.log('🧹 Starting cleanup of redundant login fields...');

    try {
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Get all users with redundant fields
        const users = await User.find({
            $or: [
                { lastLogin: { $exists: true } },
                { lastLoginIp: { $exists: true } },
                { failedLoginAttempts: { $exists: true } }
            ]
        });

        console.log(`📊 Found ${users.length} users with redundant fields`);

        let cleanedCount = 0;

        for (const user of users) {
            const updateData = {};
            let hasChanges = false;

            // Remove redundant fields
            if (user.lastLogin !== undefined) {
                updateData.$unset = { lastLogin: 1 };
                hasChanges = true;
                console.log(`  📝 User ${user.email}: Removing lastLogin field`);
            }

            if (user.lastLoginIp !== undefined) {
                if (!updateData.$unset) updateData.$unset = {};
                updateData.$unset.lastLoginIp = 1;
                hasChanges = true;
                console.log(`  📝 User ${user.email}: Removing lastLoginIp field`);
            }

            if (user.failedLoginAttempts !== undefined) {
                if (!updateData.$unset) updateData.$unset = {};
                updateData.$unset.failedLoginAttempts = 1;
                hasChanges = true;
                console.log(`  📝 User ${user.email}: Removing failedLoginAttempts field`);
            }

            if (hasChanges) {
                await User.updateOne({ _id: user._id }, updateData);
                cleanedCount++;
            }
        }

        console.log(`✅ Cleanup complete: ${cleanedCount} users cleaned`);
        return { cleanedCount, totalUsers: users.length };
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

async function verifyCleanup() {
    console.log('🔍 Verifying cleanup results...');

    try {
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Check for remaining redundant fields
        const usersWithRedundantFields = await User.find({
            $or: [
                { lastLogin: { $exists: true } },
                { lastLoginIp: { $exists: true } },
                { failedLoginAttempts: { $exists: true } }
            ]
        });

        if (usersWithRedundantFields.length === 0) {
            console.log('✅ All redundant fields successfully removed');
        } else {
            console.log(`⚠️  ${usersWithRedundantFields.length} users still have redundant fields`);
            usersWithRedundantFields.forEach(user => {
                console.log(`  - ${user.email}: ${Object.keys(user.toObject()).filter(key =>
                    ['lastLogin', 'lastLoginIp', 'failedLoginAttempts'].includes(key)
                ).join(', ')}`);
            });
        }

        // Check login history integrity
        const usersWithLoginHistory = await User.find({
            'loginHistory.0': { $exists: true }
        });

        console.log(`📊 Users with login history: ${usersWithLoginHistory.length}`);

        for (const user of usersWithLoginHistory) {
            const loginCount = user.loginHistory ? user.loginHistory.length : 0;
            const successfulLogins = user.loginHistory ?
                user.loginHistory.filter(entry => entry.success).length : 0;
            const failedLogins = loginCount - successfulLogins;

            console.log(`  📝 ${user.email}: ${loginCount} total, ${successfulLogins} successful, ${failedLogins} failed`);
        }

        return {
            redundantFieldsRemaining: usersWithRedundantFields.length,
            usersWithLoginHistory: usersWithLoginHistory.length
        };
    } catch (error) {
        console.error('❌ Error during verification:', error);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting redundant login data cleanup...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
        await connectToDatabase();

        // Cleanup redundant fields
        console.log('\n🧹 Phase 1: Remove Redundant Fields');
        const cleanupResult = await cleanupRedundantFields();

        // Verify cleanup
        console.log('\n🔍 Phase 2: Verify Cleanup');
        const verificationResult = await verifyCleanup();

        console.log('\n✅ Cleanup process completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`  🗑️  Users cleaned: ${cleanupResult.cleanedCount}/${cleanupResult.totalUsers}`);
        console.log(`  📋 Redundant fields remaining: ${verificationResult.redundantFieldsRemaining}`);
        console.log(`  📝 Users with login history: ${verificationResult.usersWithLoginHistory}`);

    } catch (error) {
        console.error('❌ Cleanup process failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    cleanupRedundantFields,
    verifyCleanup
};
