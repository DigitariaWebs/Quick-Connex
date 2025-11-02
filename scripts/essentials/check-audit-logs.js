#!/usr/bin/env node

/**
 * Script to check audit logs in the database
 * 
 * This script helps diagnose issues with audit log persistence.
 * It queries the database using multiple methods to find audit logs.
 * 
 * Usage:
 *   node scripts/essentials/check-audit-logs.js                                    - Show all recent audit logs
 *   node scripts/essentials/check-audit-logs.js --id <auditLogId>                - Find by MongoDB _id
 *   node scripts/essentials/check-audit-logs.js --transferId <transferId>          - Find by transferId
 *   node scripts/essentials/check-audit-logs.js --action transfer_created          - Find by action type
 *   node scripts/essentials/check-audit-logs.js --actorId <userId>                 - Find by actor ID
 *   node scripts/essentials/check-audit-logs.js --recent 10                        - Show last 10 audit logs
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// AuditLog Schema (simplified version for script)
const auditLogSchema = new mongoose.Schema({
    actorId: { type: String, required: true, index: true },
    actorType: { type: String, required: true, enum: ['admin', 'user', 'system', 'api', 'batch'] },
    actorEmail: { type: String, trim: true, lowercase: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },

    action: { type: String, required: true, index: true },
    category: {
        type: String, required: true, enum: [
            'user_management',
            'transfer_management',
            'patient_management',
            'authentication',
            'security',
            'data_access',
            'system_configuration',
            'notification',
            'communication',
            'file_operation',
            'api_access'
        ]
    },
    description: { type: String, required: true },

    targetResource: {
        type: {
            type: String,
            enum: ['user', 'transfer', 'patient', 'notification', 'system', 'setting', 'report', 'file', 'api', 'session']
        },
        id: String,
        name: String,
        metadata: mongoose.Schema.Types.Mixed
    },

    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fields: [String],
        changeSummary: String
    },

    context: mongoose.Schema.Types.Mixed,

    requestInfo: {
        ipAddress: { type: String, required: true },
        userAgent: { type: String, required: true },
        method: String,
        endpoint: String,
        requestId: String,
        sessionId: String,
        deviceFingerprint: String
    },

    securityContext: {
        riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
        isSensitive: { type: Boolean, default: false },
        requiresReview: { type: Boolean, default: false },
        securityFlags: [String],
        riskScore: Number,
        complianceFlags: [String]
    },

    outcome: { type: String, enum: ['success', 'failure', 'partial'], required: true },
    errorMessage: String,
    errorCode: String,

    timestamp: { type: Date, required: true, default: Date.now, index: true },
    duration: Number,
    timezone: { type: String, default: 'UTC' },

    isAutomated: { type: Boolean, default: false },
    isBulkOperation: { type: Boolean, default: false },
    parentAuditId: String,

    resolution: {
        resolved: Boolean,
        resolvedAt: Date,
        resolvedBy: String,
        resolution: String
    },

    retentionPolicy: {
        expiresAt: Date,
        retentionReason: String
    }
}, {
    timestamps: true
    // Note: Mongoose automatically pluralizes to 'auditlogs' (lowercase)
});

// Use existing model if available, otherwise create new one
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// Parse command line arguments
const args = process.argv.slice(2);
const argsMap = {};
for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
        argsMap[key] = value;
    }
}

async function checkAuditLogs() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ Connected to MongoDB successfully\n');

        // Get total count
        const totalCount = await AuditLog.countDocuments({});
        console.log(`📊 Total audit logs in database: ${totalCount}\n`);

        let query = {};
        let queryDescription = 'all audit logs';

        // Build query based on arguments
        if (argsMap.id) {
            // Try to parse as ObjectId, fallback to string comparison
            try {
                query._id = new mongoose.Types.ObjectId(argsMap.id);
            } catch (e) {
                query._id = argsMap.id;
            }
            queryDescription = `audit log with ID: ${argsMap.id}`;
            console.log(`🔍 Searching for ${queryDescription}...\n`);
        } else if (argsMap.transferId) {
            query['targetResource.type'] = 'transfer';
            query['targetResource.id'] = argsMap.transferId;
            queryDescription = `audit logs for transfer: ${argsMap.transferId}`;
            console.log(`🔍 Searching for ${queryDescription}...\n`);
        } else if (argsMap.action) {
            query.action = argsMap.action;
            queryDescription = `audit logs with action: ${argsMap.action}`;
            console.log(`🔍 Searching for ${queryDescription}...\n`);
        } else if (argsMap.actorId) {
            query.actorId = argsMap.actorId;
            queryDescription = `audit logs for actor: ${argsMap.actorId}`;
            console.log(`🔍 Searching for ${queryDescription}...\n`);
        } else if (argsMap.recent) {
            query = {};
            queryDescription = `most recent ${argsMap.recent} audit logs`;
            console.log(`🔍 Fetching ${queryDescription}...\n`);
        } else {
            query = {};
            queryDescription = `most recent 20 audit logs`;
            console.log(`🔍 Fetching ${queryDescription}...\n`);
        }

        // Execute query
        const limit = argsMap.recent ? parseInt(argsMap.recent) : 20;
        const auditLogs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        const count = auditLogs.length;
        console.log(`📋 Found ${count} audit log(s)\n`);

        if (count === 0) {
            console.log('❌ No audit logs found matching the criteria.');
            console.log('\n💡 Suggestions:');
            console.log('   - Check if the audit log was actually saved');
            console.log('   - Verify the query parameters');
            console.log('   - Check if there are any database connection issues');
            console.log('   - Verify the collection name (trying both "auditlogs" and "auditlogs")');

            // Try to check what collections exist
            const collections = await mongoose.connection.db.listCollections().toArray();
            const auditCollections = collections.filter(c =>
                c.name.toLowerCase().includes('audit') || c.name.toLowerCase().includes('log')
            );
            if (auditCollections.length > 0) {
                console.log(`\n   Found audit-related collections: ${auditCollections.map(c => c.name).join(', ')}`);
            }

            // Try to find any transfer_created logs
            console.log('\n🔍 Checking for any transfer_created logs...');
            const transferCreatedCount = await AuditLog.countDocuments({ action: 'transfer_created' });
            console.log(`   Found ${transferCreatedCount} transfer_created logs`);

            // Check for any logs in the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentCount = await AuditLog.countDocuments({ timestamp: { $gte: oneHourAgo } });
            console.log(`   Found ${recentCount} logs in the last hour`);

            return;
        }

        // Display results
        console.log('='.repeat(80));
        auditLogs.forEach((log, index) => {
            console.log(`\n📝 Audit Log #${index + 1}`);
            console.log(`   ID: ${log._id}`);
            console.log(`   Action: ${log.action}`);
            console.log(`   Category: ${log.category}`);
            console.log(`   Actor: ${log.actorName || 'N/A'} (${log.actorId})`);
            console.log(`   Actor Type: ${log.actorType}`);
            console.log(`   Actor Role: ${log.actorRole || 'N/A'}`);
            console.log(`   Description: ${log.description}`);

            if (log.targetResource) {
                console.log(`   Target Resource: ${log.targetResource.type} - ${log.targetResource.id || 'N/A'}`);
                if (log.targetResource.name) {
                    console.log(`   Target Name: ${log.targetResource.name}`);
                }
            }

            console.log(`   Outcome: ${log.outcome}`);
            console.log(`   Timestamp: ${log.timestamp}`);
            console.log(`   IP Address: ${log.requestInfo?.ipAddress || 'N/A'}`);
            console.log(`   Endpoint: ${log.requestInfo?.endpoint || 'N/A'}`);

            if (log.securityContext) {
                console.log(`   Risk Level: ${log.securityContext.riskLevel}`);
                console.log(`   Sensitive: ${log.securityContext.isSensitive}`);
            }

            if (log.errorMessage) {
                console.log(`   ❌ Error: ${log.errorMessage}`);
            }

            if (index < auditLogs.length - 1) {
                console.log('\n' + '-'.repeat(80));
            }
        });

        console.log('\n' + '='.repeat(80));

        // Additional diagnostics
        console.log('\n📊 Additional Statistics:');

        // Count by action
        const actionCounts = await AuditLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        console.log('\n   Top 10 Actions:');
        actionCounts.forEach(item => {
            console.log(`     ${item._id}: ${item.count}`);
        });

        // Count by category
        const categoryCounts = await AuditLog.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\n   By Category:');
        categoryCounts.forEach(item => {
            console.log(`     ${item._id}: ${item.count}`);
        });

        // Transfer-related logs count
        const transferLogsCount = await AuditLog.countDocuments({
            'targetResource.type': 'transfer'
        });
        console.log(`\n   Transfer-related logs: ${transferLogsCount}`);

        // transfer_created logs count
        const transferCreatedCount = await AuditLog.countDocuments({
            action: 'transfer_created'
        });
        console.log(`   transfer_created logs: ${transferCreatedCount}`);

        // Check for logs created in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await AuditLog.countDocuments({
            timestamp: { $gte: oneHourAgo }
        });
        console.log(`   Logs in last hour: ${recentCount}`);

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

// Run the script
checkAuditLogs();

