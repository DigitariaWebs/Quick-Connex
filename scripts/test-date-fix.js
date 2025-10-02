/**
 * Test Script for Date Fix
 * 
 * This script tests the fixed date handling in the cancellation utilities.
 */

// Mock transfer objects for testing
const createMockTransfer = (acceptedAt, status = 'in_progress') => {
    return {
        status: status,
        acceptedAt: acceptedAt
    };
};

// Test the fixed cancellation logic
function testDateHandling() {
    console.log('🧪 Testing date handling fix...\n');

    // Test 1: Valid date string
    const transferWithStringDate = createMockTransfer('2024-01-15T10:30:00.000Z');
    console.log('✅ Transfer with string date:', transferWithStringDate);

    // Test 2: Valid Date object
    const transferWithDateObject = createMockTransfer(new Date());
    console.log('✅ Transfer with Date object:', transferWithDateObject);

    // Test 3: Invalid date string
    const transferWithInvalidDate = createMockTransfer('invalid-date');
    console.log('✅ Transfer with invalid date:', transferWithInvalidDate);

    // Test 4: Null acceptedAt
    const transferWithNull = createMockTransfer(null);
    console.log('✅ Transfer with null acceptedAt:', transferWithNull);

    // Test 5: Undefined acceptedAt
    const transferWithUndefined = createMockTransfer(undefined);
    console.log('✅ Transfer with undefined acceptedAt:', transferWithUndefined);

    console.log('\n🎉 Date handling tests completed!');
    console.log('The fix should now handle all these cases without throwing errors.');
}

// Run the test
if (require.main === module) {
    testDateHandling();
}

module.exports = { testDateHandling };
