#!/usr/bin/env node

/**
 * Database Cleanup Script
 * 
 * This script connects to your database and clears all sessions
 * to allow fresh testing.
 */

// Try different database connection methods
async function cleanupDatabase() {
    console.log('🧹 Starting database cleanup...');

    try {
        // Method 1: Try to connect to MongoDB directly
        const { MongoClient } = require('mongodb');

        // Try different connection strings
        const connectionStrings = [
            process.env.MONGODB_URI,
            'mongodb://localhost:27017/patients_management',
            'mongodb://127.0.0.1:27017/patients_management',
            'mongodb://localhost:27017/patients_management_test'
        ];

        let client;
        let connected = false;

        for (const uri of connectionStrings) {
            if (!uri) continue;

            try {
                console.log(`🔌 Trying to connect to: ${uri}`);
                client = new MongoClient(uri);
                await client.connect();
                console.log('✅ Connected to database');
                connected = true;
                break;
            } catch (error) {
                console.log(`❌ Failed to connect to: ${uri}`);
                continue;
            }
        }

        if (!connected) {
            console.log('❌ Could not connect to any database');
            console.log('💡 Please check your database connection or run:');
            console.log('   mongod --dbpath /path/to/your/db');
            return;
        }

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

        console.log('🎉 Database cleanup completed!');
        console.log('💡 You can now test login with fresh credentials');

        await client.close();

    } catch (error) {
        console.error('❌ Database cleanup failed:', error.message);
        console.log('\n💡 Alternative approaches:');
        console.log('1. Check if MongoDB is running: mongod --version');
        console.log('2. Start MongoDB: mongod --dbpath /path/to/your/db');
        console.log('3. Check your .env file for MONGODB_URI');
        console.log('4. Use a database GUI tool to manually clear sessions');
    }
}

// Run the cleanup
cleanupDatabase();


