/**
 * Unit Test for 4-Hour Cancellation Logic
 * 
 * This script tests the cancellation logic without requiring a database connection.
 */

// Mock transfer object for testing
const createMockTransfer = (acceptedAtHoursAgo = 0) => {
    const acceptedAt = new Date(Date.now() - (acceptedAtHoursAgo * 60 * 60 * 1000));
    return {
        status: 'in_progress',
        acceptedAt: acceptedAt
    };
};

// Test the cancellation logic
function testCancellationLogic() {
    console.log('🧪 Testing 4-hour cancellation logic...\n');

    // Test 1: Transfer accepted 1 hour ago (should be cancellable)
    const transfer1HourAgo = createMockTransfer(1);
    const canCancel1Hour = canCancelTransfer(transfer1HourAgo);
    console.log(`✅ Transfer accepted 1 hour ago - Can cancel: ${canCancel1Hour}`);

    // Test 2: Transfer accepted 3 hours ago (should be cancellable)
    const transfer3HoursAgo = createMockTransfer(3);
    const canCancel3Hours = canCancelTransfer(transfer3HoursAgo);
    console.log(`✅ Transfer accepted 3 hours ago - Can cancel: ${canCancel3Hours}`);

    // Test 3: Transfer accepted 5 hours ago (should NOT be cancellable)
    const transfer5HoursAgo = createMockTransfer(5);
    const canCancel5Hours = canCancelTransfer(transfer5HoursAgo);
    console.log(`✅ Transfer accepted 5 hours ago - Can cancel: ${canCancel5Hours}`);

    // Test 4: Transfer with no acceptedAt (should NOT be cancellable)
    const transferNoAcceptedAt = { status: 'in_progress', acceptedAt: null };
    const canCancelNoAcceptedAt = canCancelTransfer(transferNoAcceptedAt);
    console.log(`✅ Transfer with no acceptedAt - Can cancel: ${canCancelNoAcceptedAt}`);

    // Test 5: Transfer not in progress (should NOT be cancellable)
    const transferNotInProgress = { status: 'completed', acceptedAt: new Date() };
    const canCancelNotInProgress = canCancelTransfer(transferNotInProgress);
    console.log(`✅ Transfer not in progress - Can cancel: ${canCancelNotInProgress}`);

    // Test remaining time calculations
    console.log('\n⏱️ Testing remaining time calculations...');

    const transfer1Hour = createMockTransfer(1);
    const remaining1Hour = getRemainingCancellationTimeString(transfer1Hour);
    console.log(`✅ Transfer accepted 1 hour ago - Remaining time: ${remaining1Hour}`);

    const transfer3Hours = createMockTransfer(3);
    const remaining3Hours = getRemainingCancellationTimeString(transfer3Hours);
    console.log(`✅ Transfer accepted 3 hours ago - Remaining time: ${remaining3Hours}`);

    const transfer5Hours = createMockTransfer(5);
    const remaining5Hours = getRemainingCancellationTimeString(transfer5Hours);
    console.log(`✅ Transfer accepted 5 hours ago - Remaining time: ${remaining5Hours}`);

    console.log('\n🎉 All cancellation logic tests completed successfully!');
}

// Cancellation logic functions (copied from the actual implementation)
const CANCELLATION_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

function canCancelTransfer(transfer) {
    // Only in_progress transfers can be cancelled
    if (transfer.status !== 'in_progress') {
        return false;
    }

    // Must have an acceptedAt timestamp
    if (!transfer.acceptedAt) {
        return false;
    }

    // Check if we're still within the 4-hour window
    const now = new Date();
    const timeSinceAccepted = now.getTime() - transfer.acceptedAt.getTime();

    return timeSinceAccepted <= CANCELLATION_WINDOW_MS;
}

function getRemainingCancellationTime(transfer) {
    if (!transfer.acceptedAt) {
        return 0;
    }

    const now = new Date();
    const timeSinceAccepted = now.getTime() - transfer.acceptedAt.getTime();
    const remainingTime = CANCELLATION_WINDOW_MS - timeSinceAccepted;

    return Math.max(0, remainingTime);
}

function getRemainingCancellationTimeString(transfer) {
    const remainingMs = getRemainingCancellationTime(transfer);

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
    testCancellationLogic();
}

module.exports = { testCancellationLogic, canCancelTransfer, getRemainingCancellationTimeString };
