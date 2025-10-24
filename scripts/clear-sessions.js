#!/usr/bin/env node

/**
 * Clear Active Sessions Script
 * 
 * This script clears all active sessions from the database
 * to allow fresh login testing.
 */

const mongoose = require('mongoose');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function clearActiveSessions() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to database');

        // Get the Session model
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));

        // Find all active sessions
        const activeSessions = await Session.find({
            isActive: true,
            revokedAt: { $exists: false }
        });

        console.log(`📊 Found ${activeSessions.length} active sessions`);

        if (activeSessions.length > 0) {
            // Clear all active sessions
            const result = await Session.updateMany(
                {
                    isActive: true,
                    revokedAt: { $exists: false }
                },
                {
                    $set: {
                        isActive: false,
                        revokedAt: new Date(),
                        revokedReason: 'Cleared for testing'
                    }
                }
            );

            console.log(`✅ Cleared ${result.modifiedCount} active sessions`);
        } else {
            console.log('ℹ️  No active sessions found');
        }

        // Also clear any expired sessions
        const expiredSessions = await Session.find({
            expiresAt: { $lt: new Date() }
        });

        if (expiredSessions.length > 0) {
            await Session.deleteMany({
                expiresAt: { $lt: new Date() }
            });
            console.log(`🗑️  Deleted ${expiredSessions.length} expired sessions`);
        }

        console.log('🎉 Session cleanup completed!');
        console.log('💡 You can now test login with fresh credentials');

    } catch (error) {
        console.error('❌ Error clearing sessions:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
    }
}

// Run the script
clearActiveSessions();


