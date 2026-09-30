import http from 'node:http';
import { env } from './config/env.js';
import { connectDb, disconnectDb, getDb } from './config/db.js';
import { ensureTelemetryCollection } from './models/telemetry.collection.js';
import { IngestionMetrics } from './services/metrics.service.js';
import { IngestionService } from './services/ingestion.service.js';
import { createApp } from './app.js';
import { attachIngestSocket } from './ws/ingest.socket.js';

async function main() {
  await connectDb();
  const collection = await ensureTelemetryCollection();

  const metrics = new IngestionMetrics();
  const ingestion = new IngestionService(collection, metrics, env.ingest);
  metrics.start();
  ingestion.start();

  const server = http.createServer(createApp({
    ingestion,
    metrics,
    healthCheck: async () => {
      await getDb().command({ ping: 1 });
      return { database: 'connected' };
    },
  }));
  const wss = attachIngestSocket(server, { ingestion, metrics });

  server.listen(env.port, () => {
    console.log(`[nexusflow] HTTP  http://localhost:${env.port}`);
    console.log(`[nexusflow] WS    ws://localhost:${env.port}/ws/ingest`);
  });

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`[nexusflow] ${signal} received, draining queue...`);
    wss.close();
    await new Promise((resolve) => server.close(resolve));
    await ingestion.stop();
    metrics.stop();
    await disconnectDb();
  };
  process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)));
  process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)));
}

main().catch((err) => {
  console.error('[nexusflow] fatal:', err);
  process.exit(1);
});
