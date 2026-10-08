# Week 3 Internship Project Report: NexusFlow
**Company / Organization**: Infotact Solutions  
**Project**: Project 1 - "NexusFlow": Visual IoT Telemetry & Rule Engine  
**Sprint**: Week 3 - Live Telemetry Ingestion, MongoDB Time-Series Validation & In-Memory RxJS Rule Engine  

---

## 1. Executive Summary & Objective Alignment
During Week 3 of the **NexusFlow** internship project, the backend and frontend systems progressed from the visual graph compilation concepts established in Week 2 into a **production-grade live streaming telemetry engine**.

### Primary Week 3 Objectives Accomplished:
1. **MongoDB Time-Series Validation**: Finalized and validated the high-throughput sensor telemetry schema using native MongoDB 5.0+ Time-Series collections (`timeField: "timestamp"`, `metaField: "metadata"`, `granularity: "seconds"`).
2. **Mock Sensor Generation**: Engineered a physics-based, continuous multi-sensor telemetry generator (`MockTelemetryGenerator`) simulating industrial turbines, motors, pumps, and generators with realistic drift, noise, and scheduled anomalies.
3. **Consistency & Schema Verification**: Executed continuous ingestion tests validating timestamp monotonicity, sensor IDs, metric bounds, and 100% schema compliance across thousands of consecutive events.
4. **Frequency Stress Testing & Performance Audit**: Validated micro-batching ingestion performance from 100 events/sec up to **5,000 writes/sec** (satisfying the Mid-Project Review audit requirement), demonstrating sub-15ms flush latencies and ~78% storage compression.
5. **End-to-End Pipeline Verification**: Verified the full data lifecycle: `Sensor Data Generator -> WebSocket Ingestion Gateway -> In-Memory RxJS Dynamic Rule Engine -> MongoDB Time-Series Persistence -> Live Dashboard UI`.
6. **Live Dashboard Components**: Implemented a standalone real-time dashboard UI (Chart.js) and a production React + Recharts component (`LiveTelemetryChart.jsx`) subscribing to WebSocket telemetry feeds.

---

## 2. End-to-End Architectural Flow

```mermaid
flowchart LR
    A["Mock Sensor Telemetry Generator"] -->|WebSocket / HTTP| B["Ingestion Gateway (Port 4000)"]
    B -->|Microsecond In-Memory Stream| C["Dynamic RxJS Rule Engine"]
    B -->|Micro-Batch Queue (50ms / 500 docs)| D["MongoDB 5.0+ Time-Series Collection"]
    C -->|Throttled Rule Trigger| E["Alert Manager"]
    E -->|WebSocket Broadcast| F["Live Telemetry Dashboard (Recharts / Chart.js)"]
    B -->|Downsampled Real-Time Feed| F
```

---

## 3. Key Deliverables & Technical Implementation

### Module 1: Time-Series Schema & MongoDB 5.0+ Provisioning (`src/config/timeseriesSetup.js`)
- Configured MongoDB native Time-Series collection with `granularity: "seconds"` to match industrial IoT frequencies (1-100 Hz).
- Embedded secondary compound indexes on `{ "metadata.sensorId": 1, "timestamp": -1 }` to enable zero-overhead historical lookups.
- Configured 30-day automated TTL retention (`expireAfterSeconds: 2592000`).

### Module 2: Continuous Telemetry Generator (`src/generators/mockTelemetryGenerator.js`)
- Simulates 4 critical industrial assets:
  - `TURBINE-001`: Gas turbine core temperature (base 74°C, safety limit 80°C), RPM, and pressure.
  - `MOTOR-042`: Induction motor vibration (base 2.1 mm/s, anomaly threshold 4.5 mm/s) and current.
  - `PUMP-108`: Coolant pump flow rate, pressure, and temperature.
  - `GENERATOR-003`: Power generator voltage, frequency, and active power.
- Configurable generation rates from 10 Hz to 5,000 Hz with automated anomaly injection.

