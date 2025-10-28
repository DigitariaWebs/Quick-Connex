/**
 * Database Connection Initialization
 * 
 * Simple wrapper to initialize the database connection for server startup.
 * This provides a clean interface for the server to connect to the database.
 */

import { DatabaseService } from './core/DatabaseService';

/**
 * Initialize database connection
 * 
 * This function initializes the DatabaseService singleton and establishes
 * a connection to MongoDB. It's designed to be called during server startup.
 * 
 * @returns Promise<void>
 * @throws Error if connection fails
 */
export async function connectDatabase(): Promise<void> {
  try {
    console.log('📊 Initializing database connection...');
    
    // Connect using the static method
    const connection = await DatabaseService.connect();
    
    // Verify connection is working
    const isConnected = DatabaseService.isConnected();
    if (!isConnected) {
      throw new Error('Database connection verification failed');
    }
    
    console.log('✅ Database connected successfully');
    console.log(`📍 Database: ${connection.name}`);
    console.log(`🏠 Host: ${connection.host}:${connection.port}`);
    console.log(`🔗 State: ${connection.readyState}`);
    
    // Log basic configuration info
    console.log('⚙️  Database Configuration:');
    console.log(`   - Connection Pool: Active`);
    console.log(`   - Monitoring: Enabled`);
    console.log(`   - Caching: Enabled`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database
 * 
 * Gracefully closes the database connection. Should be called during
 * server shutdown.
 * 
 * @returns Promise<void>
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    console.log('📊 Disconnecting from database...');
    
    await DatabaseService.disconnect();
    
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

/**
 * Get database health status
 * 
 * Returns the current health status of the database connection.
 * Useful for health check endpoints.
 * 
 * @returns Promise<object> Health status object
 */
export async function getDatabaseHealth(): Promise<object> {
  try {
    const isConnected = DatabaseService.isConnected();
    
    return {
      connected: isConnected,
      status: isConnected ? 'healthy' : 'disconnected',
      lastChecked: new Date(),
      message: isConnected ? 'Database connection is active' : 'Database connection is not active'
    };
  } catch (error) {
    return {
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date()
    };
  }
}

/**
 * Check if database is connected
 * 
 * Simple boolean check for database connection status.
 * 
 * @returns boolean
 */
export function isDatabaseConnected(): boolean {
  try {
    return DatabaseService.isConnected();
  } catch {
    return false;
  }
}
