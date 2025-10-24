#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkAuditLogs() {
    console.log('🔍 Checking AuthService audit logs in MongoDB Atlas...');

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db();

    // Get total audit logs count
    const totalCount = await db.collection('auditlogs').countDocuments();
    console.log(`📊 Total audit logs in database: ${totalCount}`);

    // Get recent audit logs (last 2 hours)
    const recentLogs = await db.collection('auditlogs').find({
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(20).toArray();

    console.log(`\n🕐 Recent audit logs (last 2 hours): ${recentLogs.length}`);

    if (recentLogs.length > 0) {
        console.log('\n📋 RECENT AUDIT LOGS:');
        console.log('='.repeat(60));

        recentLogs.forEach((log, index) => {
            console.log(`\n${index + 1}. ${log.action || 'Unknown Action'}`);
            console.log(`   📅 Date: ${new Date(log.createdAt).toLocaleString()}`);
            console.log(`   👤 Actor: ${log.actorEmail || 'N/A'} (${log.actorType || 'N/A'})`);
            console.log(`   🎯 Target: ${log.targetResourceType || 'N/A'}`);
            console.log(`   📝 Description: ${log.description || 'N/A'}`);
            console.log(`   ✅ Success: ${log.success}`);
            console.log(`   🔒 Risk Level: ${log.riskLevel || 'N/A'}`);
            if (log.requestInfo) {
                console.log(`   🌐 IP: ${log.requestInfo.ipAddress || 'N/A'}`);
                console.log(`   🖥️  User Agent: ${log.requestInfo.userAgent?.substring(0, 50) || 'N/A'}...`);
            }
        });
    }

    // Check for authentication-related logs specifically
    const authLogs = await db.collection('auditlogs').find({
        action: { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_CREATED', 'SESSION_REVOKED'] }
    }).sort({ createdAt: -1 }).limit(10).toArray();

    console.log(`\n🔐 Authentication-related logs: ${authLogs.length}`);

    if (authLogs.length > 0) {
        console.log('\n🔑 AUTHENTICATION AUDIT LOGS:');
        console.log('='.repeat(60));

        authLogs.forEach((log, index) => {
            console.log(`\n${index + 1}. ${log.action}`);
            console.log(`   📅 Date: ${new Date(log.createdAt).toLocaleString()}`);
            console.log(`   👤 User: ${log.actorEmail || 'N/A'}`);
            console.log(`   📝 Description: ${log.description || 'N/A'}`);
            console.log(`   ✅ Success: ${log.success}`);
            console.log(`   🌐 IP: ${log.requestInfo?.ipAddress || 'N/A'}`);
        });
    }

    // Check audit log structure
    if (recentLogs.length > 0) {
        const sampleLog = recentLogs[0];
        console.log('\n📋 AUDIT LOG STRUCTURE VERIFICATION:');
        console.log('='.repeat(60));
        console.log('Required fields:');
        console.log(`  ✅ action: ${sampleLog.action ? '✓' : '✗'} (${sampleLog.action})`);
        console.log(`  ✅ actorEmail: ${sampleLog.actorEmail ? '✓' : '✗'} (${sampleLog.actorEmail})`);
        console.log(`  ✅ actorType: ${sampleLog.actorType ? '✓' : '✗'} (${sampleLog.actorType})`);
        console.log(`  ✅ targetResourceType: ${sampleLog.targetResourceType ? '✓' : '✗'} (${sampleLog.targetResourceType})`);
        console.log(`  ✅ description: ${sampleLog.description ? '✓' : '✗'} (${sampleLog.description})`);
        console.log(`  ✅ success: ${sampleLog.success !== undefined ? '✓' : '✗'} (${sampleLog.success})`);
        console.log(`  ✅ createdAt: ${sampleLog.createdAt ? '✓' : '✗'} (${sampleLog.createdAt})`);
        console.log(`  ✅ requestInfo: ${sampleLog.requestInfo ? '✓' : '✗'} (${sampleLog.requestInfo ? 'Present' : 'Missing'})`);

        console.log('\nSecurity fields:');
        console.log(`  ✅ riskLevel: ${sampleLog.riskLevel ? '✓' : '✗'} (${sampleLog.riskLevel})`);
        console.log(`  ✅ isSensitive: ${sampleLog.isSensitive !== undefined ? '✓' : '✗'} (${sampleLog.isSensitive})`);
        console.log(`  ✅ requiresReview: ${sampleLog.requiresReview !== undefined ? '✓' : '✗'} (${sampleLog.requiresReview})`);
    }

    await client.close();
    console.log('\n🎉 Audit log analysis completed!');
}

checkAuditLogs().catch(console.error);


