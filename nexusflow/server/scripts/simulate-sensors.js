// End-to-end pipeline test: sensors -> WebSocket -> ingestion queue -> MongoDB time-series.
// Usage: npm run simulate -- --rate=5000 --devices=500 --duration=30 --port=4000
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { makeMeasurement, parseArgs, sleep } from './_common.js';

const { rate = 5000, devices = 500, duration = 30, port = 4000, host = 'localhost' } = parseArgs();
const base = `${host}:${port}`;
const TICK_MS = 100;
const perTick = Math.round((rate * TICK_MS) / 1000);

const toWire = (m) => ({
  deviceId: m.metadata.deviceId, sensorType: m.metadata.sensorType, unit: m.metadata.unit,
  site: m.metadata.site, value: m.value, timestamp: m.timestamp.getTime(), quality: m.quality,
});

const ws = new WebSocket(`ws://${base}/ws/ingest`);
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });

const acks = { accepted: 0, rejected: 0, dropped: 0 };
ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'ack') { acks.accepted += msg.accepted; acks.rejected += msg.rejected; acks.dropped += msg.dropped; }
});

const before = await (await fetch(`http://${base}/api/metrics/ingestion`)).json();
const started = Date.now();
let sent = 0;
console.log(`Streaming ${rate} readings/s from ${devices} devices for ${duration}s ...`);

while ((Date.now() - started) / 1000 < duration) {
  const tickStart = Date.now();
  const batch = Array.from({ length: perTick }, (_, i) => toWire(makeMeasurement((sent + i) % devices, (sent + i) % 4)));
  if (ws.bufferedAmount < 8 * 1024 * 1024) { ws.send(JSON.stringify(batch)); sent += perTick; }
  await sleep(Math.max(0, TICK_MS - (Date.now() - tickStart)));
}
await sleep(2000); // let the queue drain
const elapsed = (Date.now() - started) / 1000;
const after = await (await fetch(`http://${base}/api/metrics/ingestion`)).json();
const storage = await (await fetch(`http://${base}/api/metrics/storage`)).json();
ws.close();

const result = {
  target: rate, durationSec: +elapsed.toFixed(1), sent, acks,
  writtenDuringRun: after.written - before.written,
  avgWritesPerSec: Math.round((after.written - before.written) / elapsed),
  peakWritesPerSec: after.writesPerSecPeak,
  batchLatencyMs: after.batchLatencyMs, queueDepthAtEnd: after.queueDepth, failed: after.failed - before.failed, storage,
};
console.log(JSON.stringify(result, null, 2));
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(`reports/pipeline-${Date.now()}.json`, JSON.stringify(result, null, 2));
