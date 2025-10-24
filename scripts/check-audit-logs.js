#!/usr/bin/env node

/**
 * Check Audit Logs Script
 * 
 * This script connects to MongoDB Atlas and checks if the AuthService
 * is properly creating audit logs using the existing AuditLog system.
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkAuditLogs() {
    console.log('🔍 Checking AuthService audit logs...');

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');

    let client;

    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const db = client.db();

        // Check audit logs collection
        console.log('\n📊 AUDIT LOGS ANALYSIS');
        console.log('='.repeat(50));

        // Get total count
        const totalLogs = await db.collection('auditlogs').countDocuments();
        console.log(`📈 Total audit logs: ${totalLogs}`);

        // Get recent logs (last 1 hour)
        const recentLogs = await db.collection('auditlogs').find({
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        }).sort({ createdAt: -1 }).limit(20).toArray();

        console.log(`\n🕐 Recent audit logs (last hour): ${recentLogs.length}`);

        if (recentLogs.length > 0) {
            console.log('\n📋 RECENT AUDIT LOGS:');
            console.log('-'.repeat(50));

            recentLogs.forEach((log, index) => {
                console.log(`\n${index + 1}. ${log.action || 'Unknown Action'}`);
                console.log(`   📅 Date: ${log.createdAt}`);
                console.log(`   👤 Actor: ${log.actorEmail || 'N/A'} (${log.actorType || 'N/A'})`);
                console.log(`   🎯 Target: ${log.targetResourceType || 'N/A'}`);
                console.log(`   📝 Description: ${log.description || 'N/A'}`);
                console.log(`   ✅ Success: ${log.success}`);
                console.log(`   🔒 Risk Level: ${log.riskLevel || 'N/A'}`);
                console.log(`   🌐 IP: ${log.requestInfo?.ipAddress || 'N/A'}`);
                console.log(`   🖥️  User Agent: ${log.requestInfo?.userAgent?.substring(0, 50) || 'N/A'}...`);
            });
        }

        // Check for authentication-related logs
        const authLogs = await db.collection('auditlogs').find({
            action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_CREATED', 'SESSION_REVOKED'] }
        }).sort({ createdAt: -1 }).limit(10).toArray();

        console.log(`\n🔐 Authentication logs: ${authLogs.length}`);

        if (authLogs.length > 0) {
            console.log('\n🔑 AUTHENTICATION AUDIT LOGS:');
            console.log('-'.repeat(50));

            authLogs.forEach((log, index) => {
                console.log(`\n${index + 1}. ${log.action}`);
                console.log(`   📅 Date: ${log.createdAt}`);
                console.log(`   👤 User: ${log.actorEmail || 'N/A'}`);
                console.log(`   📝 Description: ${log.description || 'N/A'}`);
                console.log(`   ✅ Success: ${log.success}`);
                console.log(`   🌐 IP: ${log.requestInfo?.ipAddress || 'N/A'}`);
            });
        }

        // Check for security-related logs
        const securityLogs = await db.collection('auditlogs').find({
            riskLevel: { $in: ['HIGH', 'MEDIUM', 'LOW'] }
        }).sort({ createdAt: -1 }).limit(5).toArray();

        console.log(`\n🛡️ Security logs: ${securityLogs.length}`);

        if (securityLogs.length > 0) {
            console.log('\n🔒 SECURITY AUDIT LOGS:');
            console.log('-'.repeat(50));

            securityLogs.forEach((log, index) => {
                console.log(`\n${index + 1}. Risk Level: ${log.riskLevel}`);
                console.log(`   📅 Date: ${log.createdAt}`);
                console.log(`   👤 User: ${log.actorEmail || 'N/A'}`);
                console.log(`   📝 Description: ${log.description || 'N/A'}`);
                console.log(`   🔍 Requires Review: ${log.requiresReview || false}`);
                console.log(`   🔐 Sensitive: ${log.isSensitive || false}`);
            });
        }

        // Check audit log structure
        if (recentLogs.length > 0) {
            const sampleLog = recentLogs[0];
            console.log('\n📋 AUDIT LOG STRUCTURE:');
            console.log('-'.repeat(50));
            console.log('Required fields:');
            console.log(`  ✅ action: ${sampleLog.action ? '✓' : '✗'}`);
            console.log(`  ✅ actorEmail: ${sampleLog.actorEmail ? '✓' : '✗'}`);
            console.log(`  ✅ actorType: ${sampleLog.actorType ? '✓' : '✗'}`);
            console.log(`  ✅ targetResourceType: ${sampleLog.targetResourceType ? '✓' : '✗'}`);
            console.log(`  ✅ description: ${sampleLog.description ? '✓' : '✗'}`);
            console.log(`  ✅ success: ${sampleLog.success !== undefined ? '✓' : '✗'}`);
            console.log(`  ✅ createdAt: ${sampleLog.createdAt ? '✓' : '✗'}`);
            console.log(`  ✅ requestInfo: ${sampleLog.requestInfo ? '✓' : '✗'}`);

            console.log('\nSecurity fields:');
            console.log(`  ✅ riskLevel: ${sampleLog.riskLevel ? '✓' : '✗'}`);
            console.log(`  ✅ isSensitive: ${sampleLog.isSensitive !== undefined ? '✓' : '✗'}`);
            console.log(`  ✅ requiresReview: ${sampleLog.requiresReview !== undefined ? '✓' : '✗'}`);
        }

        console.log('\n🎉 Audit log analysis completed!');

    } catch (error) {
        console.error('❌ Audit log check failed:', error.message);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Disconnected from MongoDB Atlas');
        }
    }
}

// Run the check
checkAuditLogs();


