import { env } from '../config/env.js';
import { getDb } from '../config/db.js';

/**
 * Time-series design
 *  - timeField : `timestamp`  (BSON Date, required on every measurement)
 *  - metaField : `metadata`   (source identity that rarely changes -> bucketing key)
 *  - granularity: 'seconds'   (sensors report at ~1 Hz .. 10 Hz per device)
 *
 * Measurement document:
 *  {
 *    timestamp: Date,
 *    metadata:  { deviceId, sensorType, unit?, site? },
 *    value:     Number,
 *    quality:   'good' | 'uncertain' | 'bad'
 *  }
 */
export const TIME_SERIES_OPTIONS = Object.freeze({
  timeField: 'timestamp',
  metaField: 'metadata',
  granularity: 'seconds',
});

export const INDEX_SPEC = { 'metadata.deviceId': 1, 'metadata.sensorType': 1, timestamp: -1 };

export async function ensureTelemetryCollection(
  name = env.telemetryCollection,
  { recreate = false } = {},
) {
  const db = getDb();
  let [existing] = await db.listCollections({ name }).toArray();

  if (existing && recreate) {
    await db.collection(name).drop();
    existing = undefined;
  }
  if (existing && existing.type !== 'timeseries') {
    throw new Error(`Collection "${name}" exists but is not a time-series collection`);
  }
  if (!existing) {
    const options = { timeseries: TIME_SERIES_OPTIONS };
    if (env.retentionSeconds > 0) options.expireAfterSeconds = env.retentionSeconds;
    await db.createCollection(name, options);
  }

  const collection = db.collection(name);
  await collection.createIndex(INDEX_SPEC, { name: 'device_sensor_time' });
  return collection;
}
