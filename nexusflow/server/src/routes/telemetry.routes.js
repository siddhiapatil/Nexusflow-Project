import { Router } from 'express';
import { env } from '../config/env.js';
import { parseReadings } from '../utils/validate.js';
import { buildRuleInput, latestReadings, queryHistory } from '../services/telemetry.service.js';

export function telemetryRoutes({ ingestion, metrics }) {
  const router = Router();

  // Ingest one reading or an array of readings.
  router.post('/', (req, res) => {
    const body = req.body;
    const size = Array.isArray(body) ? body.length : 1;
    if (size > env.ingest.maxRequestBatch) {
      return res.status(413).json({ error: `Max ${env.ingest.maxRequestBatch} readings per request` });
    }

    const { docs, rejected, errors } = parseReadings(body);
    metrics.rejected += rejected;
    const { accepted, dropped } = ingestion.enqueue(docs);

    if (dropped > 0) {
      res.set('Retry-After', '1');
      return res.status(429).json({ accepted, dropped, rejected, errors, error: 'Ingestion queue full' });
    }
    return res.status(202).json({ accepted, rejected, errors });
  });

  router.get('/latest', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 1000);
      res.json(await latestReadings({ deviceId: req.query.deviceId, limit }));
    } catch (err) { next(err); }
  });

  // Sample payload for rule execution (RxJS compiler input contract).
  router.get('/rule-input', async (req, res, next) => {
    try {
      res.json(await buildRuleInput({ limit: Math.min(Number(req.query.limit) || 100, 1000) }));
    } catch (err) { next(err); }
  });

  router.get('/', async (req, res, next) => {
    try {
      const { deviceId, sensorType, from, to } = req.query;
      if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
      res.json(await queryHistory({ deviceId, sensorType, from, to, limit: Number(req.query.limit) || 500 }));
    } catch (err) { next(err); }
  });

  return router;
}
