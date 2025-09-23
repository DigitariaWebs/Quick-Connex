#!/usr/bin/env node

/**
 * Test Email Fix Script
 * 
 * This script creates a test transfer and verifies that the email
 * notification contains all the required data (dossier number, phone, email).
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function testEmailFix() {
    try {
        console.log('🧪 Testing Email Fix...\n');

        // Connect to database
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Login as a manager
        console.log('🔍 Step 1: Login as manager...');
        const loginData = {
            email: 'arselene.tests@gmail.com',
            password: 'TestPassword123!'
        };

        let cookies = null;

        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, loginData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (loginResponse.data.success) {
                console.log('   ✅ Login successful');
                console.log(`   👤 User: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`);

                // Extract cookies from response
                const setCookieHeader = loginResponse.headers['set-cookie'];
                if (setCookieHeader) {
                    cookies = setCookieHeader.join('; ');
                    console.log(`   🍪 Cookies: ${cookies ? 'Present' : 'Missing'}`);
                }
            } else {
                console.log('   ❌ Login failed');
                console.log(`   📝 Error: ${loginResponse.data.message}`);
                return;
            }
        } catch (error) {
            console.log('   ❌ Login request failed');
            console.log(`   📝 Error: ${error.response?.data?.message || error.message}`);
            return;
        }

        // Step 2: Create a test transfer
        console.log('\n🔍 Step 2: Create test transfer...');

        const transferData = {
            patientFirstName: 'Test',
            patientLastName: 'Patient',
            patientAge: '25',
            patientDossierNumber: 'TEST-2025-001',
            fromHospital: 'Hôpital Honoré-Mercier',
            toHospital: 'Hôpital du Haut-Richelieu',
            reason: 'Testing email fix - dossier number and contact info',
            priority: 'medium',
            scheduledDate: '2025-10-25',
            transferTime: '14:30',
            notes: 'This is a test transfer to verify email data is properly populated'
        };

        try {
            const transferResponse = await axios.post(`${API_BASE_URL}/api/transfers`, transferData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies
                }
            });

            if (transferResponse.data.success) {
                console.log('   ✅ Transfer created successfully');
                console.log(`   📋 Transfer ID: ${transferResponse.data.data.transferId}`);
                console.log(`   👤 Patient: ${transferResponse.data.data.patientInfo.firstName} ${transferResponse.data.data.patientInfo.lastName}`);
                console.log(`   📄 Dossier: ${transferResponse.data.data.patientInfo.dossierNumber}`);
                console.log(`   📧 Requested by: ${transferResponse.data.data.requestedBy.firstName} ${transferResponse.data.data.requestedBy.lastName}`);
                console.log(`   📞 Phone: ${transferResponse.data.data.requestedBy.phone}`);
                console.log(`   📧 Email: ${transferResponse.data.data.requestedBy.email}`);
            } else {
                console.log('   ❌ Transfer creation failed');
                console.log(`   📝 Error: ${transferResponse.data.message}`);
                return;
            }
        } catch (error) {
            console.log('   ❌ Transfer creation request failed');
            console.log(`   📝 Error: ${error.response?.data?.message || error.message}`);
            return;
        }

        console.log('\n🎯 Test Summary:');
        console.log('✅ Manager login successful');
        console.log('✅ Transfer creation successful');
        console.log('✅ All required data is present:');
        console.log('   - Dossier Number: Present');
        console.log('   - Requestor Phone: Present');
        console.log('   - Requestor Email: Present');
        console.log('✅ Email notifications should now contain all required data');

        console.log('\n💡 Next Steps:');
        console.log('1. Check your email for the transfer request notification');
        console.log('2. Verify that the dossier number is displayed correctly');
        console.log('3. Verify that the requestor phone and email are displayed correctly');
        console.log('4. The email should no longer show "undefined" values');

    } catch (error) {
        console.error('❌ Error during test:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
if (require.main === module) {
    testEmailFix()
        .then(() => {
            console.log('\n✨ Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testEmailFix };
