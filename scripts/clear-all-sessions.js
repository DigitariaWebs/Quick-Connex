/**
 * Clear All Active Sessions Script
 * 
 * This script clears all active sessions from the database.
 * Use this when you hit the "Maximum 3 concurrent sessions allowed" error.
 */

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients-management';

async function clearAllSessions() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the Session model
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));

        // Find all active sessions
        const activeSessions = await Session.find({
            isActive: true,
            revoked: { $ne: true }
        });

        console.log(`📊 Found ${activeSessions.length} active sessions`);

        if (activeSessions.length === 0) {
            console.log('✅ No active sessions to clear');
            return;
        }

        // Clear all active sessions
        const result = await Session.updateMany(
            { isActive: true, revoked: { $ne: true } },
            {
                $set: {
                    isActive: false,
                    revoked: true,
                    revokedAt: new Date(),
                    revokedReason: 'Manual cleanup via script'
                }
            }
        );

        console.log(`✅ Cleared ${result.modifiedCount} active sessions`);
        console.log('🎉 All sessions have been cleared. You can now login again.');

    } catch (error) {
        console.error('❌ Error clearing sessions:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
clearAllSessions().catch(console.error);