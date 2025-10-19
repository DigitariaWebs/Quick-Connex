#!/usr/bin/env node

/**
 * Session Cleanup Script
 * 
 * This script cleans up expired and suspicious sessions from the database.
 * It can be run manually or scheduled as a cron job.
 * 
 * Usage:
 *   node scripts/essentials/cleanup-sessions.js
 *   node scripts/essentials/cleanup-sessions.js --dry-run
 *   node scripts/essentials/cleanup-sessions.js --verbose
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Session model
const Session = require('../../src/models/Session').default;

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function cleanupSessions() {
    try {
        console.log('🧹 Starting session cleanup...');

        if (isDryRun) {
            console.log('🔍 DRY RUN MODE - No changes will be made');
        }

        // Clean up expired sessions
        const expiredQuery = {
            $or: [
                { expiresAt: { $lt: new Date() } },
                { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            ]
        };

        const expiredSessions = await Session.find(expiredQuery);
        console.log(`📊 Found ${expiredSessions.length} expired sessions`);

        if (isVerbose && expiredSessions.length > 0) {
            console.log('📋 Expired sessions:');
            expiredSessions.forEach(session => {
                console.log(`  - ${session.sessionId} (${session.userId}) - Expired: ${session.expiresAt}`);
            });
        }

        // Clean up suspicious sessions (older than 24 hours with high risk)
        const suspiciousQuery = {
            'securityContext.riskScore': { $gte: 70 },
            'securityContext.lastSecurityCheck': {
                $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            },
            isActive: true
        };

        const suspiciousSessions = await Session.find(suspiciousQuery);
        console.log(`🚨 Found ${suspiciousSessions.length} suspicious sessions`);

        if (isVerbose && suspiciousSessions.length > 0) {
            console.log('📋 Suspicious sessions:');
            suspiciousSessions.forEach(session => {
                console.log(`  - ${session.sessionId} (${session.userId}) - Risk: ${session.securityContext.riskScore}`);
            });
        }

        let totalCleaned = 0;

        if (!isDryRun) {
            // Delete expired sessions
            const expiredResult = await Session.deleteMany(expiredQuery);
            console.log(`🗑️  Deleted ${expiredResult.deletedCount} expired sessions`);
            totalCleaned += expiredResult.deletedCount;

            // Revoke suspicious sessions
            for (const session of suspiciousSessions) {
                await session.revokeSession(undefined, 'Suspicious activity detected by cleanup script');
                totalCleaned++;
            }
            console.log(`🚫 Revoked ${suspiciousSessions.length} suspicious sessions`);
        } else {
            totalCleaned = expiredSessions.length + suspiciousSessions.length;
            console.log(`🔍 Would clean up ${totalCleaned} sessions`);
        }

        // Get session statistics
        const stats = await Session.aggregate([
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    activeSessions: {
                        $sum: {
                            $cond: [
                                { $and: ['$isActive', { $not: '$revoked' }, { $gt: ['$expiresAt', new Date()] }] },
                                1,
                                0
                            ]
                        }
                    },
                    expiredSessions: {
                        $sum: {
                            $cond: [{ $lt: ['$expiresAt', new Date()] }], 1, 0 
            }
                    },
                    revokedSessions: {
                        $sum: {
                            $cond: ['$revoked'], 1, 0 
            }
                    },
                    highRiskSessions: {
                        $sum: {
                            $cond: [{ $gte: ['$securityContext.riskScore', 70] }], 1, 0
            }
                    }
                }
            }
        ]);

        console.log('\n📊 Session Statistics:');
        if (stats.length > 0) {
            const stat = stats[0];
            console.log(`  Total Sessions: ${stat.totalSessions}`);
            console.log(`  Active Sessions: ${stat.activeSessions}`);
            console.log(`  Expired Sessions: ${stat.expiredSessions}`);
            console.log(`  Revoked Sessions: ${stat.revokedSessions}`);
            console.log(`  High Risk Sessions: ${stat.highRiskSessions}`);
        }

        console.log(`\n✅ Session cleanup completed successfully!`);
        console.log(`🧹 Total sessions cleaned: ${totalCleaned}`);

        return {
            expired: expiredSessions.length,
            suspicious: suspiciousSessions.length,
            total: totalCleaned
        };

    } catch (error) {
        console.error('❌ Session cleanup failed:', error);
        throw error;
    }
}

async function main() {
    try {
        await connectToDatabase();
        await cleanupSessions();
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { cleanupSessions };
