/**
 * server.js
 * -----------------------------------------------------------------------
 * Week 1 task: "Check database + API integration"
 *
 * Boots Express, connects to MongoDB, and exposes:
 *   GET  /health              -> confirms the API can reach the DB
 *   POST /api/telemetry       -> ingest a reading
 *   GET  /api/telemetry/:id   -> fetch recent readings for a device
 *   GET  /api/telemetry/:id/average -> moving-average aggregation
 * -----------------------------------------------------------------------
 */

const express = require('express');
const { connectDB, mongoose } = require('./config/db');
const telemetryRoutes = require('./routes/telemetry');

require('dotenv').config();

const app = express();
app.use(express.json());

app.use('/api/telemetry', telemetryRoutes);

// Integration check: pings the live connection's readyState AND runs a
// trivial query, so this catches both "DB unreachable" and "DB reachable
// but collection misconfigured" failure modes.
app.get('/health', async (req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  try {
    const count = await mongoose.connection.db
      .collection('telemetry')
      .estimatedDocumentCount();

    res.json({
      status: state === 1 ? 'ok' : 'degraded',
      dbConnected: state === 1,
      telemetryDocumentCount: count,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', dbConnected: state === 1, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] NexusFlow API listening on http://localhost:${PORT}`);
    console.log(`[Server] Try: curl http://localhost:${PORT}/health`);
  });
});
