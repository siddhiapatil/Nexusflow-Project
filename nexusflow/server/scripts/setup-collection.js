import { env } from '../src/config/env.js';
import { getDb } from '../src/config/db.js';
import { ensureTelemetryCollection } from '../src/models/telemetry.collection.js';
import { withDb } from './_common.js';

await withDb(async () => {
  await ensureTelemetryCollection();
  const [info] = await getDb().listCollections({ name: env.telemetryCollection }).toArray();
  console.log(`Collection "${env.dbName}.${env.telemetryCollection}" ready`);
  console.log(JSON.stringify({ type: info.type, options: info.options }, null, 2));
});
