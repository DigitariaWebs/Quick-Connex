#!/usr/bin/env node

/**
 * Script to find the exact collection name for audit logs
 * This helps locate audit logs in MongoDB Atlas dashboard
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function findAuditCollection() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // List all collections
        const collections = await db.listCollections().toArray();

        console.log('📋 All Collections in Database:');
        console.log('='.repeat(80));
        collections.forEach((collection, index) => {
            console.log(`${index + 1}. ${collection.name}`);
        });

        // Find audit-related collections
        console.log('\n🔍 Audit-related Collections:');
        console.log('='.repeat(80));
        const auditCollections = collections.filter(c =>
            c.name.toLowerCase().includes('audit') ||
            c.name.toLowerCase().includes('log')
        );

        if (auditCollections.length === 0) {
            console.log('❌ No collections found with "audit" or "log" in the name');
            console.log('\n💡 Mongoose automatically pluralizes model names:');
            console.log('   - Model: "AuditLog" → Collection: "auditlogs"');
            console.log('   - Try searching for: auditlogs (lowercase, plural)');
        } else {
            auditCollections.forEach(collection => {
                console.log(`   ✓ ${collection.name}`);
            });
        }

        // Check the actual collection name Mongoose would use
        console.log('\n📊 Checking Mongoose Model → Collection Mapping:');
        console.log('='.repeat(80));

        // Get collection stats for potential audit collections
        const possibleNames = ['auditlogs', 'auditlog', 'audit_logs', 'audit_log'];

        for (const name of possibleNames) {
            try {
                const collection = db.collection(name);
                const count = await collection.countDocuments();
                if (count > 0) {
                    console.log(`\n✅ Found collection "${name}" with ${count} documents`);

                    // Get a sample document
                    const sample = await collection.findOne();
                    if (sample) {
                        console.log(`   Sample document structure:`);
                        console.log(`   - _id: ${sample._id}`);
                        console.log(`   - action: ${sample.action || 'N/A'}`);
                        console.log(`   - category: ${sample.category || 'N/A'}`);
                        console.log(`   - actorId: ${sample.actorId || 'N/A'}`);
                        if (sample.targetResource) {
                            console.log(`   - targetResource.type: ${sample.targetResource.type || 'N/A'}`);
                            console.log(`   - targetResource.id: ${sample.targetResource.id || 'N/A'}`);
                        }
                    }
                }
            } catch (e) {
                // Collection doesn't exist
            }
        }

        // Check using the actual Mongoose model
        console.log('\n🔧 Checking via Mongoose Model:');
        console.log('='.repeat(80));

        const AuditLogSchema = new mongoose.Schema({}, { strict: false });
        const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
        const collectionName = AuditLogModel.collection.name;
        console.log(`   Model name: AuditLog`);
        console.log(`   Collection name: ${collectionName}`);

        const count = await AuditLogModel.countDocuments();
        console.log(`   Document count: ${count}`);

        if (count > 0) {
            const sample = await AuditLogModel.findOne().lean();
            console.log(`   Sample document keys: ${Object.keys(sample || {}).join(', ')}`);
        }

        // Provide Atlas query instructions
        console.log('\n📝 MongoDB Atlas Dashboard Instructions:');
        console.log('='.repeat(80));
        console.log(`1. Go to your MongoDB Atlas dashboard`);
        console.log(`2. Navigate to: Browse Collections`);
        console.log(`3. Look for collection named: "${collectionName}"`);
        console.log(`4. If not found, try searching for collections containing: "audit" or "log"`);
        console.log(`\n5. To query transfer_created logs, use this filter:`);
        console.log(`   { "action": "transfer_created" }`);
        console.log(`\n6. To query by transfer ID, use this filter:`);
        console.log(`   { "targetResource.type": "transfer", "targetResource.id": "TRF-..." }`);
        console.log(`\n7. To see all transfer-related logs:`);
        console.log(`   { "targetResource.type": "transfer" }`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

findAuditCollection();


