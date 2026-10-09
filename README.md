# NexusFlow

**NexusFlow** is a visual IoT telemetry and rule engine platform for real-time sensor monitoring, ingestion, and orchestration. It combines a React-based drag-and-drop interface with a high-performance Node.js backend and MongoDB time-series storage so business users can monitor live device streams, inspect rule-driven alerts, and model operational logic without writing custom code.

## Key Features

- 🚀 **High-Throughput Ingestion** — Bounded buffering, batched writes, and configurable backpressure for sustained telemetry ingestion.
- 📊 **Real-Time Dashboard** — Live monitoring of write throughput, latency, queue depth, storage metrics, and latest sensor readings.
- 🗄️ **Time-Series Optimized** — MongoDB 7+ time-series collection setup with collection validation, retention settings, and storage analysis.
- 🔌 **Dual Protocol** — HTTP REST endpoints plus WebSocket ingestion for low-latency streaming and real-time updates.
- 🎨 **No-Code Rule Engine** — Rule input generation and reactive evaluation support for visual flow-driven logic and alerting.
- ✅ **Production Ready** — Health checks, graceful shutdown, validation, error handling, and tuning parameters for production-like workloads.

## Project Structure

```
Nexusflow-Project/
├── nexusflow/                         # Main application workspace
│   ├── server/                       # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── app.js                # App factory, health route, and API routing
│   │   │   ├── server.js             # DB bootstrap, queue start-up, and shutdown flow
│   │   │   ├── config/               # env, MongoDB, time-series, and collection config
│   │   │   ├── models/               # Telemetry collection + schema definitions
│   │   │   ├── routes/               # Telemetry and metrics REST endpoints
│   │   │   ├── services/             # Ingestion, metrics, telemetry, and storage logic
│   │   │   ├── utils/                # Validation and request helpers
│   │   │   ├── ws/                   # WebSocket ingestion socket
│   │   │   └── ...
│   │   ├── scripts/
│   │   │   ├── setup-collection.js   # Creates MongoDB time-series collection and indexes
│   │   │   ├── seed-samples.js       # Loads example sensor history and anomaly samples
│   │   │   ├── simulate-sensors.js   # Generates realistic telemetry load for tests
│   │   │   └── audit-5k.js           # Runs 5,000 writes/sec validation and reporting
│   │   ├── package.json
│   │   ├── README.md                 # Backend project documentation
│   │   └── docker-compose.yml        # MongoDB container setup
│   │
│   ├── client/                       # React + Vite frontend
│   │   ├── src/
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   ├── docs/
│   │   └── telemetry-format.md       # Sensor payload format and field contract
│   ├── README.md                     # Workspace guide and implementation notes
│   └── docker-compose.yml            # Local MongoDB orchestration
│
├── README.md                         # This file (product overview)
├── API_SPEC.md                       # Example telemetry API contract
├── CONTRIBUTING.md                   # Contribution guidelines
├── INTEGRATION_STRATEGY.md           # Migration and integration planning doc
├── .env.example                      # Root environment template for the server
├── execution_history.json            # Sample execution traces/history
├── .gitignore
├── package.json
├── server.js
├── src/
└── ...
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB 7+ (recommended) or MongoDB 6.0+

### 1. Start MongoDB

```bash
cd Nexusflow-Project/nexusflow
docker compose up -d
```

### 2. Configure and start the backend

```bash
cd Nexusflow-Project
cp .env.example nexusflow/server/.env

cd nexusflow/server
npm install
npm run setup:db
npm run seed
npm run dev
```

The backend exposes the API at `http://localhost:4000` and the WebSocket ingestion endpoint at `ws://localhost:4000/ws/ingest`.

### 3. Start the frontend

```bash
cd Nexusflow-Project/nexusflow/client
npm install
npm run dev
```

The client runs at `http://localhost:5173`.

### 4. Validate the system

