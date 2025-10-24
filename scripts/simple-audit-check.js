#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkAuditLogs() {
    console.log('🔍 Checking audit logs...');

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db();

    // Get recent audit logs
    const logs = await db.collection('auditlogs').find({}).sort({ createdAt: -1 }).limit(10).toArray();

    console.log(`📊 Found ${logs.length} recent audit logs`);

    logs.forEach((log, i) => {
        console.log(`\n${i + 1}. ${log.action || 'Unknown'}`);
        console.log(`   User: ${log.actorEmail || 'N/A'}`);
        console.log(`   Success: ${log.success}`);
        console.log(`   Date: ${log.createdAt}`);
    });

    await client.close();
}

checkAuditLogs().catch(console.error);