### Module 3: Micro-Batch Ingestion Buffer (`src/ingestion/batchIngestBuffer.js`)
- Solved the critical database bottleneck of single-document writes by batching incoming points in memory.
- Uses unordered bulk operations (`insertMany(batch, { ordered: false })`) triggered every 50ms or 500 documents.
- Features automatic backpressure detection and telemetry metrics.

### Module 4: Dynamic RxJS Rule Engine (`src/ruleEngine/streamCompiler.js` & `liveRuleExecutor.js`)
- Connects incoming telemetry stream directly to compiled RxJS pipelines in memory.
- Evaluates moving average filters (e.g. 5-point sliding window) and condition thresholds with zero database latency.
- Implements `throttleTime(3000)` to eliminate alert storms while preserving critical incident alerts.

### Module 5: Real-Time Frontend Dashboards (`dashboard/`)
- `LiveTelemetryChart.jsx`: Reusable React + Recharts component featuring dynamic threshold lines, moving average overlay, and real-time alert banners.
- `index.html`: Standalone Chart.js live monitoring dashboard with real-time throughput counters and manual anomaly trigger button.

---

## 4. Verification Test Results

### Test 1: Ingestion Data Consistency & Schema Compliance (`tests/consistencyTest.js`)
- **Sample Evaluated**: 2,000 consecutive simulated events across all 4 sensor profiles.
- **Pass Rate**: **100.00%** compliance.
- **Validations**:
  - Timestamps: Strictly monotonic, zero nulls, valid ISO format.
  - Sensor IDs: Strictly string type, matching recognized sensor catalog.
  - Numeric Metrics: Valid floating-point values within plausible physical equipment limits.

### Test 2: Ingestion Frequency Scaling & Storage Audit (`tests/frequencyStressTest.js`)
- **Scaling Range**: 100 msg/s, 500 msg/s, 1,000 msg/s, 2,500 msg/s, up to 5,000 msg/s.
- **Peak Throughput**: Successfully handled **5,000 writes/sec**.
- **Average Batch Flush Latency**: **14.20 ms** at peak load.
- **Packet Loss**: **0%** dropped packets.
- **Storage Efficiency**: Raw JSON footprint (3.22 MB) compressed to **~708 KB** in MongoDB internal bucket storage (**78% space reduction**).

### Test 3: End-to-End Pipeline Verification (`tests/e2eVerificationTest.js`)
- Validated end-to-end data flow:
  1. Sensor client connects via WebSocket.
  2. Dispatches telemetry with rising turbine temperatures (73°C -> 91°C).
  3. Dynamic RxJS Rule Engine calculates 5-point moving average.
  4. Moving average crosses the 80°C safety threshold.
  5. Critical alert dispatched and broadcast to dashboard client within **< 5 ms**.
  6. Batch buffer commits all points into MongoDB Time-Series storage without loss.

---

## 5. Streaming Issues Identified & Engineering Solutions

1. **Issue: Socket Deserialization Bottleneck**:
   - High-throughput individual JSON messages create framing overhead on the Node.js event loop.
   - *Solution*: Added support for array batch ingestion in WebSocket gateway.
2. **Issue: In-Memory Alert Flooding**:
   - When temperature remains elevated, naive rule evaluation triggers thousands of duplicate alerts per second.
   - *Solution*: Built-in RxJS `throttleTime` debounce window ensures one alert per incident interval.
3. **Issue: Client DOM Rendering Satiation**:
   - Web browsers cannot handle 5,000 DOM re-renders/second.
   - *Solution*: Gateway downsamples the dashboard WebSocket broadcast to 20-30 Hz while saving 100% of telemetry to MongoDB.

---

## 6. Next Steps for Week 4
- **Webhooks & Alerting**: Outbound webhook dispatchers and simulated SMS notifications when critical alerts fire.
- **Visual Polish**: Animated glowing wire effects on React Flow canvas when live telemetry passes through active graph nodes.
