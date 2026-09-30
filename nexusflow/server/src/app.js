import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { telemetryRoutes } from './routes/telemetry.routes.js';
import { metricsRoutes } from './routes/metrics.routes.js';

export function createApp(deps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', async (_req, res) => {
    try {
      const details = deps.healthCheck ? await deps.healthCheck() : {};
      res.json({ status: 'ok', ...details });
    } catch (error) {
      console.error('[health]', error.message);
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });
  app.use('/api/telemetry', telemetryRoutes(deps));
  app.use('/api/metrics', metricsRoutes(deps));

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[http]', err);
    res.status(err.status ?? 500).json({ error: err.message ?? 'Internal error' });
  });
  return app;
}
