import { getDb } from '../config/db.js';

/** Storage footprint and bucket organisation via the `collStats` command. */
export async function getStorageStats(name) {
  const stats = await getDb().command({ collStats: name });
  const ts = stats.timeseries ?? {};
  const count = stats.count ?? 0;
  const bucketCount = ts.bucketCount ?? 0;

  return {
    collection: name,
    measurements: count,
    logicalSizeBytes: stats.size ?? 0,
    storageSizeBytes: stats.storageSize ?? 0,
    indexSizeBytes: stats.totalIndexSize ?? 0,
    avgMeasurementBytes: stats.avgObjSize ?? 0,
    bytesPerMeasurementOnDisk: count ? +((stats.storageSize ?? 0) / count).toFixed(2) : 0,
    buckets: {
      bucketCount,
      avgBucketSizeBytes: ts.avgBucketSize ?? 0,
      avgMeasurementsPerBucket: bucketCount ? +(count / bucketCount).toFixed(1) : 0,
      numBucketInserts: ts.numBucketInserts ?? 0,
      numBucketUpdates: ts.numBucketUpdates ?? 0,
      numBucketsOpenedDueToMetadata: ts.numBucketsOpenedDueToMetadata ?? 0,
      numBucketsClosedDueToCount: ts.numBucketsClosedDueToCount ?? 0,
      numBucketsClosedDueToSize: ts.numBucketsClosedDueToSize ?? 0,
      numBucketsClosedDueToTimeForward: ts.numBucketsClosedDueToTimeForward ?? 0,
      numBucketsClosedDueToTimeBackward: ts.numBucketsClosedDueToTimeBackward ?? 0,
    },
  };
}
