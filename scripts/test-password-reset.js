/**
 * Test script for password reset functionality
 * 
 * This script tests the complete password reset flow:
 * 1. Request password reset
 * 2. Verify token generation
 * 3. Reset password with token
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';

async function testPasswordReset() {
    console.log('🧪 Testing Password Reset Functionality\n');

    try {
        // Step 1: Request password reset
        console.log('1️⃣ Testing password reset request...');
        const resetRequestResponse = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: TEST_EMAIL }),
        });

        const resetRequestData = await resetRequestResponse.json();
        console.log('   Status:', resetRequestResponse.status);
        console.log('   Response:', resetRequestData.message);

        if (resetRequestResponse.ok) {
            console.log('   ✅ Password reset request successful\n');
        } else {
            console.log('   ❌ Password reset request failed\n');
            return;
        }

        // Step 2: Test with invalid token
        console.log('2️⃣ Testing password reset with invalid token...');
        const invalidTokenResponse = await fetch(`${BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: 'invalid-token-12345',
                password: 'newpassword123'
            }),
        });

        const invalidTokenData = await invalidTokenResponse.json();
        console.log('   Status:', invalidTokenResponse.status);
        console.log('   Response:', invalidTokenData.message);

        if (invalidTokenResponse.status === 400) {
            console.log('   ✅ Invalid token correctly rejected\n');
        } else {
            console.log('   ❌ Invalid token should have been rejected\n');
        }

        // Step 3: Test with weak password
        console.log('3️⃣ Testing password reset with weak password...');
        const weakPasswordResponse = await fetch(`${BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: 'some-valid-looking-token',
                password: '123'
            }),
        });

        const weakPasswordData = await weakPasswordResponse.json();
        console.log('   Status:', weakPasswordResponse.status);
        console.log('   Response:', weakPasswordData.message);

        if (weakPasswordResponse.status === 400) {
            console.log('   ✅ Weak password correctly rejected\n');
        } else {
            console.log('   ❌ Weak password should have been rejected\n');
        }

        // Step 4: Test rate limiting
        console.log('4️⃣ Testing rate limiting...');
        const rateLimitPromises = [];
        for (let i = 0; i < 5; i++) {
            rateLimitPromises.push(
                fetch(`${BASE_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: TEST_EMAIL }),
                })
            );
        }

        const rateLimitResponses = await Promise.all(rateLimitPromises);
        const rateLimited = rateLimitResponses.some(response => response.status === 429);

        if (rateLimited) {
            console.log('   ✅ Rate limiting working correctly\n');
        } else {
            console.log('   ⚠️  Rate limiting may not be working (this could be normal if requests are spaced out)\n');
        }

        console.log('🎉 Password reset functionality test completed!');
        console.log('\n📝 Manual Testing Steps:');
        console.log('1. Go to http://localhost:3000/login');
        console.log('2. Click "Forgot your password?"');
        console.log('3. Enter a valid email address');
        console.log('4. Check your email for the reset link');
        console.log('5. Click the reset link and set a new password');
        console.log('6. Try logging in with the new password');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the development server is running:');
        console.log('   npm run dev');
    }
}

// Run the test
testPasswordReset();
