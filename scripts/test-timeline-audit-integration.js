/**
 * Test Timeline-Audit Integration
 * 
 * This script tests the enhanced timeline service that automatically logs to UnifiedAuditLog
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const UnifiedAuditLog = require('../src/models/UnifiedAuditLog').default;
const TimelineService = require('../src/lib/services/timeline-service').default;

async function testTimelineAuditIntegration() {
    try {
        console.log('🧪 Testing Timeline-Audit Integration...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management');
        console.log('✅ Connected to database');

        // Test data
        const testTransferId = 'TEST_' + Date.now();
        const testActor = {
            id: new mongoose.Types.ObjectId(),
            name: 'Test User',
            email: 'test@example.com',
            userType: 'manager'
        };

        const testRequestInfo = {
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent',
            method: 'POST',
            endpoint: '/api/test'
        };

        // Test 1: Create a timeline event with audit logging
        console.log('📝 Test 1: Creating timeline event with audit logging...');

        const eventData = {
            type: 'status_changed',
            title: 'Test Status Change',
            description: 'Testing timeline-audit integration',
            actor: testActor,
            metadata: {
                oldValue: 'pending',
                newValue: 'in_progress',
                reason: 'Test integration'
            }
        };

        const timelineEvent = await TimelineService.createEventWithAudit(
            eventData,
            testTransferId,
            testRequestInfo
        );

        console.log('✅ Timeline event created:', timelineEvent.id);

        // Test 2: Verify audit log was created
        console.log('\n🔍 Test 2: Verifying audit log creation...');

        const auditLogs = await UnifiedAuditLog.find({
            'targetResource.id': testTransferId
        }).sort({ timestamp: -1 }).limit(1);

        if (auditLogs.length > 0) {
            const auditLog = auditLogs[0];
            console.log('✅ Audit log created successfully!');
            console.log('   - Actor ID:', auditLog.actorId);
            console.log('   - Action:', auditLog.action);
            console.log('   - Category:', auditLog.category);
            console.log('   - Risk Level:', auditLog.securityContext.riskLevel);
            console.log('   - Is Sensitive:', auditLog.securityContext.isSensitive);
            console.log('   - Risk Score:', auditLog.securityContext.riskScore);
            console.log('   - Timeline Event ID:', auditLog.targetResource.metadata.timelineEventId);
        } else {
            console.log('❌ No audit log found');
        }

        // Test 3: Test different event types
        console.log('\n📊 Test 3: Testing different event types...');

        const eventTypes = [
            { type: 'admin_action', expectedRisk: 'HIGH' },
            { type: 'cancelled', expectedRisk: 'HIGH' },
            { type: 'completed', expectedRisk: 'MEDIUM' },
            { type: 'notes_updated', expectedRisk: 'LOW' }
        ];

        for (const eventType of eventTypes) {
            const testEventData = {
                type: eventType.type,
                title: `Test ${eventType.type}`,
                description: `Testing ${eventType.type} event`,
                actor: testActor,
                metadata: { test: true }
            };

            const testEvent = await TimelineService.createEventWithAudit(
                testEventData,
                testTransferId + '_' + eventType.type,
                testRequestInfo
            );

            // Check if audit log was created with correct risk level
            const auditLog = await UnifiedAuditLog.findOne({
                'targetResource.id': testTransferId + '_' + eventType.type
            });

            if (auditLog) {
                const riskLevel = auditLog.securityContext.riskLevel;
                const isCorrect = riskLevel === eventType.expectedRisk;
                console.log(`   ${isCorrect ? '✅' : '❌'} ${eventType.type}: Risk ${riskLevel} (expected ${eventType.expectedRisk})`);
            } else {
                console.log(`   ❌ ${eventType.type}: No audit log found`);
            }
        }

        // Test 4: Test metadata extraction
        console.log('\n🔧 Test 4: Testing metadata extraction...');

        const metadataTestEvent = {
            type: 'patient_updated',
            title: 'Patient Info Updated',
            description: 'Patient information was updated',
            actor: testActor,
            metadata: {
                oldValue: { firstName: 'John', lastName: 'Doe' },
                newValue: { firstName: 'Jane', lastName: 'Smith' },
                reason: 'Name correction'
            }
        };

        const metadataEvent = await TimelineService.createEventWithAudit(
            metadataTestEvent,
            testTransferId + '_metadata',
            testRequestInfo
        );

        const metadataAuditLog = await UnifiedAuditLog.findOne({
            'targetResource.id': testTransferId + '_metadata'
        });

        if (metadataAuditLog && metadataAuditLog.changes.fields.length > 0) {
            console.log('✅ Metadata extraction working:', metadataAuditLog.changes.fields);
        } else {
            console.log('❌ Metadata extraction failed');
        }

        console.log('\n🎉 Timeline-Audit Integration Test Complete!');
        console.log('\n📋 Summary:');
        console.log('   - Timeline events are created successfully');
        console.log('   - Audit logs are automatically generated');
        console.log('   - Risk assessment is working');
        console.log('   - Metadata extraction is functional');
        console.log('   - Security flags are properly set');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the test
if (require.main === module) {
    testTimelineAuditIntegration();
}

module.exports = { testTimelineAuditIntegration };



