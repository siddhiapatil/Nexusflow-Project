import 'dotenv/config';

const int = (key, fallback) => {
  const value = Number.parseInt(process.env[key] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
};

export const env = Object.freeze({
  port: int('PORT', 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGODB_DB ?? 'nexusflow',
  telemetryCollection: process.env.TELEMETRY_COLLECTION ?? 'telemetry',
  retentionSeconds: int('RETENTION_SECONDS', 0),
  poolSize: int('MONGO_POOL_SIZE', 50),
  ingest: Object.freeze({
    batchSize: int('INGEST_BATCH_SIZE', 1000),
    flushIntervalMs: int('INGEST_FLUSH_MS', 100),
    maxInflight: int('INGEST_MAX_INFLIGHT', 8),
    maxQueue: int('INGEST_MAX_QUEUE', 200_000),
    maxRequestBatch: int('INGEST_MAX_REQUEST_BATCH', 5000),
  }),
});
