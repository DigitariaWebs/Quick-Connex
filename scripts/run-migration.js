#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * This script runs the user references migration to convert string-based
 * CIUSSS and Hospital references to proper ObjectId references.
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting User References Migration...');
console.log('📋 This will convert string-based CIUSSS/Hospital references to ObjectIds');
console.log('⚠️  Make sure you have a database backup before proceeding!');
console.log('');

// Run the migration script
const migrationScript = path.join(__dirname, 'essentials', 'migrate-user-references.js');

exec(`node "${migrationScript}"`, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    if (stderr) {
        console.error('⚠️  Migration warnings:', stderr);
    }

    console.log(stdout);
    console.log('✅ Migration completed!');
});
