// Seeds realistic history plus deliberate anomalies so rules have something to fire on.
// Usage: npm run seed -- --devices=10 --minutes=10 --hz=1
import { getCollection } from '../src/config/db.js';
import { ensureTelemetryCollection } from '../src/models/telemetry.collection.js';
import { makeMeasurement, parseArgs, SENSORS, withDb } from './_common.js';

const { devices = 10, minutes = 10, hz = 1 } = parseArgs();

await withDb(async () => {
  await ensureTelemetryCollection();
  const now = Date.now();
  const steps = minutes * 60 * hz;
  const docs = [];

  for (let step = steps; step >= 0; step -= 1) {
    const ts = now - (step * 1000) / hz;
    for (let d = 0; d < devices; d += 1) {
      for (let s = 0; s < SENSORS.length; s += 1) docs.push(makeMeasurement(d, s, ts));
    }
  }

  // Anomalies: device 0 overheats in the last 30 s, device 1 loses signal quality.
  for (let i = 0; i < 30; i += 1) {
    const doc = makeMeasurement(0, 0, now - (30 - i) * 1000);
    doc.value = 85 + i * 0.5;
    docs.push(doc);
    const noisy = makeMeasurement(1, 1, now - (30 - i) * 1000);
    noisy.quality = 'bad';
    docs.push(noisy);
  }

  const col = getCollection();
  for (let i = 0; i < docs.length; i += 5000) await col.insertMany(docs.slice(i, i + 5000), { ordered: false });
  console.log(`Inserted ${docs.length} sample measurements (${devices} devices x ${SENSORS.length} sensors)`);
});
