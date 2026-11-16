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

// Hard upper bound on how long any request waits to get a connection. Without it a
// stuck connect left every request on the instance hanging until Vercel killed them
// (300s "Task timed out" errors) and the whole app was down for minutes.
const CONNECT_DEADLINE_MS = 25000;

const opts = {
  bufferCommands: false,
  // Skip Mongoose's automatic index (re)build on every cold-start connection in
  // production; kept on in dev for convenience.
  autoIndex: process.env.NODE_ENV !== 'production',
  // Pool for Atlas + Vercel serverless; far under Atlas's 500-connection limit.
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60000,
  // An idle free-tier cluster can take more than 5s to answer the first connection.
  serverSelectionTimeoutMS: 20000,
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  maxConnecting: 2,
};

interface GlobalWithMongoose {
  mongoose: {
    conn: null | typeof mongoose;
    promise: null | Promise<typeof mongoose>;
    listenersAttached?: boolean;
  };
}

declare const global: GlobalWithMongoose;

const cached = global.mongoose ?? (global.mongoose = { conn: null, promise: null });

// Log-only listeners, attached once per process. They deliberately do NOT reset the
// cached connection: after the first successful connect the MongoDB driver reconnects
// on its own. Calling mongoose.connect() again while it is reconnecting is what could
// hang forever (it waits for an "open" event that never comes).
if (!cached.listenersAttached) {
  cached.listenersAttached = true;
  mongoose.connection.on('error', (err) => console.error('❌ MongoDB connection error:', err?.message || err));
  mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected; driver will reconnect'));
  mongoose.connection.on('reconnected', () => console.info('✅ MongoDB reconnected'));
}

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} took longer than ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

async function dbConnect(): Promise<typeof mongoose> {
  // Connected (or the driver already reconnected): use it.
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return mongoose;
  }

  // Initial connect happened before but the link is down right now. Don't call
  // connect() on top of the driver's own reconnect. A ping makes the driver pick a
  // server (reconnecting if it can); only if that fails do we tear down and start
  // over — every step with a deadline, so nothing can hang.
  if (cached.conn) {
    try {
      await withDeadline(
        mongoose.connection.db!.admin().command({ ping: 1 }),
        CONNECT_DEADLINE_MS,
        'MongoDB reconnect ping'
      );
      return cached.conn;
    } catch (pingError) {
      console.warn('⚠️ MongoDB not recovering, reconnecting from scratch:', (pingError as Error)?.message);
      await withDeadline(mongoose.disconnect(), 5000, 'MongoDB disconnect').catch(() => {});
      cached.conn = null;
      cached.promise = null;
    }
  }

  // First connect in this process (or the previous first attempt failed).
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, opts).catch((err) => {
      cached.promise = null; // allow the next request to try again
      throw err;
    });
  }

  try {
    cached.conn = await withDeadline(cached.promise, CONNECT_DEADLINE_MS, 'MongoDB connect');
    return cached.conn;
  } catch (e) {
    console.error('❌ Failed to establish MongoDB connection:', (e as Error)?.message || e);
    // A connect that blew the deadline may still be pending; drop it so the next
    // request starts a fresh attempt instead of waiting on the stuck one.
    cached.promise = null;
    throw e;
  }
}

// SIGINT handler at module level — only registered once per process, never inside dbConnect().
// Guarded to development only; Vercel production containers are killed by the platform directly.
if (process.env.NODE_ENV !== 'production') {
  process.once('SIGINT', async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔒 MongoDB connection closed through app termination');
    }
  });
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
