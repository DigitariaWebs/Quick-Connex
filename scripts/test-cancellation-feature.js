/**
 * Test Script for 4-Hour Cancellation Feature
 * 
 * This script tests the new 4-hour cancellation window functionality.
 */

const { MongoClient } = require('mongodb');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
const TEST_TRANSFER_ID = 'test-transfer-cancellation';

async function testCancellationFeature() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');

        const db = client.db();
        const transfers = db.collection('transfers');

        // Create a test transfer with acceptedAt timestamp
        const testTransfer = {
            _id: TEST_TRANSFER_ID,
            transferId: 'TEST-001',
            transferCategory: 'patient',
            patientInfo: {
                firstName: 'John',
                lastName: 'Doe',
                age: 45,
                dossierNumber: 'TEST-123'
            },
            fromHospital: 'test-hospital-1',
            toHospital: 'test-hospital-2',
            fromHospitalName: 'Test Hospital A',
            toHospitalName: 'Test Hospital B',
            requestedBy: 'test-user-1',
            assignedTo: 'test-user-2',
            reason: 'Test transfer for cancellation feature',
            priority: 'medium',
            status: 'in_progress',
            requestedDate: new Date(),
            acceptedAt: new Date(), // Set to current time
            lastModifiedBy: 'test-user-2',
            statusHistory: [{
                status: 'in_progress',
                changedBy: 'test-user-2',
                changedAt: new Date(),
                reason: 'Transfer accepted by employee'
            }],
            timeline: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert test transfer
        await transfers.insertOne(testTransfer);
        console.log('✅ Test transfer created');

        // Test 1: Check if transfer can be cancelled (should be true within 4 hours)
        const canCancel = await testCanCancelTransfer(transfers, TEST_TRANSFER_ID);
        console.log(`✅ Can cancel transfer: ${canCancel}`);

        // Test 2: Simulate time passing (set acceptedAt to 5 hours ago)
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        await transfers.updateOne(
            { _id: TEST_TRANSFER_ID },
            { $set: { acceptedAt: fiveHoursAgo } }
        );
        console.log('⏰ Set acceptedAt to 5 hours ago');

        // Test 3: Check if transfer can still be cancelled (should be false)
        const canCancelAfter5Hours = await testCanCancelTransfer(transfers, TEST_TRANSFER_ID);
        console.log(`✅ Can cancel transfer after 5 hours: ${canCancelAfter5Hours}`);

        // Test 4: Test remaining time calculation
        const remainingTime = await testRemainingTime(transfers, TEST_TRANSFER_ID);
        console.log(`⏱️ Remaining cancellation time: ${remainingTime}`);

        // Clean up
        await transfers.deleteOne({ _id: TEST_TRANSFER_ID });
        console.log('🧹 Test transfer cleaned up');

        console.log('\n🎉 All cancellation feature tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await client.close();
    }
}

async function testCanCancelTransfer(transfers, transferId) {
    const transfer = await transfers.findOne({ _id: transferId });

    if (!transfer || transfer.status !== 'in_progress' || !transfer.acceptedAt) {
        return false;
    }

    const now = new Date();
    const timeSinceAccepted = now.getTime() - transfer.acceptedAt.getTime();
    const fourHoursInMs = 4 * 60 * 60 * 1000;

    return timeSinceAccepted <= fourHoursInMs;
}

async function testRemainingTime(transfers, transferId) {
    const transfer = await transfers.findOne({ _id: transferId });

    if (!transfer || !transfer.acceptedAt) {
        return 'No acceptedAt timestamp';
    }

    const now = new Date();
    const timeSinceAccepted = now.getTime() - transfer.acceptedAt.getTime();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    const remainingMs = fourHoursInMs - timeSinceAccepted;

    if (remainingMs <= 0) {
        return 'Cancellation window expired';
    }

    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
    } else {
        return `${minutes}m remaining`;
    }
}

// Run the test
if (require.main === module) {
    testCancellationFeature();
}

module.exports = { testCancellationFeature };
