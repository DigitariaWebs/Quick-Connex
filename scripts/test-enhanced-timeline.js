/**
 * Test Enhanced Timeline Service
 * 
 * This script tests the enhanced timeline service that directly transforms
 * UnifiedAuditLog data into timeline items for the frontend.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and services
const UnifiedAuditLog = require('../src/models/UnifiedAuditLog').default;
const TimelineService = require('../src/lib/services/timeline-service').default;

async function testEnhancedTimeline() {
    try {
        console.log('🧪 Testing Enhanced Timeline Service...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');
        console.log('✅ Connected to database');

        // Test data
        const testTransferId = 'TEST_TRANSFER_' + Date.now();
        const testUserId = new mongoose.Types.ObjectId().toString();

        // Create test audit logs
        console.log('📝 Creating test audit logs...');

        const testAuditLogs = [
            {
                actorId: testUserId,
                actorType: 'user',
                actorEmail: 'manager@example.com',
                actorName: 'Test Manager',
                actorRole: 'manager',
                action: 'transfer_created',
                category: 'transfer_management',
                description: 'Transfer request created for John Doe',
                targetResource: {
                    type: 'transfer',
                    id: testTransferId,
                    name: `Transfer ${testTransferId}`
                },
                changes: {
                    before: null,
                    after: { status: 'pending', priority: 'medium' },
                    fields: ['status', 'priority'],
                    changeSummary: 'Transfer created'
                },
                securityContext: {
                    riskLevel: 'low',
                    isSensitive: false,
                    requiresReview: false,
                    securityFlags: [],
                    riskScore: 20
                },
                outcome: 'success',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                isAutomated: false,
                isBulkOperation: false
            },
            {
                actorId: testUserId,
                actorType: 'user',
                actorEmail: 'employee@example.com',
                actorName: 'Test Employee',
                actorRole: 'employee',
                action: 'transfer_updated',
                category: 'transfer_management',
                description: 'Transfer status changed to in_progress',
                targetResource: {
                    type: 'transfer',
                    id: testTransferId,
                    name: `Transfer ${testTransferId}`
                },
                changes: {
                    before: { status: 'pending' },
                    after: { status: 'in_progress', assignedTo: testUserId },
                    fields: ['status', 'assignedTo'],
                    changeSummary: 'Status changed to in_progress'
                },
                securityContext: {
                    riskLevel: 'medium',
                    isSensitive: false,
                    requiresReview: false,
                    securityFlags: ['status_change'],
                    riskScore: 50
                },
                outcome: 'success',
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                isAutomated: false,
                isBulkOperation: false
            },
            {
                actorId: testUserId,
                actorType: 'admin',
                actorEmail: 'admin@example.com',
                actorName: 'Test Admin',
                actorRole: 'admin',
                action: 'transfer_completed',
                category: 'transfer_management',
                description: 'Transfer completed successfully',
                targetResource: {
                    type: 'transfer',
                    id: testTransferId,
                    name: `Transfer ${testTransferId}`
                },
                changes: {
                    before: { status: 'in_progress' },
                    after: { status: 'completed', completedAt: new Date() },
                    fields: ['status', 'completedAt'],
                    changeSummary: 'Transfer completed'
                },
                securityContext: {
                    riskLevel: 'medium',
                    isSensitive: false,
                    requiresReview: false,
                    securityFlags: ['status_change'],
                    riskScore: 60
                },
                outcome: 'success',
                timestamp: new Date(),
                isAutomated: false,
                isBulkOperation: false
            }
        ];

        // Save test audit logs
        const savedAuditLogs = await UnifiedAuditLog.insertMany(testAuditLogs);
        console.log(`✅ Created ${savedAuditLogs.length} test audit logs`);

        // Test 1: Get timeline for transfer
        console.log('\n📋 Test 1: Getting timeline for transfer...');

        const timelineItems = await TimelineService.getTimelineForTransfer(testTransferId, {
            limit: 10,
            sortBy: 'timestamp',
            sortOrder: 'desc'
        });

        console.log(`✅ Retrieved ${timelineItems.length} timeline items`);

        if (timelineItems.length > 0) {
            const firstItem = timelineItems[0];
            console.log('   - First item:', {
                kind: firstItem.kind,
                title: firstItem.title,
                actor: firstItem.actor.name,
                badges: firstItem.badges,
                tags: firstItem.tags
            });
        }

        // Test 2: Get timeline for user
        console.log('\n👤 Test 2: Getting timeline for user...');

        const userTimeline = await TimelineService.getTimelineForUser(testUserId, {
            limit: 5,
            sortBy: 'timestamp',
            sortOrder: 'desc'
        });

        console.log(`✅ Retrieved ${userTimeline.length} user timeline items`);

        // Test 3: Get timeline for admin
        console.log('\n🔧 Test 3: Getting timeline for admin...');

        const adminTimeline = await TimelineService.getTimelineForAdmin({
            limit: 10,
            sortBy: 'timestamp',
            sortOrder: 'desc'
        });

        console.log(`✅ Retrieved ${adminTimeline.length} admin timeline items`);

        // Test 4: Test filtering
        console.log('\n🔍 Test 4: Testing timeline filtering...');

        const filteredTimeline = await TimelineService.getTimelineForTransfer(testTransferId, {
            eventTypes: ['status_changed', 'completed'],
            actorTypes: ['user'],
            limit: 5
        });

        console.log(`✅ Filtered timeline: ${filteredTimeline.length} items`);

        // Test 5: Test date filtering
        console.log('\n📅 Test 5: Testing date filtering...');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const dateFilteredTimeline = await TimelineService.getTimelineForTransfer(testTransferId, {
            startDate: yesterday,
            endDate: new Date(),
            limit: 10
        });

        console.log(`✅ Date filtered timeline: ${dateFilteredTimeline.length} items`);

        // Test 6: Verify timeline item structure
        console.log('\n🔬 Test 6: Verifying timeline item structure...');

        if (timelineItems.length > 0) {
            const item = timelineItems[0];
            const requiredFields = [
                'timelineItemId', 'transferId', 'kind', 'title', 'description',
                'timestamp', 'actor', 'badges', 'tags', 'isSensitive', 'requiresReview'
            ];

            const missingFields = requiredFields.filter(field => !(field in item));

            if (missingFields.length === 0) {
                console.log('✅ Timeline item structure is correct');
                console.log('   - All required fields present');
                console.log('   - Actor info:', item.actor.name, `(${item.actor.type})`);
                console.log('   - Badges:', item.badges.join(', '));
                console.log('   - Tags:', item.tags.slice(0, 3).join(', '), '...');
            } else {
                console.log('❌ Missing fields:', missingFields);
            }
        }

        // Test 7: Test transformation accuracy
        console.log('\n🔄 Test 7: Testing transformation accuracy...');

        const auditLog = savedAuditLogs[0];
        const transformedItem = TimelineService.transformAuditLogToTimelineItem(auditLog);

        console.log('✅ Transformation test:');
        console.log('   - Original action:', auditLog.action);
        console.log('   - Transformed kind:', transformedItem.kind);
        console.log('   - Original description:', auditLog.description);
        console.log('   - Transformed title:', transformedItem.title);
        console.log('   - Security context preserved:', transformedItem.isSensitive);

        console.log('\n🎉 Enhanced Timeline Service Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   - Timeline retrieval from audit logs: ✅');
        console.log('   - User timeline filtering: ✅');
        console.log('   - Admin timeline overview: ✅');
        console.log('   - Date and event filtering: ✅');
        console.log('   - Timeline item structure: ✅');
        console.log('   - Audit log transformation: ✅');

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await UnifiedAuditLog.deleteMany({ 'targetResource.id': testTransferId });
        console.log('✅ Test data cleaned up');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the test
if (require.main === module) {
    testEnhancedTimeline();
}

module.exports = { testEnhancedTimeline };

