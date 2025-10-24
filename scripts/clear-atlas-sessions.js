#!/usr/bin/env node

/**
 * Clear MongoDB Atlas Sessions Script
 * 
 * This script connects to your MongoDB Atlas database and clears all active sessions
 * to allow fresh login testing.
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function clearAtlasSessions() {
    console.log('🧹 Starting MongoDB Atlas session cleanup...');

    // Get MongoDB URI from environment
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ MONGODB_URI not found in environment variables');
        console.error('Please check your .env.local file');
        process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log(`📍 URI: ${uri.substring(0, 20)}...`);

    let client;

    try {
        // Connect to MongoDB Atlas
        client = new MongoClient(uri);
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const db = client.db();

        // Clear sessions collection
        console.log('🗑️  Clearing sessions...');
        const sessionsResult = await db.collection('sessions').deleteMany({});
        console.log(`✅ Deleted ${sessionsResult.deletedCount} sessions`);

        // Clear any rate limiting data
        console.log('🗑️  Clearing rate limiting data...');
        const rateLimitResult = await db.collection('ratelimits').deleteMany({});
        console.log(`✅ Deleted ${rateLimitResult.deletedCount} rate limit records`);

        // Clear any failed attempts
        console.log('🗑️  Clearing failed attempts...');
        const failedAttemptsResult = await db.collection('failedattempts').deleteMany({});
        console.log(`✅ Deleted ${failedAttemptsResult.deletedCount} failed attempt records`);

        // Clear any audit logs (optional - be careful with this in production)
        console.log('🗑️  Clearing recent audit logs...');
        const auditResult = await db.collection('auditlogs').deleteMany({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });
        console.log(`✅ Deleted ${auditResult.deletedCount} recent audit logs`);

        console.log('🎉 MongoDB Atlas cleanup completed!');
        console.log('💡 You can now test login with fresh credentials');

    } catch (error) {
        console.error('❌ MongoDB Atlas cleanup failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Check your MongoDB Atlas connection string');
        console.log('2. Ensure your IP is whitelisted in MongoDB Atlas');
        console.log('3. Check your database user permissions');
        console.log('4. Verify your .env.local file has the correct MONGODB_URI');
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Disconnected from MongoDB Atlas');
        }
    }
}

// Run the cleanup
clearAtlasSessions();


