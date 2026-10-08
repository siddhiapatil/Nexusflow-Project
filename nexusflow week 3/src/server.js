import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB, getDB } from './config/database.js';
import { initializeTelemetryCollection } from './config/timeseriesSetup.js';
import { BatchIngestBuffer } from './ingestion/batchIngestBuffer.js';
import { WebSocketIngestionGateway } from './ingestion/websocketIngest.js';
import { createExpressRouter } from './ingestion/expressIngest.js';
import { LiveRuleExecutor } from './ruleEngine/liveRuleExecutor.js';
import { AlertManager } from './ruleEngine/alertManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const BATCH_SIZE = parseInt(process.env.INGEST_BATCH_SIZE || '500', 10);
const FLUSH_INTERVAL_MS = parseInt(process.env.INGEST_FLUSH_INTERVAL_MS || '50', 10);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));

  // Serve static dashboard UI
  app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

  console.log('====================================================');
  console.log('  NexusFlow - Visual IoT Telemetry & Rule Engine    ');
  console.log('  Week 3: Ingestion, Time-Series & Live RxJS Rules  ');
  console.log('====================================================');

  // Initialize Core Subsystems
  const alertManager = new AlertManager();
  const ruleExecutor = new LiveRuleExecutor({ alertManager });
  const batchBuffer = new BatchIngestBuffer({
    batchSize: BATCH_SIZE,
    flushIntervalMs: FLUSH_INTERVAL_MS
  });

  // Attempt MongoDB Connection and Time-Series Collection Provisioning
  let db = null;
  try {
    const conn = await connectDB();
    db = conn.db;
    await initializeTelemetryCollection(db);
    batchBuffer.setDatabase(db);
    console.log('[System] Native MongoDB Time-Series collection verified and ready.');
  } catch (dbErr) {
    console.warn(`[System] MongoDB not reachable at configured URI (${process.env.MONGODB_URI || 'mongodb://localhost:27017'}).`);
    console.warn('[System] Running in High-Speed In-Memory Simulation Mode for local testing.');
  }

  // Initialize Dynamic Predefined Rules (Turbine Temp Guard & Motor Vibration)
  ruleExecutor.initializeDefaultRules();

  // Attach WebSocket Ingestion & Dashboard Gateway
  const wsGateway = new WebSocketIngestionGateway({
    server,
    batchBuffer,
    ruleExecutor,
    alertManager
  });

  // Attach REST Ingestion API Router
  app.use('/api/v1', createExpressRouter({
    batchBuffer,
    ruleExecutor,
    alertManager,
    getDB: () => {
      try { return getDB(); } catch (e) { return null; }
    }
  }));

  // Root Status Endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'NexusFlow IoT Ingestion & Dynamic Rule Engine',
      version: '1.0.0',
      phase: 'Week 3 Sprint',
      endpoints: {
        webSocketTelemetryIngest: `ws://localhost:${PORT}/ws/telemetry`,
        webSocketDashboardFeed: `ws://localhost:${PORT}/dashboard`,
        restIngest: `POST http://localhost:${PORT}/api/v1/telemetry/ingest`,
        stats: `GET http://localhost:${PORT}/api/v1/telemetry/stats`,
        rules: `GET http://localhost:${PORT}/api/v1/rules`,
        liveDashboardUI: `http://localhost:${PORT}/dashboard`
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[Server] NexusFlow backend listening on http://localhost:${PORT}`);
    console.log(`[Server] Live Web Dashboard available at: http://localhost:${PORT}/dashboard`);
    console.log(`[Server] WebSocket Ingestion Gateway: ws://localhost:${PORT}/ws/telemetry`);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('\n[Server] Gracefully shutting down...');
    batchBuffer.stop();
    await batchBuffer.flushAll();
    ruleExecutor.dispose();
    server.close(() => {
      console.log('[Server] HTTP and WebSocket listeners closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch(err => {
  console.error('[Fatal] Server failed to start:', err);
});
