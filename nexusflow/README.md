# NexusFlow - Telemetry Ingestion (MongoDB Time-Series)

MERN backend + monitor dashboard covering: time-series collection design, telemetry format, buffered ingestion (HTTP + WebSocket), sample data for rule execution, and the 5,000 writes/sec audit with real-time operational metrics.

## Layout
```
server/  src/{config,models,services,routes,ws,utils}  scripts/{setup-collection,seed-samples,simulate-sensors,audit-5k}
client/  React (Vite) live monitor: writes/sec, latency, queue, storage, latest readings
docs/    telemetry-format.md
```

## Quick start
```bash
docker compose up -d                  # MongoDB 7 (6.0+ required; 7+ recommended)
cd server && cp .env.example .env && npm install
npm run setup:db                      # creates the time-series collection + index
npm run dev                           # HTTP :4000, WS /ws/ingest
# new terminals
npm run seed                          # sample history + anomalies for rules
cd ../client && npm install && npm run dev   # http://localhost:5173
```

## Health checks
`GET /health` performs a live MongoDB ping rather than only checking whether the process is running. It returns `200` with `{"status":"ok","database":"connected"}` when the dependency is available, and `503` with `{"status":"degraded","database":"unavailable"}` when MongoDB cannot be reached. This makes it suitable for container readiness probes and load-balancer checks.

## Requirement -> where it lives
| Requirement | Implementation |
|---|---|
| Time-series design + telemetry format | `models/telemetry.collection.js`, `utils/validate.js`, `docs/telemetry-format.md` |
| Ingestion into time-series, continuous writes | `services/ingestion.service.js`, `routes/telemetry.routes.js`, `ws/ingest.socket.js` |
| High-frequency storage, monitor performance + organisation | `services/metrics.service.js`, `services/storage.service.js`, `/api/metrics/*`, dashboard |
| Stream -> backend flow, sample data for rules | WebSocket/HTTP ingestion, `npm run seed`, `GET /api/telemetry/rule-input` |
| 5,000 writes/sec audit + storage usage | `npm run audit` -> `reports/audit-*.{json,md}` |
| Mid-Review evidence | audit report, `npm run simulate` pipeline report, dashboard screenshots |

## Running the tests
```bash
# 1. Continuous writes, end to end (sensors -> WebSocket -> queue -> MongoDB)
npm run simulate -- --rate=5000 --duration=60 --devices=500

# 2. Database-level audit at 5,000 writes/sec (dedicated collection, recreated each run)
npm run audit -- --rate=5000 --duration=60

# Sanity checks
curl http://localhost:4000/health
curl -X POST localhost:4000/api/telemetry -H 'Content-Type: application/json' \
  -d '{"deviceId":"dev-0001","sensorType":"temperature","value":24.7,"unit":"C"}'
curl localhost:4000/api/metrics/ingestion
curl localhost:4000/api/metrics/storage
curl localhost:4000/api/telemetry/rule-input
```

Tuning knobs (`server/.env`): `INGEST_BATCH_SIZE`, `INGEST_MAX_INFLIGHT`, `INGEST_FLUSH_MS`, `INGEST_MAX_QUEUE`, `MONGO_POOL_SIZE`. Invalid negative numeric values fall back to safe defaults during configuration loading.

## Evidence checklist for the Mid-Review
1. `reports/audit-*.md` from a 60 s+ run (throughput, latency percentiles, PASS/FAIL).
2. `reports/pipeline-*.json` from `npm run simulate` (proves the API path, not only the driver).
3. Dashboard screenshot during the run (writes/sec vs target, queue depth).
4. Storage table from the audit (bytes/measurement, compression ratio, buckets and measurements per bucket).
5. Output of `npm run setup:db` showing `type: "timeseries"` and its options.

## Notes
- Numbers depend on your machine and MongoDB deployment; report the environment block the audit prints. Nothing in this repo has pre-recorded results.
- `collStats` sizes lag WiredTiger checkpoints; the audit waits `--settle` seconds (default 5) before reading them. For final numbers, re-run with `--settle=65`.
- Sensors with the same `deviceId` + `sensorType` share a bucket, so avoid putting per-reading values in `metadata`.
