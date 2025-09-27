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

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise as Promise<MongoClient>;