import { getCollection } from '../config/db.js';

const toReading = (doc) => ({
  deviceId: doc.deviceId,
  sensorType: doc.sensorType,
  value: doc.value,
  unit: doc.unit,
  quality: doc.quality,
  timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp,
});

/** Latest measurement per (deviceId, sensorType) - uses the meta+time index. */
export async function latestReadings({ deviceId, limit = 100 } = {}) {
  const pipeline = [];
  if (deviceId) pipeline.push({ $match: { 'metadata.deviceId': deviceId } });
  pipeline.push(
    { $sort: { 'metadata.deviceId': 1, 'metadata.sensorType': 1, timestamp: -1 } },
    {
      $group: {
        _id: { deviceId: '$metadata.deviceId', sensorType: '$metadata.sensorType' },
        timestamp: { $first: '$timestamp' },
        value: { $first: '$value' },
        unit: { $first: '$metadata.unit' },
        quality: { $first: '$quality' },
      },
    },
    { $limit: limit },
  );
  const docs = await getCollection().aggregate(pipeline).toArray();
  return docs.map((d) => toReading({ ...d._id, ...d, _id: undefined }));
}

/** Raw history for one device/sensor - used for rule windows (avg, max over N seconds). */
export async function queryHistory({ deviceId, sensorType, from, to, limit = 500 }) {
  const filter = { 'metadata.deviceId': deviceId };
  if (sensorType) filter['metadata.sensorType'] = sensorType;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }
  const docs = await getCollection()
    .find(filter, { projection: { _id: 0 } })
    .sort({ timestamp: -1 })
    .limit(Math.min(limit, 5000))
    .toArray();
  return docs.map((d) => toReading({ ...d.metadata, value: d.value, quality: d.quality, timestamp: d.timestamp }));
}

/**
 * Rule-engine input contract. The RxJS stream compiler consumes this shape:
 *   { generatedAt, readings: [{ deviceId, sensorType, value, unit, quality, timestamp }] }
 */
export async function buildRuleInput({ limit = 100 } = {}) {
  return { generatedAt: new Date().toISOString(), readings: await latestReadings({ limit }) };
}
