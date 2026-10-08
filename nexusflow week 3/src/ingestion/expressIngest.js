import express from 'express';
import { TelemetryPoint } from '../models/telemetrySchema.js';
import { validateTelemetryPayload, TELEMETRY_COLLECTION_NAME } from '../config/timeseriesSetup.js';

export function createExpressRouter({ batchBuffer, ruleExecutor, alertManager, getDB }) {
  const router = express.Router();

  /**
   * POST /api/v1/telemetry/ingest
   * High-speed REST ingestion endpoint (accepts single object or array)
   */
  router.post('/telemetry/ingest', (req, res) => {
    const rawData = req.body;
    if (!rawData) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }

    const items = Array.isArray(rawData) ? rawData : [rawData];
    let accepted = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const normalized = TelemetryPoint.normalize(raw);
      const validation = validateTelemetryPayload(normalized);

      if (!validation.valid) {
        errors.push({ index: i, errors: validation.errors });
        continue;
      }

      // 1. In-memory RxJS rule evaluation
      ruleExecutor.feedTelemetry(normalized);

      // 2. Queue into MongoDB Time-Series buffer
      const enqueued = batchBuffer.enqueue(normalized);
      if (enqueued) {
        accepted++;
      } else {
        errors.push({ index: i, errors: ['Buffer full / dropped under backpressure'] });
      }
    }

    return res.status(accepted > 0 ? 202 : 422).json({
      success: accepted > 0,
      received: items.length,
      accepted,
      dropped: items.length - accepted,
      errors: errors.slice(0, 10) // Limit error feedback length
    });
  });

  /**
   * GET /api/v1/telemetry/recent
   * Fetch recent time-series telemetry for a sensor
   */
  router.get('/telemetry/recent', async (req, res) => {
    try {
      const { sensorId, limit = 50 } = req.query;
      const numLimit = Math.min(parseInt(limit, 10) || 50, 500);

      try {
        const db = getDB();
        const query = sensorId ? { 'metadata.sensorId': sensorId } : {};
        const docs = await db.collection(TELEMETRY_COLLECTION_NAME)
          .find(query)
          .sort({ timestamp: -1 })
          .limit(numLimit)
          .toArray();
        return res.json({ success: true, count: docs.length, data: docs });
      } catch (dbErr) {
        // Fallback to in-memory buffer storage if db disconnected
        const inMem = batchBuffer.inMemoryStorage
          .filter(d => !sensorId || d.metadata.sensorId === sensorId)
          .slice(-numLimit)
          .reverse();
        return res.json({
          success: true,
          count: inMem.length,
          data: inMem,
          notice: 'Served from in-memory fallback'
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/telemetry/stats
   * Real-time metrics for ingestion, buffer, and rule executor
   */
  router.get('/telemetry/stats', (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      bufferMetrics: batchBuffer.getMetrics(),
      ruleMetrics: ruleExecutor.getMetrics(),
      alertMetrics: alertManager.getStats()
    });
  });

  /**
   * Dynamic Rule Management Endpoints
   */
  router.get('/rules', (req, res) => {
    res.json({
      success: true,
      activeRules: ruleExecutor.getActiveRules()
    });
  });

  router.post('/rules', (req, res) => {
    try {
      const graphJSON = req.body;
      const compiled = ruleExecutor.registerRuleGraph(graphJSON);
      res.status(201).json({
        success: true,
        message: `Rule '${compiled.ruleName}' registered and activated live.`,
        ruleId: compiled.ruleId
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  router.delete('/rules/:id', (req, res) => {
    const success = ruleExecutor.unregisterRule(req.params.id);
    if (success) {
      res.json({ success: true, message: `Rule ${req.params.id} unregistered.` });
    } else {
      res.status(404).json({ success: false, error: 'Rule not found' });
    }
  });

  router.get('/rules/alerts', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    res.json({
      success: true,
      alerts: alertManager.getRecentAlerts(limit)
    });
  });

  return router;
}
