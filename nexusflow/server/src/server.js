import http from 'node:http';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
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

  const server = http.createServer(createApp({ ingestion, metrics }));
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
    server.close();
    await ingestion.stop();
    metrics.stop();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[nexusflow] fatal:', err);
  process.exit(1);
});
