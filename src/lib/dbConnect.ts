// src/lib/dbConnect.ts
import mongoose from 'mongoose';

// Load environment variables from .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Please check:');
    console.error('1. .env.local file exists in project root');
    console.error('2. MONGODB_URI is properly defined in .env.local');
    console.error('3. No spaces or quotes around the MONGODB_URI value');
  }
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Remove any quotes that might have been accidentally added
const uri = MONGODB_URI.replace(/["']/g, '');

interface GlobalWithMongoose {
  mongoose: {
    conn: null | typeof mongoose;
    promise: null | Promise<typeof mongoose>;
  };
}

declare const global: GlobalWithMongoose;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If we already have a connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If we don't have a promise, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // CRITICAL: Limit connection pool size for MongoDB Atlas free tier
      maxPoolSize: 5, // Reduced from default 100 to 5 for free tier
      minPoolSize: 1, // Keep at least 1 connection alive
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      // For serverless environments
      maxConnecting: 2, // Limit simultaneous connection attempts
    };

    try {
      cached.promise = mongoose.connect(uri, opts);
      
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        // Clear the cached promise on error
        cached.promise = null;
        cached.conn = null;
      });
      
      mongoose.connection.on('disconnected', () => {
        // Clear the cached connection
        cached.conn = null;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log('🔒 MongoDB connection closed through app termination');
        }
      });

    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      cached.promise = null;
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('❌ Failed to establish MongoDB connection:', e);
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

// Optional: Add a function to get connection stats
export function getConnectionStats() {
  return {
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
  };
}

// Optional: Add a function to close connections (useful for testing)
export async function closeConnection() {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}

export default dbConnect;