#!/usr/bin/env node

/**
 * Session Manager Script
 * 
 * Comprehensive session management tool for:
 * - Clear all sessions
 * - Clear sessions for specific user
 * - List active sessions
 * - Session statistics
 */

import { DatabaseService } from '../src/lib/database/DatabaseService.js';
import { AuditService } from '../src/lib/services/audit-service.js';

class SessionManager {
    constructor() {
        this.dbService = new DatabaseService();
    }

    async connect() {
        await this.dbService.connect();
    }

    async disconnect() {
        await DatabaseService.disconnect();
    }

    /**
     * List all active sessions with details
     */
    async listSessions() {
        console.log('📋 Fetching active sessions...');

        const sessions = await this.dbService.find('Session', {});
        const users = await this.dbService.find('User', {});

        const userMap = new Map(users.map(user => [user._id.toString(), user]));

        console.log(`\n📊 Active Sessions (${sessions.length}):`);
        console.log('─'.repeat(80));

        sessions.forEach((session, index) => {
            const user = userMap.get(session.userId.toString());
            const expiresAt = new Date(session.expiresAt);
            const lastAccessed = new Date(session.lastAccessedAt);
            const isExpired = expiresAt < new Date();

            console.log(`${index + 1}. Session: ${session.sessionId.substring(0, 8)}...`);
            console.log(`   User: ${user ? user.email : 'Unknown'} (${user ? user.userType : 'N/A'})`);
            console.log(`   Device: ${session.deviceInfo?.deviceType || 'Unknown'} - ${session.deviceInfo?.browser || 'Unknown'}`);
            console.log(`   IP: ${session.ipAddress}`);
            console.log(`   Last Access: ${lastAccessed.toLocaleString()}`);
            console.log(`   Expires: ${expiresAt.toLocaleString()} ${isExpired ? '❌ EXPIRED' : '✅ Active'}`);
            console.log(`   Risk: ${session.securityContext?.riskLevel || 'Unknown'}`);
            console.log('─'.repeat(80));
        });

        return sessions;
    }

    /**
     * Get session statistics
     */
    async getSessionStats() {
        const sessions = await this.dbService.find('Session', {});
        const users = await this.dbService.find('User', {});

        const stats = {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => new Date(s.expiresAt) > new Date()).length,
            expiredSessions: sessions.filter(s => new Date(s.expiresAt) <= new Date()).length,
            uniqueUsers: new Set(sessions.map(s => s.userId.toString())).size,
            totalUsers: users.length,
            riskLevels: {
                low: sessions.filter(s => s.securityContext?.riskLevel === 'LOW').length,
                medium: sessions.filter(s => s.securityContext?.riskLevel === 'MEDIUM').length,
                high: sessions.filter(s => s.securityContext?.riskLevel === 'HIGH').length
            },
            deviceTypes: {},
            browsers: {}
        };

