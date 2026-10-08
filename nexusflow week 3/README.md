# NexusFlow: Visual IoT Telemetry & Rule Engine
### Week 3 Deliverables: Live Telemetry Ingestion, MongoDB Time-Series & In-Memory RxJS Dynamic Rule Engine

---

## 🚀 Overview
**NexusFlow** is a modern Industrial IoT streaming platform designed to solve the rigidity of hardcoded machine alerting logic. Week 3 delivers the high-throughput ingestion backend and real-time visualization layer:
- **MongoDB 5.0+ Native Time-Series Collections**: Optimized append-only storage with `granularity: "seconds"` and automated TTL retention.
- **Dynamic RxJS Rule Engine**: Compiles React Flow visual graphs into in-memory reactive streams that evaluate moving averages and threshold anomalies in microseconds.
- **Micro-Batch Ingestion Gateway**: Sustains up to **5,000 writes/sec** with sub-15ms flush latency and zero packet loss.
- **Live Real-Time Dashboards**: Interactive Chart.js interface and React + Recharts component streaming live telemetry and instant alert notifications over WebSockets.

---

## 📂 Project Structure
```
nexusflow/
├── package.json                          # Dependencies & NPM scripts
├── .env.example                          # Configuration template
├── README.md                             # Project setup & execution guide
├── data/
│   └── telemetry_test_dataset.json       # Finalized sample telemetry test dataset
├── docs/
│   ├── MONGODB_TIMESERIES_SETUP.md       # MongoDB 5.0+ time-series architecture & indexing guide
│   ├── INGESTION_BENCHMARK_REPORT.md     # 100 to 5,000 writes/sec benchmark & audit report
│   └── WEEK_3_INTERNSHIP_REPORT.md       # Complete Week 3 Internship Report
├── src/
│   ├── config/
│   │   ├── database.js                   # MongoDB connection with connection pooling
│   │   └── timeseriesSetup.js            # Time-series collection initialization & schema validator
│   ├── models/
│   │   └── telemetrySchema.js            # Normalized telemetry data model
│   ├── ingestion/
│   │   ├── batchIngestBuffer.js          # High-speed micro-batch buffer (insertMany with 50ms flush)
│   │   ├── websocketIngest.js            # Dual WebSocket ingestion & dashboard broadcast gateway
│   │   └── expressIngest.js              # REST ingestion & dynamic rule management endpoints
│   ├── ruleEngine/
│   │   ├── sampleGraphs.js               # React Flow serialized graph configurations
│   │   ├── streamCompiler.js             # Dynamic RxJS graph-to-pipeline compiler
│   │   ├── alertManager.js               # Alert dispatching, deduplication & tracking
│   │   └── liveRuleExecutor.js           # Live in-memory reactive telemetry evaluation
│   ├── generators/
│   │   └── mockTelemetryGenerator.js     # Physics-based multi-sensor continuous telemetry simulator
│   └── server.js                         # Master server orchestrating HTTP, WS, Buffer & Rules
├── dashboard/
│   ├── index.html                        # Real-time Chart.js live monitoring dashboard
│   └── LiveTelemetryChart.jsx            # Recharts React component for frontend integration
└── tests/
    ├── consistencyTest.js                # Test 1: Schema & Data Consistency Verification
    ├── frequencyStressTest.js            # Test 2: Frequency Escalation Benchmark (100 -> 5,000 msg/s)
    └── e2eVerificationTest.js            # Test 3: Sensor -> WebSocket -> RxJS Engine -> MongoDB Test
```

---

## 🛠️ Quickstart & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v5.0+ (Optional: engine includes automatic in-memory fallback for local development if MongoDB is not running)

### 2. Installation
```bash
# Clone or navigate to the project workspace
cd C:\Users\User\.gemini\antigravity\scratch\nexusflow

# Install project dependencies
npm install
```

### 3. Environment Configuration
Copy the configuration template:
```bash
cp .env.example .env
```
Default parameters in `.env`:
- `PORT=4000`
- `MONGODB_URI=mongodb://localhost:27017/nexusflow_iot`
- `INGEST_BATCH_SIZE=500`
- `INGEST_FLUSH_INTERVAL_MS=50`

---

## 🧪 Running Ingestion & Verification Tests

### Test 1: Continuous Ingestion Consistency & Schema Verification
Validates ISO timestamps, monotonicity, sensor IDs, numeric measurement ranges, and schema compliance across thousands of repeated events:
```bash
npm run test:consistency
# or: node tests/consistencyTest.js
```

### Test 2: Ingestion Frequency Escalation & Storage Audit
Benchmarks micro-batching performance from 100 up to 5,000 writes/sec:
```bash
npm run test:benchmark
# or: node tests/frequencyStressTest.js
```

### Test 3: End-to-End Pipeline Verification
Verifies the complete lifecycle: Sensor Generator ➔ WebSocket ➔ RxJS Dynamic Rule Engine ➔ MongoDB Buffer ➔ Dashboard Broadcast:
```bash
npm run test:e2e
# or: node tests/e2eVerificationTest.js
```

---

## 🌐 Running the Live Server & Real-Time Dashboard

### Start the Ingestion & Rule Engine Server:
```bash
npm start
# or: node src/server.js
```

The server launches:
- **HTTP REST Endpoints**: `http://localhost:4000/api/v1`
- **WebSocket Ingestion Gateway**: `ws://localhost:4000/ws/telemetry`
- **WebSocket Live Dashboard Feed**: `ws://localhost:4000/dashboard`
- **Interactive Live Dashboard UI**: `http://localhost:4000/dashboard`

Open `http://localhost:4000/dashboard` in your browser to view the real-time temperature graph, live moving average calculations, active rule alerts, and click **"Trigger Manual Anomaly Spike"** to test live rule execution in real time!

---

## 📡 API Reference

### 1. REST Telemetry Ingestion
- **POST** `/api/v1/telemetry/ingest`
- Payload: Single telemetry object or batch array
```json
{
  "timestamp": "2026-10-08T07:00:00.000Z",
  "metadata": {
    "sensorId": "TURBINE-001",
    "deviceType": "gas_turbine",
    "location": "Sector-7G"
  },
  "metrics": {
    "temperature": 82.5,
    "rpm": 3610,
    "pressure": 102.1
  },
  "status": "OPERATIONAL"
}
```

### 2. Telemetry Statistics & Performance Metrics
- **GET** `/api/v1/telemetry/stats`
- Returns buffer queue depth, average write latency, evaluated points count, and alert statistics.

### 3. Dynamic Rule Management
- **GET** `/api/v1/rules`: List active compiled in-memory rules.
- **POST** `/api/v1/rules`: Compile and activate a new React Flow graph JSON live without restarting the server.
- **GET** `/api/v1/rules/alerts`: Retrieve recent rule alerts.
