const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function testSignupForm() {
    try {
        console.log('🧪 Testing Signup Form ObjectId Handling...');
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test CIUSSS API endpoint
        console.log('\n🔍 Testing CIUSSS API endpoint...');
        const ciusssResponse = await fetch('http://localhost:3002/api/ciusss?isActive=true');
        const ciusssData = await ciusssResponse.json();

        if (ciusssData.success && Array.isArray(ciusssData.ciusss)) {
            console.log(`✅ CIUSSS API working: Found ${ciusssData.ciusss.length} CIUSSS records`);
            console.log('📋 Sample CIUSSS data:');
            ciusssData.ciusss.slice(0, 3).forEach((ciusss, i) => {
                console.log(`  ${i + 1}. ${ciusss.name} (ID: ${ciusss._id})`);
                console.log(`     ObjectId valid: ${mongoose.Types.ObjectId.isValid(ciusss._id)}`);
            });
        } else {
            console.log('❌ CIUSSS API failed:', ciusssData);
        }

        // Test Hospitals API endpoint
        console.log('\n🔍 Testing Hospitals API endpoint...');
        const hospitalsResponse = await fetch('http://localhost:3002/api/hospitals?limit=10');
        const hospitalsData = await hospitalsResponse.json();

        if (hospitalsData.success && Array.isArray(hospitalsData.hospitals)) {
            console.log(`✅ Hospitals API working: Found ${hospitalsData.hospitals.length} Hospital records`);
            console.log('📋 Sample Hospital data:');
            hospitalsData.hospitals.slice(0, 3).forEach((hospital, i) => {
                console.log(`  ${i + 1}. ${hospital.name} (ID: ${hospital._id})`);
                console.log(`     ObjectId valid: ${mongoose.Types.ObjectId.isValid(hospital._id)}`);
            });
        } else {
            console.log('❌ Hospitals API failed:', hospitalsData);
        }

        // Test signup API with mock data
        console.log('\n🔍 Testing Signup API with ObjectId references...');

        // Get a valid CIUSSS and Hospital ID
        const validCiusssId = ciusssData.ciusss?.[0]?._id;
        const validHospitalId = hospitalsData.hospitals?.[0]?._id;

        if (validCiusssId && validHospitalId) {
            console.log(`📋 Using CIUSSS ID: ${validCiusssId}`);
            console.log(`📋 Using Hospital ID: ${validHospitalId}`);

            // Test ObjectId validation
            const ciusssValid = mongoose.Types.ObjectId.isValid(validCiusssId);
            const hospitalValid = mongoose.Types.ObjectId.isValid(validHospitalId);

            console.log(`✅ CIUSSS ObjectId valid: ${ciusssValid}`);
            console.log(`✅ Hospital ObjectId valid: ${hospitalValid}`);

            if (ciusssValid && hospitalValid) {
                console.log('🎉 Signup form should work correctly with ObjectId references!');
            } else {
                console.log('❌ Invalid ObjectId format detected');
            }
        } else {
            console.log('❌ No valid CIUSSS or Hospital data found for testing');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testSignupForm();