        // Count device types and browsers
        sessions.forEach(session => {
            const deviceType = session.deviceInfo?.deviceType || 'Unknown';
            const browser = session.deviceInfo?.browser || 'Unknown';

            stats.deviceTypes[deviceType] = (stats.deviceTypes[deviceType] || 0) + 1;
            stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear all sessions
     */
    async clearAllSessions() {
        console.log('🚨 Clearing ALL sessions...');

        const sessions = await this.dbService.find('Session', {});
        const userIds = [...new Set(sessions.map(s => s.userId))];

        console.log(`📊 Found ${sessions.length} sessions for ${userIds.length} users`);

        if (sessions.length === 0) {
            console.log('✅ No sessions to clear');
            return { deletedCount: 0, affectedUsers: 0 };
        }

        // Confirm before proceeding
        console.log('\n⚠️  WARNING: This will log out ALL users!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Delete all sessions
        const result = await this.dbService.deleteMany('Session', {});

        // Log audit events
        for (const userId of userIds) {
            try {
                await AuditService.logAuthEvent({
                    action: 'SESSION_BULK_REVOKE',
                    actor: { type: 'SYSTEM', id: 'system', name: 'System Administrator' },
                    target: { type: 'USER', id: userId },
                    requestInfo: {
                        ipAddress: '127.0.0.1',
                        userAgent: 'Session Manager Script',
                        timestamp: new Date()
                    },
                    securityContext: { riskLevel: 'LOW', reason: 'Administrative session cleanup' },
                    outcome: 'SUCCESS',
                    details: { message: 'All sessions revoked by administrator' }
                });
            } catch (auditError) {
                console.warn(`⚠️ Failed to log audit for user ${userId}:`, auditError.message);
            }
        }

        console.log(`✅ Cleared ${result.deletedCount} sessions`);
        console.log(`👥 Affected ${userIds.length} users`);

        return { deletedCount: result.deletedCount, affectedUsers: userIds.length };
    }

    /**
     * Clear sessions for specific user
     */
    async clearUserSessions(userEmail) {
        console.log(`🔍 Finding user: ${userEmail}`);

        const user = await this.dbService.findOne('User', { email: userEmail });
        if (!user) {
            console.log(`❌ User not found: ${userEmail}`);
            return { deletedCount: 0 };
        }

        console.log(`👤 Found user: ${user.email} (${user.userType})`);

        const sessions = await this.dbService.find('Session', { userId: user._id });
        console.log(`📊 Found ${sessions.length} sessions for this user`);

        if (sessions.length === 0) {
            console.log('✅ No sessions to clear for this user');
            return { deletedCount: 0 };
        }

        const result = await this.dbService.deleteMany('Session', { userId: user._id });

        // Log audit event
        try {
            await AuditService.logAuthEvent({
                action: 'SESSION_BULK_REVOKE',
                actor: { type: 'SYSTEM', id: 'system', name: 'System Administrator' },
                target: { type: 'USER', id: user._id },
                requestInfo: {
                    ipAddress: '127.0.0.1',
                    userAgent: 'Session Manager Script',
                    timestamp: new Date()
                },
                securityContext: { riskLevel: 'LOW', reason: 'User session cleanup' },
                outcome: 'SUCCESS',
                details: { message: `All sessions revoked for user ${user.email}` }
            });
        } catch (auditError) {
            console.warn(`⚠️ Failed to log audit:`, auditError.message);
        }

        console.log(`✅ Cleared ${result.deletedCount} sessions for ${user.email}`);

        return { deletedCount: result.deletedCount };
    }

    /**
     * Clear expired sessions
     */
    async clearExpiredSessions() {
        console.log('🗑️ Clearing expired sessions...');

        const now = new Date();
        const result = await this.dbService.deleteMany('Session', {
            expiresAt: { $lt: now }
        });

        console.log(`✅ Cleared ${result.deletedCount} expired sessions`);
        return { deletedCount: result.deletedCount };
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const sessionManager = new SessionManager();

    try {
        await sessionManager.connect();

        switch (command) {
            case 'list':
                await sessionManager.listSessions();
                break;

            case 'stats':
                const stats = await sessionManager.getSessionStats();
                console.log('\n📊 Session Statistics:');
                console.log(`Total Sessions: ${stats.totalSessions}`);
                console.log(`Active Sessions: ${stats.activeSessions}`);
                console.log(`Expired Sessions: ${stats.expiredSessions}`);
                console.log(`Unique Users: ${stats.uniqueUsers}`);
                console.log(`Total Users: ${stats.totalUsers}`);
                console.log(`Risk Levels: Low(${stats.riskLevels.low}) Medium(${stats.riskLevels.medium}) High(${stats.riskLevels.high})`);
                console.log('Device Types:', stats.deviceTypes);
                console.log('Browsers:', stats.browsers);
                break;

            case 'clear-all':
                await sessionManager.clearAllSessions();
                break;

            case 'clear-user':
                const email = args[1];
                if (!email) {
                    console.log('❌ Usage: node session-manager.js clear-user <email>');
                    process.exit(1);
                }
                await sessionManager.clearUserSessions(email);
                break;

            case 'clear-expired':
                await sessionManager.clearExpiredSessions();
                break;

            default:
                console.log('🔧 Session Manager - Usage:');
                console.log('  node session-manager.js list              - List all sessions');
                console.log('  node session-manager.js stats              - Show session statistics');
                console.log('  node session-manager.js clear-all          - Clear ALL sessions');
                console.log('  node session-manager.js clear-user <email> - Clear sessions for user');
                console.log('  node session-manager.js clear-expired      - Clear expired sessions');
                break;
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await sessionManager.disconnect();
    }
}

if (require.main === module) {
    main();
}

export { SessionManager };
