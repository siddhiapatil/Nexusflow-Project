# NexusFlow — MongoDB Time-Series Backend

MongoDB Time-Series backend for the **NexusFlow** IoT telemetry & rule engine project. A production-ready database layer for real-time sensor data ingestion, storage, and querying.

## Features & Work Completed

- **Robust database structure** — Comprehensive telemetry schema with metadata tracking for device context (`models/Telemetry.js`)
- **Optimized time-series storage** — MongoDB Time-Series collection for efficient compression and high-frequency sensor streams (`models/Telemetry.js`)
- **Database initialization & management** — Automated collection setup with proper indexing and configuration (`scripts/setupCollection.js`)
- **Sample data seeding** — Pre-loaded turbine sensor readings including realistic anomalies for testing (`scripts/seedData.js`)
- **Query testing & validation** — Comprehensive test suite covering aggregations, filters, and time-window queries (`scripts/testQueries.js`)
- **REST API integration** — Full API endpoints for telemetry retrieval with health checks and parameterized queries (`server.js` and `routes/telemetry.js`)

## Data Model

Each document represents one sensor reading:

```json
{
  "timestamp": "2026-09-23T10:15:00.000Z",
  "metadata": {
    "deviceId": "turbine-01",
    "deviceType": "TurbineSensor",
    "location": "PlantA/FloorB/Line1"
  },
  "sensorType": "temperature",
  "value": 74.32,
  "unit": "C",
  "quality": "ok"
}
```

- **timeField**: `timestamp` — Precision timestamp for all readings
- **metaField**: `metadata` — Device context stored separately for MongoDB bucketing efficiency
- **granularity**: `seconds` — Optimized for high-frequency sensor streams
- **Retention**: 30-day TTL via `expireAfterSeconds`; adjust or remove it for production retention needs.

## Setup

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI if not using the local default
```

Requires MongoDB **5.0+** (time-series collections) running locally or an Atlas cluster.

## Getting Started

```bash
npm run setup         # 1. create the time-series collection and indexes
npm run seed          # 2. insert sample turbine readings, including one seeded anomaly
npm run test:queries  # 3. run and print representative queries
npm start             # 4. start the API and check /health
```

Then, with the server running:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/telemetry/turbine-02?sensorType=temperature&limit=5
curl http://localhost:5000/api/telemetry/turbine-02/average?sensorType=temperature&window=5
```
