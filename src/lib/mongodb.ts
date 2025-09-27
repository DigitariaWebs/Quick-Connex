import { MongoClient } from 'mongodb';

// Check for MONGODB_URI, but don't throw error during build time
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is missing');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('MONGO')));
  console.error('NODE_ENV:', process.env.NODE_ENV);
  console.error('VERCEL_ENV:', process.env.VERCEL_ENV);
  
  // Only throw error if we're not in build mode or if we're in production
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    throw new Error('MONGODB_URI environment variable is required. Please add it to your environment variables.');
  }
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients-management-fallback';
const options = {};

// Log the MongoDB URI status for debugging
if (!process.env.MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI not found in environment variables, using fallback URI');
  console.warn('⚠️ This is expected during build time, but ensure MONGODB_URI is set in production');
} else {
  console.log('✅ MONGODB_URI found in environment variables');
}

let client;
let clientPromise;

// Only create MongoDB connection if we have a valid URI
if (uri && uri !== 'mongodb://localhost:27017/patients-management-fallback') {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      console.log('🔄 Creating MongoDB connection for development...');
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable
    console.log('🔄 Creating MongoDB connection for production...');
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  console.warn('⚠️ MongoDB connection skipped - no valid URI available');
  // Create a mock promise that resolves to null for build time
  clientPromise = Promise.resolve(null as any);
}

export default clientPromise as Promise<MongoClient>;