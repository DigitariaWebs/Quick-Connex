/**
 * Debug Timeline Issue
 * 
 * This script helps debug why timeline events are not showing up.
 * It checks for audit logs and tests the timeline service.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and services
const UnifiedAuditLog = require('../src/models/UnifiedAuditLog');
const TimelineService = require('../src/lib/services/timeline-service');
const Transfer = require('../src/models/Transfer');

async function debugTimelineIssue() {
    try {
        console.log('🔍 Debugging Timeline Issue...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');
        console.log('✅ Connected to database');

        // Check 1: Are there any audit logs at all?
        console.log('\n📊 Check 1: Total audit logs in database...');
        const totalAuditLogs = await UnifiedAuditLog.countDocuments();
        console.log(`   Total audit logs: ${totalAuditLogs}`);

        if (totalAuditLogs === 0) {
            console.log('❌ No audit logs found in database!');
            console.log('   This means the audit logging is not working properly.');
            return;
        }

        // Check 2: Are there any transfer-related audit logs?
        console.log('\n📊 Check 2: Transfer-related audit logs...');
        const transferAuditLogs = await UnifiedAuditLog.find({
            'targetResource.type': 'transfer'
        });
        console.log(`   Transfer audit logs: ${transferAuditLogs.length}`);

        if (transferAuditLogs.length > 0) {
            console.log('   Sample transfer audit log:');
            const sample = transferAuditLogs[0];
            console.log('   - Action:', sample.action);
            console.log('   - Target ID:', sample.targetResource?.id);
            console.log('   - Actor:', sample.actorName);
            console.log('   - Timestamp:', sample.timestamp);
        }

        // Check 3: Get a sample transfer
        console.log('\n📊 Check 3: Sample transfers...');
        const sampleTransfer = await Transfer.findOne().sort({ createdAt: -1 });
        if (sampleTransfer) {
            console.log(`   Found transfer: ${sampleTransfer.transferId}`);
            console.log(`   Status: ${sampleTransfer.status}`);
            console.log(`   Created: ${sampleTransfer.createdAt}`);

            // Check 4: Test timeline service for this transfer
            console.log('\n📊 Check 4: Testing timeline service...');
            try {
                const timelineItems = await TimelineService.getTimelineForTransfer(sampleTransfer.transferId, {
                    limit: 10
                });
                console.log(`   Timeline items found: ${timelineItems.length}`);

                if (timelineItems.length > 0) {
                    console.log('   Sample timeline item:');
                    const item = timelineItems[0];
                    console.log('   - Title:', item.title);
                    console.log('   - Kind:', item.kind);
                    console.log('   - Actor:', item.actor.name);
                    console.log('   - Timestamp:', item.timestamp);
                } else {
                    console.log('   ❌ No timeline items returned by service');
                }
            } catch (error) {
                console.log('   ❌ Error calling timeline service:', error.message);
            }
        } else {
            console.log('   ❌ No transfers found in database');
        }

        // Check 5: Test API endpoint simulation
        console.log('\n📊 Check 5: Testing API endpoint simulation...');
        if (sampleTransfer) {
            try {
                // Simulate what the API does
                const query = {
                    'targetResource.type': 'transfer',
                    'targetResource.id': sampleTransfer.transferId
                };

                const auditLogs = await UnifiedAuditLog.find(query)
                    .sort({ timestamp: -1 })
                    .limit(50)
                    .lean();

                console.log(`   Audit logs found for transfer: ${auditLogs.length}`);

                if (auditLogs.length > 0) {
                    console.log('   Sample audit log:');
                    const log = auditLogs[0];
                    console.log('   - Action:', log.action);
                    console.log('   - Description:', log.description);
                    console.log('   - Actor:', log.actorName);
                }
            } catch (error) {
                console.log('   ❌ Error in API simulation:', error.message);
            }
        }

        // Check 6: Check for recent audit logs
        console.log('\n📊 Check 6: Recent audit logs (last 24 hours)...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentLogs = await UnifiedAuditLog.find({
            timestamp: { $gte: yesterday }
        }).sort({ timestamp: -1 }).limit(5);

        console.log(`   Recent audit logs: ${recentLogs.length}`);
        recentLogs.forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.action} by ${log.actorName} at ${log.timestamp}`);
        });

        console.log('\n🎯 Debug Summary:');
        console.log(`   - Total audit logs: ${totalAuditLogs}`);
        console.log(`   - Transfer audit logs: ${transferAuditLogs.length}`);
        console.log(`   - Sample transfer: ${sampleTransfer ? sampleTransfer.transferId : 'None'}`);
        console.log(`   - Recent logs: ${recentLogs.length}`);

        if (totalAuditLogs === 0) {
            console.log('\n💡 Issue: No audit logs are being created.');
            console.log('   - Check if audit logging is enabled');
            console.log('   - Check if TimelineService.createEventWithAudit is being called');
            console.log('   - Check if UnifiedAuditLog model is working');
        } else if (transferAuditLogs.length === 0) {
            console.log('\n💡 Issue: No transfer-related audit logs found.');
            console.log('   - Check if transfer creation is calling audit logging');
            console.log('   - Check if targetResource.type is set to "transfer"');
        } else {
            console.log('\n💡 Issue: Timeline service not returning data.');
            console.log('   - Check TimelineService.getTimelineForTransfer method');
            console.log('   - Check transformAuditLogToTimelineItem method');
            console.log('   - Check API endpoint implementation');
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the debug
if (require.main === module) {
    debugTimelineIssue();
}

module.exports = { debugTimelineIssue };
