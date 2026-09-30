/**
 * MongoDB Time-Series ingestion audit (database-level).
 * Drives a fixed write rate straight into a dedicated audit collection with
 * unordered bulk inserts, then records throughput, latency and storage usage.
 *
 * Usage: npm run audit -- --rate=5000 --duration=60 --devices=500 --batch=1000 --inflight=8
 * Output: reports/audit-<timestamp>.json and .md
 */
import fs from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { env } from '../src/config/env.js';
import { BSON, getCollection, getDb } from '../src/config/db.js';
import { ensureTelemetryCollection } from '../src/models/telemetry.collection.js';
import { getStorageStats } from '../src/services/storage.service.js';
import { makeMeasurement, parseArgs, sleep, withDb } from './_common.js';

const {
  rate = 5000, duration = 60, devices = 500, batch = 1000, inflight = 8, settle = 5,
  collection = 'telemetry_audit',
} = parseArgs();

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0);
const mb = (b) => +(b / 1024 / 1024).toFixed(2);

await withDb(async () => {
  await ensureTelemetryCollection(collection, { recreate: true });
  const col = getCollection(collection);
  const buildInfo = await getDb().admin().command({ buildInfo: 1 });

  const latencies = [];
  const perSecond = new Array(duration + 30).fill(0);
  let written = 0;
  let failed = 0;
  let generated = 0;
  let laggedTicks = 0;
  const pending = new Set();

  const startedAt = performance.now();
  console.log(`Audit: target ${rate}/s for ${duration}s (batch=${batch}, inflight<=${inflight}, devices=${devices})`);

  const send = (docs) => {
    const t0 = performance.now();
    const p = col.insertMany(docs, { ordered: false })
      .then(() => {
        const now = performance.now();
        latencies.push(now - t0);
        written += docs.length;
        perSecond[Math.min(perSecond.length - 1, Math.floor((now - startedAt) / 1000))] += docs.length;
      })
      .catch((err) => { failed += docs.length - (err.result?.insertedCount ?? 0); })
      .finally(() => pending.delete(p));
    pending.add(p);
  };

  while ((performance.now() - startedAt) / 1000 < duration) {
    const due = Math.floor(((performance.now() - startedAt) / 1000) * rate) - generated;
    if (due >= batch) {
      const now = Date.now();
      const docs = Array.from({ length: batch }, (_, i) => makeMeasurement((generated + i) % devices, (generated + i) % 4, now - (batch - i)));
      generated += batch;
      send(docs);
      if (pending.size >= inflight) { laggedTicks += 1; await Promise.race(pending); }
    } else {
      await sleep(2);
    }
  }
  await Promise.all(pending);
  const wallSec = (performance.now() - startedAt) / 1000;

  await sleep(settle * 1000); // allow storage stats to settle
  const storage = await getStorageStats(collection);

  const sample = await col.find({}, { limit: 1000, projection: { _id: 0 } }).toArray();
  const avgBsonBytes = sample.length ? sample.reduce((s, d) => s + BSON.calculateObjectSize(d), 0) / sample.length : 0;
  const logicalBytes = avgBsonBytes * storage.measurements;

  const full = perSecond.slice(0, Math.floor(duration));
  const sortedLat = [...latencies].sort((a, b) => a - b);
  const avgRate = Math.round(written / wallSec);

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      mongodb: buildInfo.version, node: process.version, os: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()[0]?.model, cores: os.cpus().length, memGB: +(os.totalmem() / 1e9).toFixed(1), uri: env.mongoUri.replace(/\/\/.*@/, '//***@'),
    },
    config: { targetRate: rate, durationSec: duration, devices, batchSize: batch, maxInflight: inflight, collection },
    throughput: {
      generated, written, failed, wallSec: +wallSec.toFixed(2), avgWritesPerSec: avgRate,
      minWritesPerSec: Math.min(...full), maxWritesPerSec: Math.max(...full),
      targetMet: avgRate >= rate * 0.95 && failed === 0, backpressureEvents: laggedTicks,
    },
    latencyMs: { p50: +pct(sortedLat, 50).toFixed(2), p95: +pct(sortedLat, 95).toFixed(2), p99: +pct(sortedLat, 99).toFixed(2), max: +(sortedLat.at(-1) ?? 0).toFixed(2) },
    perSecondSeries: full,
    storage: {
      ...storage,
      avgBsonBytesPerMeasurement: +avgBsonBytes.toFixed(1),
      estimatedUncompressedMB: mb(logicalBytes),
      storageSizeMB: mb(storage.storageSizeBytes),
      indexSizeMB: mb(storage.indexSizeBytes),
      compressionRatio: storage.storageSizeBytes ? +(logicalBytes / storage.storageSizeBytes).toFixed(2) : null,
    },
  };

  fs.mkdirSync('reports', { recursive: true });
  const stamp = Date.now();
  fs.writeFileSync(`reports/audit-${stamp}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync(`reports/audit-${stamp}.md`, toMarkdown(report));
  console.log(toMarkdown(report));
  console.log(`Saved reports/audit-${stamp}.{json,md}`);
});

function toMarkdown(r) {
  const t = r.throughput, s = r.storage, b = s.buckets;
  return `# NexusFlow - MongoDB Time-Series Ingestion Audit

Generated: ${r.generatedAt}
Environment: MongoDB ${r.environment.mongodb} | Node ${r.environment.node} | ${r.environment.cores} cores | ${r.environment.memGB} GB RAM | ${r.environment.os}

## Test configuration
| Parameter | Value |
|---|---|
| Target rate | ${r.config.targetRate} writes/sec |
| Duration | ${r.config.durationSec} s |
| Simulated devices | ${r.config.devices} (4 sensors each) |
| Batch size / max in-flight | ${r.config.batchSize} / ${r.config.maxInflight} |

## Write performance
| Metric | Result |
|---|---|
| Measurements written | ${t.written.toLocaleString()} (failed: ${t.failed}) |
| Average throughput | **${t.avgWritesPerSec} writes/sec** |
| Min / max per-second | ${t.minWritesPerSec} / ${t.maxWritesPerSec} |
| Batch latency p50 / p95 / p99 / max | ${r.latencyMs.p50} / ${r.latencyMs.p95} / ${r.latencyMs.p99} / ${r.latencyMs.max} ms |
| Back-pressure events | ${t.backpressureEvents} |
| Target met (>=95%, 0 failures) | **${t.targetMet ? 'PASS' : 'FAIL'}** |

## Storage footprint and data organisation
| Metric | Result |
|---|---|
| Measurements stored | ${s.measurements.toLocaleString()} |
| Avg BSON size / measurement | ${s.avgBsonBytesPerMeasurement} B |
| Estimated uncompressed size | ${s.estimatedUncompressedMB} MB |
| Storage size on disk | ${s.storageSizeMB} MB |
| Index size | ${s.indexSizeMB} MB |
| Compression ratio | ${s.compressionRatio}x |
| On-disk bytes / measurement | ${s.bytesPerMeasurementOnDisk} B |
| Buckets | ${b.bucketCount.toLocaleString()} (avg ${b.avgMeasurementsPerBucket} measurements/bucket) |
| Bucket inserts / updates | ${b.numBucketInserts} / ${b.numBucketUpdates} |
| Buckets closed: count / size / time-forward | ${b.numBucketsClosedDueToCount} / ${b.numBucketsClosedDueToSize} / ${b.numBucketsClosedDueToTimeForward} |
`;
}
