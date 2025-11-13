#!/usr/bin/env node

/**
 * Script to test connections to both development and production databases
 * Usage:
 *   node scripts/essentials/test-database-connections.js              - Test both databases
 *   node scripts/essentials/test-database-connections.js --dev-only    - Test only development database
 *   node scripts/essentials/test-database-connections.js --prod-only   - Test only production database
 *   node scripts/essentials/test-database-connections.js --current     - Test current environment database
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const devOnly = args.includes('--dev-only');
const prodOnly = args.includes('--prod-only');
const currentOnly = args.includes('--current');

// Helper function to extract database name from URI
function getDatabaseName(uri) {
    try {
        const match = uri.match(/\/([^\/\?]+)(\?|$)/);
        return match && match[1] ? match[1] : 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

// Helper function to mask credentials in URI
function maskUri(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

// Test database connection
async function testConnection(uri, environment) {
    const dbName = getDatabaseName(uri);
    const maskedUri = maskUri(uri);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔌 Testing ${environment.toUpperCase()} Database Connection`);
    console.log('='.repeat(80));
    console.log(`Environment: ${environment}`);
    console.log(`Database Name: ${dbName}`);
    console.log(`URI: ${maskedUri}`);
    console.log('─'.repeat(80));

    let mongooseConnection = null;
    let mongoClient = null;

    try {
        // Test with Mongoose
        console.log('📦 Testing Mongoose connection...');
        const startTime = Date.now();
        mongooseConnection = await mongoose.createConnection(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        // Wait for connection to be ready
        await mongooseConnection.asPromise();
        const connectionTime = Date.now() - startTime;

        console.log(`✅ Mongoose connection successful (${connectionTime}ms)`);
        console.log(`   Host: ${mongooseConnection.host}:${mongooseConnection.port}`);
        console.log(`   Database: ${mongooseConnection.name}`);
        console.log(`   Ready State: ${mongooseConnection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

        // Test with native MongoDB client
        console.log('\n📦 Testing native MongoDB client connection...');
        const clientStartTime = Date.now();
        mongoClient = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });

        await mongoClient.connect();
        const clientConnectionTime = Date.now() - clientStartTime;
        const db = mongoClient.db();

        console.log(`✅ Native client connection successful (${clientConnectionTime}ms)`);
        console.log(`   Database: ${db.databaseName}`);

        // Test basic operations
        console.log('\n📦 Testing basic operations...');

        // List collections
        const collections = await db.listCollections().toArray();
        console.log(`   Collections found: ${collections.length}`);
        if (collections.length > 0) {
            console.log(`   Collection names: ${collections.slice(0, 5).map(c => c.name).join(', ')}${collections.length > 5 ? '...' : ''}`);
        }

        // Get database stats
        let stats = null;
        try {
            stats = await db.stats();
            console.log(`   Data size: ${Math.round(stats.dataSize / 1024 / 1024)} MB`);
            console.log(`   Storage size: ${Math.round(stats.storageSize / 1024 / 1024)} MB`);
            console.log(`   Documents: ${stats.objects}`);
            console.log(`   Indexes: ${stats.indexes}`);
        } catch (statsError) {
            console.log(`   ⚠️  Could not retrieve stats: ${statsError.message}`);
        }

        // Ping test
        const pingStartTime = Date.now();
        await db.admin().ping();
        const pingTime = Date.now() - pingStartTime;
        console.log(`   Ping latency: ${pingTime}ms`);

        console.log(`\n✅ All tests passed for ${environment} database!`);
        return {
            success: true,
            environment,
            database: dbName,
            connectionTime,
            clientConnectionTime,
            pingTime,
            collections: collections.length,
            stats: {
                dataSize: stats?.dataSize || 0,
                storageSize: stats?.storageSize || 0,
                objects: stats?.objects || 0,
                indexes: stats?.indexes || 0
            }
        };

    } catch (error) {
        console.error(`\n❌ Connection test failed for ${environment} database`);
        console.error(`   Error: ${error.message}`);
        if (error.name) {
            console.error(`   Error Type: ${error.name}`);
        }
        return {
            success: false,
            environment,
            database: dbName,
            error: error.message,
            errorType: error.name
        };
    } finally {
        // Clean up connections
        if (mongooseConnection && mongooseConnection.readyState === 1) {
            await mongooseConnection.close();
            console.log('   🔌 Mongoose connection closed');
        }
        if (mongoClient) {
            await mongoClient.close();
            console.log('   🔌 Native client connection closed');
        }
    }
}

// Get current environment database
function getCurrentEnvironmentDatabase() {
    const dbEnv = process.env.DATABASE_ENV?.toLowerCase();

    // Manual override takes precedence
    if (dbEnv === 'development' || dbEnv === 'production') {
        return dbEnv;
    }

    // If DATABASE_ENV is 'auto' or not set, use NODE_ENV
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    return nodeEnv === 'production' ? 'production' : 'development';
}

// Main function
async function testDatabases() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 DATABASE CONNECTION TEST');
    console.log('='.repeat(80));

    // Show current environment configuration
    const currentEnv = getCurrentEnvironmentDatabase();
    const nodeEnv = process.env.NODE_ENV || 'not set';
    const dbEnvOverride = process.env.DATABASE_ENV || 'not set (using NODE_ENV)';

    console.log('\n📋 Current Environment Configuration:');
    console.log(`   NODE_ENV: ${nodeEnv}`);
    console.log(`   DATABASE_ENV: ${dbEnvOverride}`);
    console.log(`   Active Environment: ${currentEnv}`);

    // Check which URIs are configured
    const hasDevUri = !!process.env.MONGODB_URI_DEV;
    const hasProdUri = !!process.env.MONGODB_URI_PROD;
    const hasGenericUri = !!process.env.MONGODB_URI;

    console.log('\n📋 Database URI Configuration:');
    console.log(`   MONGODB_URI_DEV: ${hasDevUri ? '✅ Set' : '❌ Not set'}`);
    console.log(`   MONGODB_URI_PROD: ${hasProdUri ? '✅ Set' : '❌ Not set'}`);
    console.log(`   MONGODB_URI: ${hasGenericUri ? '✅ Set (fallback)' : '❌ Not set'}`);

    const results = [];

    // Test development database
    if (!prodOnly && !currentOnly) {
        const devUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;
        if (devUri) {
            // Check for placeholder values
            if (devUri.includes('your_cluster') || devUri.includes('your_username') || devUri.includes('your_password')) {
                console.log('\n⚠️  Development database URI contains placeholder values!');
                console.log('   Please update MONGODB_URI_DEV in .env.local with your actual MongoDB Atlas connection string.');
                console.log('   Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority');
                results.push({
                    success: false,
                    environment: 'development',
                    database: getDatabaseName(devUri),
                    error: 'Placeholder values detected in connection string',
                    errorType: 'ConfigurationError'
                });
            } else {
                const result = await testConnection(devUri, 'development');
                results.push(result);
            }
        } else {
            console.log('\n⚠️  Skipping development database test: MONGODB_URI_DEV not configured');
        }
    }

    // Test production database
    if (!devOnly && !currentOnly) {
        const prodUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;
        if (prodUri) {
            // Check for placeholder values
            if (prodUri.includes('your_cluster') || prodUri.includes('your_username') || prodUri.includes('your_password')) {
                console.log('\n⚠️  Production database URI contains placeholder values!');
                console.log('   Please update MONGODB_URI_PROD in .env.local with your actual MongoDB Atlas connection string.');
                console.log('   Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority');
                results.push({
                    success: false,
                    environment: 'production',
                    database: getDatabaseName(prodUri),
                    error: 'Placeholder values detected in connection string',
                    errorType: 'ConfigurationError'
                });
            } else {
                const result = await testConnection(prodUri, 'production');
                results.push(result);
            }
        } else {
            console.log('\n⚠️  Skipping production database test: MONGODB_URI_PROD not configured');
        }
    }

    // Test current environment database
    if (currentOnly) {
        const currentUri = currentEnv === 'development'
            ? (process.env.MONGODB_URI_DEV || process.env.MONGODB_URI)
            : (process.env.MONGODB_URI_PROD || process.env.MONGODB_URI);

        if (currentUri) {
            // Check for placeholder values
            if (currentUri.includes('your_cluster') || currentUri.includes('your_username') || currentUri.includes('your_password')) {
                console.log(`\n⚠️  Current environment (${currentEnv}) database URI contains placeholder values!`);
                console.log(`   Please update MONGODB_URI_${currentEnv === 'development' ? 'DEV' : 'PROD'} in .env.local with your actual MongoDB Atlas connection string.`);
                console.log('   Format: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority');
                results.push({
                    success: false,
                    environment: `current (${currentEnv})`,
                    database: getDatabaseName(currentUri),
                    error: 'Placeholder values detected in connection string',
                    errorType: 'ConfigurationError'
                });
            } else {
                const result = await testConnection(currentUri, `current (${currentEnv})`);
                results.push(result);
            }
        } else {
            console.log(`\n⚠️  Cannot test current environment database: No URI configured for ${currentEnv}`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successful: ${successful.length}`);
    successful.forEach(result => {
        console.log(`   - ${result.environment}: ${result.database} (${result.connectionTime}ms)`);
    });

    if (failed.length > 0) {
        console.log(`\n❌ Failed: ${failed.length}`);
        failed.forEach(result => {
            console.log(`   - ${result.environment}: ${result.database}`);
            console.log(`     Error: ${result.error}`);
        });
    }

    console.log('\n' + '='.repeat(80));

    // Exit with appropriate code
    process.exit(failed.length > 0 ? 1 : 0);
}

// Run the script
testDatabases().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

