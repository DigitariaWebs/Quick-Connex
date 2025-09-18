/**
 * Simple test script to test signup email sending
 * This script creates a test user and triggers the signup approval email
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.argv[2] || `test.signup.${Date.now()}@gmail.com`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

console.log('🚀 Testing Signup Email Sending');
console.log('================================\n');
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`👤 Admin Email: ${ADMIN_EMAIL}`);
console.log(`🌐 Base URL: ${BASE_URL}\n`);

/**
 * Test user signup
 */
async function testUserSignup() {
    console.log('🧪 Step 1: Testing User Signup...');

    try {
        const formData = new FormData();
        formData.append('userType', 'employee');
        formData.append('firstName', 'Test');
        formData.append('lastName', 'User');
        formData.append('email', TEST_EMAIL);
        formData.append('phone', `123456789${Math.floor(Math.random() * 1000)}`);
        formData.append('password', 'TestPassword123!');

        // Create dummy files for employee documents
        const dummyContent = 'dummy content for testing';
        formData.append('cv', Buffer.from(dummyContent), { filename: 'test-cv.pdf', contentType: 'application/pdf' });
        formData.append('opiqPermit', Buffer.from(dummyContent), { filename: 'test-opiq.pdf', contentType: 'application/pdf' });
        formData.append('rcr', Buffer.from(dummyContent), { filename: 'test-rcr.pdf', contentType: 'application/pdf' });

        const response = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ User signup successful');
            console.log(`   Status: ${result.status}`);
            console.log(`   Message: ${result.message}`);

            // Extract user ID from the response if available
            if (result.user && result.user._id) {
                console.log(`   User ID: ${result.user._id}`);
                return result.user._id;
            } else if (result.userId) {
                console.log(`   User ID: ${result.userId}`);
                return result.userId;
            } else {
                console.log('   ⚠️  No user ID in response, will try to find user by email');
                return 'unknown';
            }
        } else {
            console.log('❌ User signup failed:', result.message);
            if (result.errors) {
                console.log('   Errors:', result.errors);
            }
            return null;
        }
    } catch (error) {
        console.log('❌ Signup test error:', error.message);
        return null;
    }
}

/**
 * Test signup approval email by calling the signup-approval endpoint directly
 */
async function testSignupApprovalEmail() {
    console.log('\n📧 Step 2: Testing Signup Approval Email...');

    try {
        // First, let's try to get the user from the database by making a direct API call
        // We'll use the test-db endpoint to find the user
        const response = await fetch(`${BASE_URL}/api/test-db`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'findUser',
                email: TEST_EMAIL
            }),
        });

        if (response.ok) {
            const result = await response.json();
            if (result.user) {
                console.log(`✅ Found user in database: ${result.user._id}`);

                // Now trigger the signup approval email
                const emailResponse = await fetch(`${BASE_URL}/api/auth/signup-approval`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: result.user._id }),
                });

                const emailResult = await emailResponse.json();

                if (emailResponse.ok) {
                    console.log('✅ Signup approval email sent successfully');
                    console.log(`   Message ID: ${emailResult.messageId || 'N/A'}`);
                    console.log(`   Admin Email: ${ADMIN_EMAIL}`);
                    return true;
                } else {
                    console.log('❌ Signup approval email failed:', emailResult.error || emailResult.message);
                    return false;
                }
            } else {
                console.log('❌ User not found in database');
                return false;
            }
        } else {
            console.log('❌ Could not query database for user');
            return false;
        }
    } catch (error) {
        console.log('❌ Signup approval email test error:', error.message);
        return false;
    }
}

/**
 * Test direct signup approval email with a mock user ID
 */
async function testDirectSignupApprovalEmail() {
    console.log('\n📧 Step 3: Testing Direct Signup Approval Email (with mock data)...');

    try {
        // Create a mock user object for testing
        const mockUser = {
            _id: 'test-user-id-' + Date.now(),
            firstName: 'Test',
            lastName: 'User',
            email: TEST_EMAIL,
            phone: '1234567890',
            userType: 'employee',
            status: 'pending',
            createdAt: new Date()
        };

        // Call the signup-approval endpoint with mock data
        const response = await fetch(`${BASE_URL}/api/auth/signup-approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: mockUser._id,
                mockUser: mockUser // Include mock user data
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Direct signup approval email sent successfully');
            console.log(`   Message ID: ${result.messageId || 'N/A'}`);
            console.log(`   Admin Email: ${ADMIN_EMAIL}`);
            return true;
        } else {
            console.log('❌ Direct signup approval email failed:', result.error || result.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Direct signup approval email test error:', error.message);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    // Test 1: User Signup
    const userId = await testUserSignup();
    if (!userId) {
        console.log('\n❌ Signup test failed. Cannot continue with email tests.');
        return;
    }

    // Test 2: Signup Approval Email (with real user)
    const emailOk = await testSignupApprovalEmail();

    // Test 3: Direct Signup Approval Email (with mock data)
    const directEmailOk = await testDirectSignupApprovalEmail();

    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`✅ User Signup: ${userId ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Signup Approval Email: ${emailOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Direct Signup Email: ${directEmailOk ? 'PASS' : 'FAIL'}`);

    const anyEmailSent = emailOk || directEmailOk;

    if (anyEmailSent) {
        console.log('\n🎉 Signup email test completed!');
        console.log(`📧 Check your admin email (${ADMIN_EMAIL}) for the signup approval email.`);
    } else {
        console.log('\n⚠️  No signup emails were sent. Please check the logs above for details.');
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testUserSignup,
    testSignupApprovalEmail,
    testDirectSignupApprovalEmail,
    runTests
};