```bash
curl http://localhost:4000/health

curl -X POST http://localhost:4000/api/telemetry \
  -H 'Content-Type: application/json' \
  -d '{
    "deviceId": "sensor-01",
    "sensorType": "temperature",
    "value": 72.5,
    "unit": "C",
    "quality": "good"
  }'

curl http://localhost:4000/api/metrics/ingestion
curl http://localhost:4000/api/metrics/storage
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | MongoDB connectivity and service health check |
| `POST` | `/api/telemetry` | Ingest single or batch telemetry readings |
| `GET` | `/api/telemetry/latest` | Fetch latest value(s) for a device or sensor |
| `GET` | `/api/telemetry?deviceId=...` | Query historical telemetry with filters |
| `GET` | `/api/telemetry/rule-input` | Generate sample payloads for rule-engine evaluation |
| `GET` | `/api/metrics/ingestion` | Queue depth, throughput, and ingestion metrics |
| `GET` | `/api/metrics/storage` | Storage utilization and collection statistics |
| `WS` | `/ws/ingest` | WebSocket telemetry stream for live ingestion |

## Performance Testing

```bash
cd Nexusflow-Project/nexusflow/server

# Run generated telemetry production-like simulation
npm run simulate -- --rate=5000 --duration=60 --devices=500

# Run the 5,000 writes/sec audit and generate metrics reports
npm run audit -- --rate=5000 --duration=60
```

These scripts validate throughput, latency, queue health, and storage performance against the repo's time-series design and ingestion pipeline.

## Development Workflow

```bash
git checkout -b feature/your-feature

cd nexusflow/server && npm run dev
cd ../client && npm run dev

git add .
git commit -m "feat: description of your change"
git push origin feature/your-feature
```

For detailed contribution standards, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Technology Stack

- **Backend**: Node.js 20+, Express.js, MongoDB driver, WebSocket server
- **Database**: MongoDB 7+ with time-series collections and validation
- **Frontend**: React 18, Vite
- **DevOps**: Docker, Docker Compose

## Environment Variables

Create `nexusflow/server/.env` from the root template or the project template file:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=nexusflow
TELEMETRY_COLLECTION=telemetry
RETENTION_SECONDS=2592000
INGEST_BATCH_SIZE=1000
INGEST_FLUSH_MS=100
INGEST_MAX_INFLIGHT=8
INGEST_MAX_QUEUE=200000
INGEST_MAX_REQUEST_BATCH=5000
MONGO_POOL_SIZE=50
```

## Troubleshooting

### MongoDB connection fails

```bash
cd Nexusflow-Project/nexusflow
docker compose ps

# Verify local MongoDB is listening
nc -zv localhost 27017
```

### High memory usage

Reduce queue and pool sizing in `nexusflow/server/.env`:

```env
INGEST_MAX_QUEUE=100000
MONGO_POOL_SIZE=25
```

### Port already in use

```bash
# Change PORT in .env
PORT=5000
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Write Throughput | 5,000 measurements/sec |
| Batch Flush Latency (p95) | < 100 ms |
| Storage Efficiency | Optimized for MongoDB time-series buckets and compression |
| Memory Usage | Bounded via queue and inflight tuning |

## Project Roadmap

- [ ] Rule engine UI and visual flow designer enhancements
- [ ] Alerting and threshold monitoring improvements
- [ ] Multi-tenancy and tenant isolation
- [ ] Streaming analytics with time-window aggregations
- [ ] Advanced caching and external workflow integrations
- [ ] Event-driven automation and escalation rules

## License

MIT

## Support

For questions, issues, or feature requests:

- Open a [GitHub Issue](https://github.com/siddhiapatil/Nexusflow-Project/issues)
- Check [Discussions](https://github.com/siddhiapatil/Nexusflow-Project/discussions)
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

---

**Status**: Active development and validation workflow  
**Version**: 1.0.0  
**Last Updated**: 2026-10-09
