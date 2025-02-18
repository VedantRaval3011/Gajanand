// src/lib/dbConnect.ts
import mongoose from 'mongoose';

// Load environment variables from .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Please check:');
    console.error('1. .env.local file exists in project root (C:\\Dev\\gajanand\\.env.local)');
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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    try {
      cached.promise = mongoose.connect(uri, opts);
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;