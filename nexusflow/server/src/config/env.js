import 'dotenv/config';

const int = (key, fallback, { min = Number.MIN_SAFE_INTEGER } = {}) => {
  const value = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isInteger(value) && value >= min ? value : fallback;
};

export const env = Object.freeze({
  port: int('PORT', 4000, { min: 0 }),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGODB_DB ?? 'nexusflow',
  telemetryCollection: process.env.TELEMETRY_COLLECTION ?? 'telemetry',
  retentionSeconds: int('RETENTION_SECONDS', 0, { min: 0 }),
  poolSize: int('MONGO_POOL_SIZE', 50, { min: 1 }),
  ingest: Object.freeze({
    batchSize: int('INGEST_BATCH_SIZE', 1000, { min: 1 }),
    flushIntervalMs: int('INGEST_FLUSH_MS', 100, { min: 1 }),
    maxInflight: int('INGEST_MAX_INFLIGHT', 8, { min: 1 }),
    maxQueue: int('INGEST_MAX_QUEUE', 200_000, { min: 1 }),
    maxRequestBatch: int('INGEST_MAX_REQUEST_BATCH', 5000, { min: 1 }),
  }),
});
