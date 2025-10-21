#!/usr/bin/env node

/**
 * Login Data Cleanup Script
 * 
 * Removes old login history data based on retention policies
 * Run this script regularly (e.g., daily via cron) to maintain data privacy
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../../src/models/User').default;
const AdminAuditLog = require('../../src/models/AdminAuditLog').default;

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

async function cleanupLoginHistory() {
    console.log('🧹 Starting login history cleanup...');

    try {
        const users = await User.find({});
        let totalCleaned = 0;
        let usersProcessed = 0;

        for (const user of users) {
            if (user.loginHistory && user.loginHistory.length > 0) {
                const originalLength = user.loginHistory.length;

                // Clean up expired entries
                await user.cleanupLoginHistory();

                const cleanedLength = user.loginHistory.length;
                const removedCount = originalLength - cleanedLength;

                if (removedCount > 0) {
                    console.log(`  📝 User ${user.email}: Removed ${removedCount} expired entries`);
                    totalCleaned += removedCount;
                }

                usersProcessed++;
            }
        }

        console.log(`✅ Cleanup complete: ${totalCleaned} entries removed from ${usersProcessed} users`);
        return { totalCleaned, usersProcessed };
    } catch (error) {
        console.error('❌ Error during login history cleanup:', error);
        throw error;
    }
}

async function cleanupAuditLogs() {
    console.log('🧹 Starting audit log cleanup...');

    try {
        // Delete audit logs older than 1 year (handled by TTL index, but let's be explicit)
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

        const result = await AdminAuditLog.deleteMany({
            timestamp: { $lt: oneYearAgo }
        });

        console.log(`✅ Audit log cleanup complete: ${result.deletedCount} old entries removed`);
        return result.deletedCount;
    } catch (error) {
        console.error('❌ Error during audit log cleanup:', error);
        throw error;
    }
}

async function generateCleanupReport() {
    console.log('📊 Generating cleanup report...');

    try {
        // Count total users
        const totalUsers = await User.countDocuments();

        // Count users with login history
        const usersWithHistory = await User.countDocuments({
            'loginHistory.0': { $exists: true }
        });

        // Count total login entries
        const totalLoginEntries = await User.aggregate([
            { $unwind: '$loginHistory' },
            { $count: 'total' }
        ]);

        // Count total audit log entries
        const totalAuditEntries = await AdminAuditLog.countDocuments();

        console.log('\n📈 Cleanup Report:');
        console.log(`  👥 Total users: ${totalUsers}`);
        console.log(`  📝 Users with login history: ${usersWithHistory}`);
        console.log(`  🔐 Total login entries: ${totalLoginEntries[0]?.total || 0}`);
        console.log(`  📋 Total audit log entries: ${totalAuditEntries}`);

        return {
            totalUsers,
            usersWithHistory,
            totalLoginEntries: totalLoginEntries[0]?.total || 0,
            totalAuditEntries
        };
    } catch (error) {
        console.error('❌ Error generating report:', error);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting login data cleanup process...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
        await connectToDatabase();

        // Generate initial report
        console.log('\n📊 Pre-cleanup report:');
        await generateCleanupReport();

        // Cleanup login history
        console.log('\n🧹 Phase 1: Login History Cleanup');
        const loginCleanup = await cleanupLoginHistory();

        // Cleanup audit logs
        console.log('\n🧹 Phase 2: Audit Log Cleanup');
        const auditCleanup = await cleanupAuditLogs();

        // Generate final report
        console.log('\n📊 Post-cleanup report:');
        await generateCleanupReport();

        console.log('\n✅ Cleanup process completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`  🗑️  Login entries removed: ${loginCleanup.totalCleaned}`);
        console.log(`  👥 Users processed: ${loginCleanup.usersProcessed}`);
        console.log(`  📋 Audit entries removed: ${auditCleanup}`);

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
    cleanupLoginHistory,
    cleanupAuditLogs,
    generateCleanupReport
};
