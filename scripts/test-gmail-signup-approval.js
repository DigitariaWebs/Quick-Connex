/**
 * Test Gmail API Signup Approval Workflow
 * 
 * This script tests the complete signup approval workflow:
 * 1. User signs up
 * 2. Admin receives approval email
 * 3. Admin approves/rejects user
 * 4. User receives notification email
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.argv[2] || 'test@example.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

/**
 * Get user ID by email from the database
 */
async function getUserIdByEmail(email) {
    try {
        const response = await fetch(`${BASE_URL}/api/users?email=${encodeURIComponent(email)}`, {
            method: 'GET',
        });

        if (response.ok) {
            const result = await response.json();
            return result.user?._id || result.user?.id;
        }
        return null;
    } catch (error) {
        console.log('❌ Error getting user ID:', error.message);
        return null;
    }
}

/**
 * Test user signup
 */
async function testUserSignup() {
    console.log('🧪 Testing User Signup...');

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
            // Get the user ID from the database by email
            const userId = await getUserIdByEmail(TEST_EMAIL);
            if (userId) {
                console.log(`   User ID: ${userId}`);
                return userId;
            } else {
                console.log('   ⚠️  Could not retrieve user ID from database');
                return null;
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
 * Test admin approval email
 */
async function testApprovalEmail(userId) {
    console.log('\n📧 Testing Approval Email to Admin...');

    try {
        const response = await fetch(`${BASE_URL}/api/auth/signup-approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Approval email sent successfully');
            console.log(`   Message ID: ${result.messageId}`);
            console.log(`   Admin Email: ${ADMIN_EMAIL}`);
            return true;
        } else {
            console.log('❌ Approval email failed:', result.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Approval email test error:', error.message);
        return false;
    }
}

/**
 * Test user approval
 */
async function testUserApproval(userId, action = 'approve') {
    console.log(`\n🔍 Testing User ${action}...`);

    try {
        const response = await fetch(`${BASE_URL}/api/auth/approve-user?userId=${userId}&action=${action}&admin=${ADMIN_EMAIL}`, {
            method: 'GET',
        });

        if (response.ok) {
            console.log(`✅ User ${action} successful`);
            console.log(`   Redirected to: ${response.url}`);
            return true;
        } else {
            const result = await response.json();
            console.log(`❌ User ${action} failed:`, result.error);
            return false;
        }
    } catch (error) {
        console.log(`❌ User ${action} test error:`, error.message);
        return false;
    }
}

/**
 * Test user login with different statuses
 */
async function testUserLogin(email, expectedStatus = 'approved') {
    console.log(`\n🔐 Testing User Login (expected status: ${expectedStatus})...`);

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: 'TestPassword123!'
            }),
        });

        const result = await response.json();

        if (response.ok && expectedStatus === 'approved') {
            console.log('✅ Login successful (approved user)');
            console.log(`   User: ${result.user.email}`);
            return true;
        } else if (response.status === 403 && result.status === expectedStatus) {
            console.log(`✅ Login correctly blocked (${expectedStatus} user)`);
            console.log(`   Message: ${result.message}`);
            return true;
        } else {
            console.log(`❌ Login test failed (expected ${expectedStatus}, got ${result.status})`);
            console.log(`   Response:`, result);
            return false;
        }
    } catch (error) {
        console.log('❌ Login test error:', error.message);
        return false;
    }
}

/**
 * Test Gmail SMTP configuration
 */
async function testGmailConfiguration() {
    console.log('🔧 Testing Gmail SMTP Configuration...');

    const requiredEnvVars = [
        'GMAIL_EMAIL',
        'GMAIL_APP_PASSWORD',
        'EMAIL_FROM',
        'ADMIN_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.log('❌ Missing environment variables:');
        missingVars.forEach(varName => console.log(`   - ${varName}`));
        return false;
    }

    console.log('✅ All required environment variables are set');
    console.log(`   Gmail Email: ${process.env.GMAIL_EMAIL}`);
    console.log(`   App Password: ${process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Missing'}`);
    console.log(`   From Email: ${process.env.EMAIL_FROM}`);
    console.log(`   Admin Email: ${process.env.ADMIN_EMAIL}`);

    return true;
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 Gmail SMTP Signup Approval Workflow Test');
    console.log('==========================================\n');

    // Test 1: Gmail Configuration
    const configOk = await testGmailConfiguration();
    if (!configOk) {
        console.log('\n❌ Configuration test failed. Please check your .env.local file.');
        return;
    }

    // Test 2: User Signup
    const userId = await testUserSignup();
    if (!userId) {
        console.log('\n❌ Signup test failed. Cannot continue with other tests.');
        return;
    }

    // Test 3: Approval Email
    const emailOk = await testApprovalEmail(userId);
    if (!emailOk) {
        console.log('\n⚠️  Approval email test failed, but continuing with other tests.');
    }

    // Test 4: User Login (should be blocked - pending status)
    const loginPendingOk = await testUserLogin(TEST_EMAIL, 'pending');
    if (!loginPendingOk) {
        console.log('\n⚠️  Pending login test failed.');
    }

    // Test 5: Approve User
    const approvalOk = await testUserApproval(userId, 'approve');
    if (!approvalOk) {
        console.log('\n⚠️  User approval test failed.');
    }

    // Test 6: User Login (should work - approved status)
    const loginApprovedOk = await testUserLogin(TEST_EMAIL, 'approved');
    if (!loginApprovedOk) {
        console.log('\n⚠️  Approved login test failed.');
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`✅ Configuration: ${configOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ User Signup: ${userId ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Approval Email: ${emailOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Pending Login Block: ${loginPendingOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ User Approval: ${approvalOk ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Approved Login: ${loginApprovedOk ? 'PASS' : 'FAIL'}`);

    const allTestsPassed = configOk && userId && emailOk && loginPendingOk && approvalOk && loginApprovedOk;

    if (allTestsPassed) {
        console.log('\n🎉 All tests passed! Gmail SMTP signup approval workflow is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    }

    console.log('\n📧 Check your email:');
    console.log(`   Admin Email (${ADMIN_EMAIL}): Should have received approval request`);
    console.log(`   User Email (${TEST_EMAIL}): Should have received approval notification`);
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    getUserIdByEmail,
    testGmailConfiguration,
    testUserSignup,
    testApprovalEmail,
    testUserApproval,
    testUserLogin,
    runTests
};
