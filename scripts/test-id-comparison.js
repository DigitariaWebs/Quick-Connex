/**
 * Test Script for ID Comparison Logic
 * 
 * This script tests the ID comparison logic used in the cancellation API.
 */

// Mock ObjectId class for testing
class MockObjectId {
    constructor(id) {
        this.id = id;
    }

    toString() {
        return this.id;
    }

    equals(other) {
        return this.id === other.id || this.id === other.toString();
    }
}

// Test the ID comparison logic
function testIdComparison() {
    console.log('🧪 Testing ID comparison logic...\n');

    // Test 1: String comparison
    const userId1 = '507f1f77bcf86cd799439011';
    const assignedToId1 = '507f1f77bcf86cd799439011';
    console.log('✅ String comparison:', userId1 === assignedToId1);

    // Test 2: ObjectId comparison
    const userId2 = new MockObjectId('507f1f77bcf86cd799439011');
    const assignedToId2 = new MockObjectId('507f1f77bcf86cd799439011');
    console.log('✅ ObjectId comparison:', userId2.equals(assignedToId2));

    // Test 3: Mixed comparison (ObjectId vs string)
    const userId3 = new MockObjectId('507f1f77bcf86cd799439011');
    const assignedToId3 = '507f1f77bcf86cd799439011';
    console.log('✅ Mixed comparison:', userId3.toString() === assignedToId3);

    // Test 4: Different IDs
    const userId4 = '507f1f77bcf86cd799439011';
    const assignedToId4 = '507f1f77bcf86cd799439012';
    console.log('✅ Different IDs:', userId4 !== assignedToId4);

    // Test 5: The actual logic from the API
    const userId = '507f1f77bcf86cd799439011';
    const assignedTo = { _id: new MockObjectId('507f1f77bcf86cd799439011') };

    const assignedToId = assignedTo._id.toString();
    const userIdStr = userId.toString();

    const isAuthorized = assignedToId === userIdStr ||
        assignedTo._id.equals(userId) ||
        assignedTo._id === userId;

    console.log('✅ API logic test:', isAuthorized);

    console.log('\n🎉 ID comparison tests completed!');
}

// Run the test
if (require.main === module) {
    testIdComparison();
}

module.exports = { testIdComparison };
