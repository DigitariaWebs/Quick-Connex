import mongoose from 'mongoose';

// Define global interface for mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global variable to maintain connection across hot reloads
let globalMongoose: MongooseCache;

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}
globalMongoose = global._mongooseCache;

// Add type definition for global
declare global {
  var _mongooseCache: MongooseCache;
}

/**
 * Connect to MongoDB using Mongoose
 */
async function dbConnect(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MongoDB connection failed: MONGODB_URI environment variable is not defined');
    console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('MONGO')));
    console.error('NODE_ENV:', process.env.NODE_ENV);
    console.error('VERCEL_ENV:', process.env.VERCEL_ENV);
    
    // Only throw error if we're in production
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
      throw new Error(
        'MONGODB_URI environment variable is required. Please add it to your environment variables.'
      );
    }
    
    // For build time, return a mock connection
    console.warn('⚠️ MongoDB: Using mock connection for build time');
    return mongoose;
  }

  if (globalMongoose.conn) {
    console.log('✅ MongoDB: Using existing connection');
    return globalMongoose.conn;
  }

  if (!globalMongoose.promise) {
    console.log('🔄 MongoDB: Creating new connection...');
    const opts = {
      bufferCommands: false,
    };

    globalMongoose.promise = mongoose.connect(process.env.MONGODB_URI, opts);
  }

  try {
    globalMongoose.conn = await globalMongoose.promise;
    console.log('✅ MongoDB: Successfully connected to database');
    console.log(`📊 MongoDB: Connected to database: ${globalMongoose.conn.connection.name}`);
    console.log(`🌐 MongoDB: Host: ${globalMongoose.conn.connection.host}:${globalMongoose.conn.connection.port}`);
    
    // Log connection events
    globalMongoose.conn.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    globalMongoose.conn.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB: Disconnected from database');
    });

    globalMongoose.conn.connection.on('reconnected', () => {
      console.log('🔄 MongoDB: Reconnected to database');
    });

  } catch (e) {
    console.error('❌ MongoDB connection failed:', e);
    globalMongoose.promise = null;
    throw e;
  }

  return globalMongoose.conn;
}

export default dbConnect;