/**
 * Test script for the signup endpoint
 * Run with: node src/app/api/auth/signup/test-signup.js
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;

// Helper function to create test files
function createTestFile(filename, content = 'Test file content') {
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
}

// Test cases
const testCases = [
    {
        name: 'Valid Employee Signup',
        data: {
            userType: 'employee',
            firstName: 'John',
            lastName: 'Doe',
            email: `employee-${Date.now()}@example.com`,
            phone: '+1234567890',
            password: 'SecurePass123!',
            opiqPermit: createTestFile('opiq.pdf', 'PDF content'),
            rcr: createTestFile('rcr.pdf', 'RCR content')
        },
        expectedStatus: 201
    },
    {
        name: 'Valid Manager Signup',
        data: {
            userType: 'manager',
            firstName: 'Jane',
            lastName: 'Smith',
            email: `manager-${Date.now()}@example.com`,
            phone: '+1234567891',
            password: 'ManagerPass123!',
            post: 'Senior Manager',
            class: 'A'
        },
        expectedStatus: 201
    },
    {
        name: 'Invalid Email Format',
        data: {
            userType: 'employee',
            firstName: 'Test',
            lastName: 'User',
            email: 'invalid-email',
            phone: '+1234567890',
            password: 'SecurePass123!',
            opiqPermit: createTestFile('opiq.pdf'),
            rcr: createTestFile('rcr.pdf')
        },
        expectedStatus: 400
    },
    {
        name: 'Weak Password',
        data: {
            userType: 'employee',
            firstName: 'Test',
            lastName: 'User',
            email: `weak-pass-${Date.now()}@example.com`,
            phone: '+1234567890',
            password: '123',
            opiqPermit: createTestFile('opiq.pdf'),
            rcr: createTestFile('rcr.pdf')
        },
        expectedStatus: 400
    },
    {
        name: 'Missing Required Fields',
        data: {
            userType: 'employee',
            firstName: 'Test',
            // Missing lastName, email, phone, password
            opiqPermit: createTestFile('opiq.pdf'),
            rcr: createTestFile('rcr.pdf')
        },
        expectedStatus: 400
    },
    {
        name: 'Duplicate Email',
        data: {
            userType: 'employee',
            firstName: 'Duplicate',
            lastName: 'User',
            email: TEST_EMAIL, // Will be set to the same email as first test
            phone: '+1234567890',
            password: 'SecurePass123!',
            opiqPermit: createTestFile('opiq.pdf'),
            rcr: createTestFile('rcr.pdf')
        },
        expectedStatus: 409
    },
    {
        name: 'Invalid User Type',
        data: {
            userType: 'invalid',
            firstName: 'Test',
            lastName: 'User',
            email: `invalid-type-${Date.now()}@example.com`,
            phone: '+1234567890',
            password: 'SecurePass123!'
        },
        expectedStatus: 400
    },
    {
        name: 'Manager Missing Required Fields',
        data: {
            userType: 'manager',
            firstName: 'Test',
            lastName: 'Manager',
            email: `manager-missing-${Date.now()}@example.com`,
            phone: '+1234567890',
            password: 'ManagerPass123!'
            // Missing post and class
        },
        expectedStatus: 400
    }
];

// Function to run a single test
async function runTest(testCase) {
    console.log(`\n🧪 Running test: ${testCase.name}`);

    try {
        const formData = new FormData();

        // Add text fields
        Object.entries(testCase.data).forEach(([key, value]) => {
            if (typeof value === 'string' && !value.includes('/')) {
                formData.append(key, value);
            }
        });

        // Add file fields
        if (testCase.data.opiqPermit) {
            const fileContent = fs.readFileSync(testCase.data.opiqPermit);
            const blob = new Blob([fileContent], { type: 'application/pdf' });
            formData.append('opiqPermit', blob, 'opiq.pdf');
        }

        if (testCase.data.rcr) {
            const fileContent = fs.readFileSync(testCase.data.rcr);
            const blob = new Blob([fileContent], { type: 'application/pdf' });
            formData.append('rcr', blob, 'rcr.pdf');
        }

        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        console.log(`   Status: ${response.status} (expected: ${testCase.expectedStatus})`);
        console.log(`   Response:`, JSON.stringify(result, null, 2));

        if (response.status === testCase.expectedStatus) {
            console.log(`   ✅ PASS`);
            return true;
        } else {
            console.log(`   ❌ FAIL - Expected status ${testCase.expectedStatus}, got ${response.status}`);
            return false;
        }

    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting signup endpoint tests...\n');

    // Set the email for duplicate test
    testCases[5].data.email = testCases[0].data.email;

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const result = await runTest(testCase);
        if (result) {
            passed++;
        } else {
            failed++;
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    // Cleanup test files
    const testDir = path.join(__dirname, 'test-files');
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log(`\n🧹 Cleaned up test files`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, runTest, testCases };
