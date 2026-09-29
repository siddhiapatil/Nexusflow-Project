import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    dbName: env.dbName,
    maxPoolSize: env.poolSize,
    serverSelectionTimeoutMS: 5000,
  });
  return mongoose.connection;
}

export const disconnectDb = () => mongoose.disconnect();
export const getDb = () => mongoose.connection.db;
export const getCollection = (name = env.telemetryCollection) => getDb().collection(name);
export const { BSON } = mongoose.mongo;
