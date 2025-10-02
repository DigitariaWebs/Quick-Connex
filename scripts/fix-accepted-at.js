/**
 * Fix Script for Missing acceptedAt Field
 * 
 * This script adds the acceptedAt field to existing in_progress transfers
 * that don't have it set.
 */

const { MongoClient } = require('mongodb');

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function fixAcceptedAtField() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');

        const db = client.db();
        const transfers = db.collection('transfers');

        // Find in_progress transfers without acceptedAt
        const transfersToFix = await transfers.find({
            status: 'in_progress',
            acceptedAt: { $exists: false }
        }).toArray();

        console.log(`\n🔍 Found ${transfersToFix.length} in_progress transfers without acceptedAt field`);

        if (transfersToFix.length === 0) {
            console.log('✅ All transfers already have acceptedAt field set');
            return;
        }

        // For each transfer, set acceptedAt to the last status change time
        for (const transfer of transfersToFix) {
            let acceptedAt = new Date();

            // Try to find the last status change to 'in_progress' in statusHistory
            if (transfer.statusHistory && transfer.statusHistory.length > 0) {
                const lastInProgressChange = transfer.statusHistory
                    .filter(entry => entry.status === 'in_progress')
                    .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))[0];

                if (lastInProgressChange) {
                    acceptedAt = new Date(lastInProgressChange.changedAt);
                }
            }

            // Update the transfer with acceptedAt
            await transfers.updateOne(
                { _id: transfer._id },
                {
                    $set: {
                        acceptedAt: acceptedAt,
                        updatedAt: new Date()
                    }
                }
            );

            console.log(`✅ Fixed transfer ${transfer.transferId} - set acceptedAt to ${acceptedAt.toLocaleString()}`);
        }

        console.log(`\n🎉 Successfully fixed ${transfersToFix.length} transfers!`);

        // Verify the fix
        const remainingIssues = await transfers.find({
            status: 'in_progress',
            acceptedAt: { $exists: false }
        }).toArray();

        console.log(`\n📊 Remaining transfers without acceptedAt: ${remainingIssues.length}`);

    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await client.close();
    }
}

// Run the fix
if (require.main === module) {
    fixAcceptedAtField();
}

module.exports = { fixAcceptedAtField };
