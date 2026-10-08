import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexusflow_iot';
const DB_NAME = process.env.DB_NAME || 'nexusflow_iot';

let client = null;
let dbInstance = null;

/**
 * Connect to MongoDB with production-grade connection pooling configuration
 */
export async function connectDB(uri = MONGODB_URI) {
  if (dbInstance) {
    return { client, db: dbInstance };
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true
    });

    await client.connect();
    dbInstance = client.db(DB_NAME);
    console.log(`[MongoDB] Connected successfully to database: ${DB_NAME}`);
    return { client, db: dbInstance };
  } catch (error) {
    console.error(`[MongoDB] Connection failed: ${error.message}`);
    throw error;
  }
}

/**
 * Retrieve active MongoDB database instance
 */
export function getDB() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return dbInstance;
}

/**
 * Close MongoDB connection gracefully
 */
export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
    console.log('[MongoDB] Connection closed.');
  }
}
