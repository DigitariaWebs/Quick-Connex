/**
 * Clear All Active Sessions Script (TypeScript)
 * 
 * This script clears all active sessions from the database.
 * Use this when you hit the "Maximum 3 concurrent sessions allowed" error.
 */

import mongoose from 'mongoose';
import { DatabaseService } from '../src/lib/database/DatabaseService';

async function clearAllSessions() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await DatabaseService.connect();
    console.log('✅ Connected to MongoDB');

    // Import Session model
    const { default: Session } = await import('../src/models/Session');

    // Find all active sessions
    const activeSessions = await DatabaseService.findMany(Session, {
      isActive: true,
      revoked: { $ne: true }
    });

    console.log(`📊 Found ${activeSessions.length} active sessions`);

    if (activeSessions.length === 0) {
      console.log('✅ No active sessions to clear');
      return;
    }

    // Clear all active sessions
    const result = await DatabaseService.updateMany(
      Session,
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
    await DatabaseService.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearAllSessions().catch(console.error);