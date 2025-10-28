/**
 * DatabaseService Connection Test
 * 
 * Test using the exact same connection options as DatabaseService
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getDatabaseConfig } from './src/lib/database/core/config';
import { createConnectionOptions } from './src/lib/database/utils/connection';

// Load environment variables
dotenv.config({ path: '.env' });

async function testDatabaseServiceConnection() {
  console.log('🧪 Testing DatabaseService Connection Options...');
  
  try {
    // Get the same config as DatabaseService
    const config = getDatabaseConfig();
    console.log('📋 Database Config:');
    console.log(`   - URI: ${config.uri ? 'Found' : 'Not found'}`);
    console.log(`   - Max Pool Size: ${config.options?.maxPoolSize}`);
    console.log(`   - Min Pool Size: ${config.options?.minPoolSize}`);
    console.log(`   - Server Selection Timeout: ${config.options?.serverSelectionTimeoutMS}`);
    console.log(`   - Socket Timeout: ${config.options?.socketTimeoutMS}`);
    console.log(`   - Connect Timeout: ${config.options?.connectTimeoutMS}`);
    console.log(`   - Retry Writes: ${config.options?.retryWrites}`);
    console.log(`   - Retry Reads: ${config.options?.retryReads}`);
    console.log(`   - Read Preference: ${config.options?.readPreference}`);
    console.log(`   - Write Concern: ${JSON.stringify(config.options?.writeConcern)}`);
    console.log(`   - Auth Source: ${config.options?.authSource || 'undefined'}`);
    console.log(`   - SSL: ${config.options?.ssl}`);
    console.log(`   - TLS: ${config.options?.tls}`);
    console.log(`   - TLS Insecure: ${config.options?.tlsInsecure}`);
    
    // Create the same connection options as DatabaseService
    const connectionOptions = createConnectionOptions(config);
    console.log('\n🔧 Connection Options:');
    console.log(JSON.stringify(connectionOptions, null, 2));
    
    console.log('\n🔌 Attempting to connect with DatabaseService options...');
    
    // Test with the exact same options
    const connection = await mongoose.connect(config.uri!, connectionOptions);
    
    console.log('✅ Successfully connected with DatabaseService options!');
    console.log(`📍 Database: ${connection.connection.name}`);
    console.log(`🏠 Host: ${connection.connection.host}`);
    console.log(`🔗 State: ${connection.connection.readyState}`);
    
    // Test a simple operation
    console.log('🧪 Testing database operation...');
    const admin = connection.connection.db.admin();
    const result = await admin.ping();
    console.log('✅ Ping successful:', result);
    
    // Close connection
    await mongoose.disconnect();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ DatabaseService connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.codeName) {
      console.error('Error code name:', error.codeName);
    }
    
    // Show the full error object
    console.error('Full error:', error);
  }
}

// Run the test
testDatabaseServiceConnection().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
