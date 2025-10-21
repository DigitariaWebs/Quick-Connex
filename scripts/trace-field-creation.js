/**
 * Trace where these fields are being created by intercepting MongoDB operations
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function traceFieldCreation() {
    try {
        console.log('🔍 Connecting to database...');

        // Enable Mongoose debugging to see all operations
        mongoose.set('debug', true);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Import the User model from the actual source
        console.log('\n📋 Checking User model source...');

        // Check if there are any indexes on these fields
        const db = mongoose.connection.db;
        const collection = db.collection('users');

        console.log('\n📋 Checking indexes on users collection:');
        const indexes = await collection.indexes();
        indexes.forEach(index => {
            console.log('  Index:', index);
        });

        // Check collection schema validation
        console.log('\n📋 Checking collection validation rules:');
        const collectionInfo = await db.listCollections({ name: 'users' }).toArray();
        if (collectionInfo.length > 0) {
            console.log('  Validation:', JSON.stringify(collectionInfo[0].options?.validator, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

traceFieldCreation();
