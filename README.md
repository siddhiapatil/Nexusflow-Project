# NexusFlow

**NexusFlow** is a visual IoT telemetry and rule engine platform for real-time sensor monitoring, ingestion, and orchestration. It combines a React-based drag-and-drop interface with a high-performance Node.js backend and MongoDB time-series storage.

## Key Features

- 🚀 **High-Throughput Ingestion** — 5,000+ measurements/second with bounded buffering
- 📊 **Real-Time Dashboard** — Live monitoring of write throughput, latency, storage metrics
- 🗄️ **Time-Series Optimized** — MongoDB 7+ with automatic bucketing and compression
- 🔌 **Dual Protocol** — HTTP REST API + WebSocket for low-latency streaming
- 🎨 **No-Code Rule Engine** — Visual interface for designing data transformation flows
- ✅ **Production Ready** — Graceful shutdown, error recovery, performance tuning knobs

## Project Structure

```
Nexusflow-Project/
├── nexusflow/                    # Main project folder
│   ├── server/                   # Node.js backend (ES modules)
│   │   ├── src/
│   │   │   ├── config/          # Environment & database configuration
│   │   │   ├── models/          # MongoDB time-series collection setup
│   │   │   ├── services/        # Ingestion, metrics, telemetry logic
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── utils/           # Validation & helpers
│   │   │   ├── ws/              # WebSocket server
│   │   │   ├── app.js           # Express app factory
│   │   │   └── server.js        # Server bootstrap & graceful shutdown
│   │   ├── scripts/             # Database ops, seeding, simulation, audit
│   │   ├── package.json
│   │   └── .env.example
│   │
│   ├── client/                   # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/      # UI components (Sparkline, Stat, etc.)
│   │   │   ├── App.jsx
│   │   │   ├── usePolling.js    # Data fetching hook
│   │   │   └── styles.css
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   ├── docker-compose.yml        # MongoDB 7 containerized setup
│   └── README.md                 # Technical project documentation
│
├── README.md                      # This file (overview)
├── CONTRIBUTING.md                # Contribution guidelines
├── ARCHITECTURE.md                # System design & data flows
├── .env.example                   # Environment template
└── .gitignore
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB 6.0+ (7+ recommended)

### 1. Start MongoDB

```bash
cd nexusflow
docker compose up -d
```

### 2. Setup Backend

```bash
cd server
cp .env.example .env
npm install
npm run setup:db      # Create time-series collection & indexes
npm run seed          # (Optional) Seed sample telemetry data
npm run dev           # Start server: http://localhost:4000
```

### 3. Start Frontend

```bash
cd ../client
npm install
npm run dev           # Start client: http://localhost:5173
```

### 4. Test the APIs

```bash
# Health check
curl http://localhost:4000/health

# Ingest a telemetry reading
curl -X POST http://localhost:4000/api/telemetry \
  -H 'Content-Type: application/json' \
  -d '{
    "deviceId": "sensor-01",
    "sensorType": "temperature",
    "value": 72.5,
    "unit": "C",
    "quality": "good"
  }'

# View metrics
curl http://localhost:4000/api/metrics/ingestion
curl http://localhost:4000/api/metrics/storage
```
## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telemetry` | Ingest single or batch telemetry records |
| `GET` | `/api/telemetry/latest` | Fetch latest readings |
| `GET` | `/api/metrics/ingestion` | Ingestion throughput & latency stats |
| `GET` | `/api/metrics/storage` | Collection size & storage metrics |
| `GET` | `/health` | Server health & DB connectivity |

## Performance Testing

```bash
cd nexusflow/server

# Simulate realistic sensor load
npm run simulate -- --rate=5000 --duration=60 --devices=500

# Run 5,000 writes/sec audit
npm run audit -- --rate=5000 --duration=60

# Generates reports/ with results, latency percentiles, storage metrics
```

## Development Workflow

```bash
# Feature branch
git checkout -b feature/your-feature

# Make changes, test locally
cd nexusflow/server && npm run dev
cd ../client && npm run dev

# Commit and push
git add .
git commit -m "feat: description of your change"
git push origin feature/your-feature
```

For detailed guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Technology Stack

- **Backend**: Node.js 20+, Express.js, Mongoose, WebSocket
- **Database**: MongoDB 7+ (time-series collections)
- **Frontend**: React 18, Vite, CSS3
- **DevOps**: Docker, Docker Compose

## Environment Variables

Create `nexusflow/server/.env` (copy from `.env.example`):

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
MONGO_POOL_SIZE=50
```

## Troubleshooting

### MongoDB connection fails

```bash
# Check MongoDB is running
docker compose ps

# Verify connection
nc -zv localhost 27017

# Check .env MONGODB_URI
```

### High memory usage

Reduce in `nexusflow/server/.env`:

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
| Batch Latency (p95) | < 100 ms |
| Storage Efficiency | ~200 bytes/measurement |
| Memory Usage | < 500 MB |

## Project Roadmap

- [ ] Rule engine UI (visual flow designer)
- [ ] Alerting & threshold monitoring
- [ ] Multi-tenancy support
- [ ] Streaming analytics (time windows)
- [ ] Advanced caching (Redis)
- [ ] Event-driven automation

## License

MIT

## Support

For questions, issues, or feature requests:

- Open a [GitHub Issue](https://github.com/siddhiapatil/Nexusflow-Project/issues)
- Check [Discussions](https://github.com/siddhiapatil/Nexusflow-Project/discussions)
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

---

**Status**: Production-ready  
**Version**: 1.0.0  
**Last Updated**: 2026-09-29
