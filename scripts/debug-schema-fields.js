/**
 * Debug script to check what fields are actually defined in the database schema
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function debugSchemaFields() {
    try {
        console.log('🔍 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get the User model
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        // Check the schema definition
        console.log('\n📋 User Schema Fields:');
        const schema = User.schema;
        const paths = schema.paths;

        console.log('📊 Total paths:', Object.keys(paths).length);

        // Check for the problematic fields
        const problematicFields = ['lastLogin', 'lastLoginIp', 'failedLoginAttempts', 'lastPasswordChange'];

        problematicFields.forEach(field => {
            if (paths[field]) {
                console.log(`❌ Found ${field}:`, {
                    type: paths[field].instance,
                    required: paths[field].isRequired,
                    default: paths[field].defaultValue,
                    options: paths[field].options
                });
            } else {
                console.log(`✅ ${field}: Not found in schema`);
            }
        });

        // Check all paths
        console.log('\n📋 All Schema Paths:');
        Object.keys(paths).forEach(path => {
            const field = paths[path];
            console.log(`  ${path}: ${field.instance} (required: ${field.isRequired})`);
        });

        // Check if there are any virtual fields
        const virtuals = schema.virtuals;
        console.log('\n📋 Virtual Fields:', Object.keys(virtuals).length);
        Object.keys(virtuals).forEach(virtual => {
            console.log(`  ${virtual}: ${virtuals[virtual].get ? 'getter' : 'no getter'} ${virtuals[virtual].set ? 'setter' : 'no setter'}`);
        });

        // Check if there are any methods
        const methods = schema.methods;
        console.log('\n📋 Methods:', Object.keys(methods).length);
        Object.keys(methods).forEach(method => {
            console.log(`  ${method}: ${typeof methods[method]}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

debugSchemaFields();
