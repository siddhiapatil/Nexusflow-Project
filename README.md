# NexusFlow — Week 1 Database Backend

MongoDB Time-Series backend for the **NexusFlow** IoT telemetry & rule engine project. This covers the Week 1 backend deliverables from the project plan.

## Week 1 checklist

- **Plan database structure and telemetry fields** — `models/Telemetry.js` (design notes at the top)
- **Design MongoDB Time-Series collection** — `models/Telemetry.js` (`timeseries` schema option)
- **Set up MongoDB database and collection** — `scripts/setupCollection.js`
- **Add sample telemetry data** — `scripts/seedData.js`
- **Test database queries** — `scripts/testQueries.js`
- **Check database + API integration** — `server.js` and `routes/telemetry.js` (`/health` endpoint)

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
