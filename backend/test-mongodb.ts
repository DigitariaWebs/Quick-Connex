/**
 * MongoDB Atlas Connection Test
 * 
 * Simple test to verify MongoDB Atlas connection independently
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function testMongoDBConnection() {
  console.log('🧪 Testing MongoDB Atlas Connection...');
  console.log('📋 Environment Variables:');
  console.log(`   - MONGODB_URI: ${process.env.MONGODB_URI ? 'Found' : 'Not found'}`);
  console.log(`   - URI Length: ${process.env.MONGODB_URI?.length || 0} characters`);
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  try {
    console.log('🔌 Attempting to connect to MongoDB Atlas...');
    
    // Test with basic mongoose connection
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Successfully connected to MongoDB Atlas!');
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
    console.error('❌ MongoDB Atlas connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.codeName) {
      console.error('Error code name:', error.codeName);
    }
    
    // Check for specific error types
    if (error.message.includes('authentication')) {
      console.log('💡 This appears to be an authentication issue');
      console.log('   - Check username/password in the connection string');
      console.log('   - Verify database user permissions in Atlas');
    }
    
    if (error.message.includes('whitelist')) {
      console.log('💡 This appears to be an IP whitelist issue');
      console.log('   - Check Network Access settings in Atlas');
    }
    
    if (error.message.includes('cluster')) {
      console.log('💡 This appears to be a cluster connectivity issue');
      console.log('   - Check if the cluster is running');
      console.log('   - Verify the cluster URL is correct');
    }
  }
}

// Run the test
testMongoDBConnection().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
