/**
 * Debug Script for Cancel Button Issue
 * 
 * This script helps debug why the cancel button isn't showing up
 * for in_progress transfers.
 */

const { MongoClient } = require('mongodb');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function debugCancelButton() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');

        const db = client.db();
        const transfers = db.collection('transfers');

        // Find all in_progress transfers
        const inProgressTransfers = await transfers.find({ status: 'in_progress' }).toArray();

        console.log(`\n📊 Found ${inProgressTransfers.length} in_progress transfers:`);

        for (const transfer of inProgressTransfers) {
            console.log(`\n🔍 Transfer ID: ${transfer._id}`);
            console.log(`   Transfer ID: ${transfer.transferId}`);
            console.log(`   Status: ${transfer.status}`);
            console.log(`   Assigned To: ${transfer.assignedTo}`);
            console.log(`   Accepted At: ${transfer.acceptedAt || 'NOT SET'}`);

            if (transfer.acceptedAt) {
                const now = new Date();
                const timeSinceAccepted = now.getTime() - transfer.acceptedAt.getTime();
                const hoursSinceAccepted = timeSinceAccepted / (1000 * 60 * 60);
                console.log(`   Hours since accepted: ${hoursSinceAccepted.toFixed(2)}`);

                const fourHoursInMs = 4 * 60 * 60 * 1000;
                const canCancel = timeSinceAccepted <= fourHoursInMs;
                console.log(`   Can cancel: ${canCancel}`);

                if (canCancel) {
                    const remainingMs = fourHoursInMs - timeSinceAccepted;
                    const remainingHours = remainingMs / (1000 * 60 * 60);
                    console.log(`   Remaining time: ${remainingHours.toFixed(2)} hours`);
                }
            } else {
                console.log(`   ❌ ISSUE: acceptedAt field is missing!`);
            }
        }

        // Check if there are any transfers without acceptedAt
        const transfersWithoutAcceptedAt = await transfers.find({
            status: 'in_progress',
            acceptedAt: { $exists: false }
        }).toArray();

        if (transfersWithoutAcceptedAt.length > 0) {
            console.log(`\n⚠️  Found ${transfersWithoutAcceptedAt.length} in_progress transfers without acceptedAt field!`);
            console.log('   This is likely the issue. The acceptedAt field needs to be set when a transfer is accepted.');
        }

        // Check recent transfers to see if acceptedAt is being set
        const recentTransfers = await transfers.find({
            status: 'in_progress',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).sort({ createdAt: -1 }).limit(5).toArray();

        console.log(`\n📅 Recent in_progress transfers (last 24 hours):`);
        for (const transfer of recentTransfers) {
            console.log(`   ${transfer.transferId}: acceptedAt = ${transfer.acceptedAt || 'MISSING'}`);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await client.close();
    }
}

// Run the debug
if (require.main === module) {
    debugCancelButton();
}

module.exports = { debugCancelButton };
