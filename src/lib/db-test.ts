import dbConnect from './mongoose';

/**
 * Test MongoDB connection on application startup
 */
export async function testDatabaseConnection() {
  try {
    console.log('🚀 Application: Testing MongoDB connection...');
    await dbConnect();
    console.log('🎉 Application: MongoDB connection test successful!');
    return true;
  } catch (error) {
    console.error('💥 Application: MongoDB connection test failed:', error);
    return false;
  }
}

/**
 * Log application startup information
 */
export function logStartupInfo() {
  console.log('='.repeat(50));
  console.log('🏥 Patients Management System');
  console.log('='.repeat(50));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
  console.log('='.repeat(50));
}
