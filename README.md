# NexusFlow

NexusFlow is an IoT telemetry and rule-processing platform designed to collect, store, and analyze time-series device data from industrial and operational environments. The current backend implementation establishes the core data pipeline for ingesting sensor readings, organizing them in MongoDB, and exposing query interfaces for monitoring, aggregation, and telemetry analysis.

## Overview

The project focuses on delivering a robust backend foundation for sensor-driven applications, with emphasis on:

- Time-series telemetry ingestion for connected devices
- Efficient storage and querying in MongoDB
- Device- and sensor-level analytics
- Health monitoring for backend services
- Extensible APIs ready for future rule-engine and alerting workflows

## Project Scope

NexusFlow is structured to support operational telemetry use cases across a distributed environment, including:

- Industrial equipment monitoring
- Remote sensor health tracking
- Performance trend analysis
- Early anomaly detection
- Future event-driven automation and alerting

## Features Implemented

### 1. Time-Series Data Model
The backend defines a MongoDB time-series collection for telemetry records, with each document representing a sensor reading captured at a specific timestamp.

Key attributes include:

- Timestamped readings
- Device metadata such as device ID, type, and location
- Sensor type and measurement value
- Unit and quality status
- Time-series optimization using MongoDB collection design best practices

### 2. MongoDB Time-Series Storage
The database layer is configured to support efficient time-series operations and retention management, including:

- Time-series collection creation
- Metadata-aware indexing
- Granularity aligned to streaming sensor data
- TTL retention configuration for operational data lifecycle management

### 3. Telemetry Ingestion and Seed Data
The project includes setup and seed scripts that support:

- Database collection initialization
- Sample telemetry data injection
- Anomaly example generation for testing data quality and alert scenarios
- Local environment setup for rapid validation

### 4. Query and Aggregation APIs
The backend exposes telemetry endpoints for retrieving device-level data and performing analytical queries such as:

- Latest readings by device
- Sensor-specific history retrieval
- Average value calculations over defined time windows
- Query filtering based on device, sensor, and result limits

### 5. Service Health Monitoring
The API includes a health check endpoint to confirm the application and integration status are operational.

### 6. Backend Integration Ready for Expansion
The current implementation provides a clean foundation for future work, including:

- Rule-engine integration
- Alert thresholds and anomaly notifications
- Dashboards and visualization layers
- Additional data quality and fault detection features

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JavaScript backend services

## Project Structure

```text
Nexusflow-Project/
├── models/
│   └── Telemetry.js
├── routes/
│   └── telemetry.js
├── scripts/
│   ├── setupCollection.js
│   ├── seedData.js
│   └── testQueries.js
├── .env.example
├── package.json
├── server.js
├── README.md
└── .gitignore
```

## Completed Work

The following deliverables have been completed as part of the current backend implementation:

- Designed the telemetry data model and structure for time-series sensor data
- Implemented MongoDB time-series collection configuration
- Created database setup scripts for collection and index initialization
- Added sample telemetry records to support validation and demo workflows
- Implemented query scripts to test read patterns and analytical access
- Integrated telemetry routes with the Express server
- Added health endpoint validation for backend connectivity

## Setup

```bash
npm install
cp .env.example .env
```

Update the MongoDB connection settings in `.env` if you are not using the default local configuration.

Requires MongoDB 5.0+ with time-series support enabled.

## Data model

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

- **timeField**: `timestamp`
- **metaField**: `metadata` (kept small/stable so MongoDB can bucket efficiently)
- **granularity**: `seconds` (matches high-frequency sensor streams)
- **Retention**: 30-day TTL via `expireAfterSeconds`; adjust or remove it for production retention needs.

## Setup

```bash
npm install
cp .env.example .env      # then edit MONGODB_URI if not using the local default
```

Requires MongoDB **5.0+** (time-series collections) running locally or an Atlas cluster.

## Run in order

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
