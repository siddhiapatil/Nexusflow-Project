import { Router } from 'express';
import { env } from '../config/env.js';
import { getStorageStats } from '../services/storage.service.js';

export function metricsRoutes({ ingestion, metrics }) {
  const router = Router();

  router.get('/ingestion', (_req, res) => {
    res.json(metrics.snapshot({ queueDepth: ingestion.queueDepth, inflightBatches: ingestion.inflight }));
  });

  router.get('/storage', async (_req, res, next) => {
    try {
      res.json(await getStorageStats(env.telemetryCollection));
    } catch (err) { next(err); }
  });

  return router;
}
