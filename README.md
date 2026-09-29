# NexusFlow — IoT Telemetry & Rule Engine Backend

NexusFlow is a MongoDB-powered backend built for IoT telemetry ingestion, storage, aggregation, and monitoring. The project is designed to support real-time sensor data from industrial systems such as turbines, machines, and connected devices, with a focus on performance, time-series analytics, and rule-engine readiness.

## Project Features

- Real-time telemetry ingestion for sensor readings from connected devices
- MongoDB time-series collection optimized for high-frequency data streams
- Device-aware metadata model for context such as location, device type, and sensor information
- Efficient querying for recent telemetry, sensor filters, and rolling time-window aggregations
- Health monitoring and database connectivity validation through API checks
- Sample dataset generation for realistic turbine operations and anomaly detection scenarios
- Automated database setup for collection creation, indexing, and retention policies
- REST API endpoints for fetching telemetry and computed average values

## Work Completed

- Designed and implemented the core telemetry data model for sensor recordings and metadata
- Configured MongoDB time-series storage for efficient compression and analytics
- Added database initialization logic to create the collection and required indexes
- Implemented TTL and retention configuration for time-series data lifecycle management
- Seeded realistic turbine sensor data, including anomaly examples for testing and validation
- Built query scripts to validate aggregation, filtering, and time-window behavior
- Developed Express API endpoints for telemetry retrieval and health monitoring
- Integrated database connectivity checks to ensure the backend is ready for production use
- Documented setup, configuration, and usage steps for local development and testing

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

- timeField: `timestamp` — Precision timestamp for all readings
- metaField: `metadata` — Device metadata for contextual filtering and grouping
- granularity: `seconds` — Optimized for high-frequency time-series streams
- Retention: 30-day TTL via `expireAfterSeconds` for storage lifecycle management

## Tech Stack

- Node.js
- Express.js
- MongoDB 5+
- Mongoose ODM
- dotenv for environment configuration

## Setup

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI if not using the local default
```

Requires MongoDB 5.0+ (time-series collections) running locally or on an Atlas cluster.

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

## API Overview

- `GET /health` — verifies the MongoDB connection and collection accessibility
- `POST /api/telemetry` — ingests a new telemetry record
- `GET /api/telemetry/:id` — fetches recent readings for a device
- `GET /api/telemetry/:id/average` — returns moving-average aggregated values for a sensor window

## Project Goal

NexusFlow aims to provide a scalable and reliable data layer for IoT telemetry use cases, supporting real-time monitoring, operational insight generation, and future rule-based automation across distributed industrial systems.
