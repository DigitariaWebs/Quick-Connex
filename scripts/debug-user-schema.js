/**
 * Debug script to check UserSchema definition
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function debugUserSchema() {
    try {
        console.log('🔍 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Import the User model
        const { default: User } = await import('../src/models/User.ts');

        console.log('\n📋 User Model:');
        console.log('  Type:', typeof User);
        console.log('  Constructor:', User.constructor.name);

        // Check the schema
        const schema = User.schema;
        console.log('\n📋 Schema:');
        console.log('  Type:', typeof schema);
        console.log('  Paths:', Object.keys(schema.paths).length);

        // Check specific paths
        const paths = schema.paths;
        console.log('\n📋 Key Paths:');
        ['userType', 'email', 'loginHistory', 'accountLockedUntil'].forEach(field => {
            if (paths[field]) {
                console.log(`  ✅ ${field}: ${paths[field].instance}`);
            } else {
                console.log(`  ❌ ${field}: Not found`);
            }
        });

        // Check if the schema has the right structure
        console.log('\n📋 Schema Structure:');
        console.log('  userType:', paths.userType ? '✅' : '❌');
        console.log('  email:', paths.email ? '✅' : '❌');
        console.log('  loginHistory:', paths.loginHistory ? '✅' : '❌');
        console.log('  accountLockedUntil:', paths.accountLockedUntil ? '✅' : '❌');

        // Check if there are any problematic fields
        const problematicFields = ['lastLogin', 'lastLoginIp', 'failedLoginAttempts', 'lastPasswordChange'];
        console.log('\n📋 Problematic Fields:');
        problematicFields.forEach(field => {
            if (paths[field]) {
                console.log(`  ❌ ${field}: Found in schema!`);
            } else {
                console.log(`  ✅ ${field}: Not in schema`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

debugUserSchema();
