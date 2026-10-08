# MongoDB Time-Series Setup & Schema Architecture Guide

## 1. Overview & Problem Context
In traditional Relational or standard Document-based architectures, ingesting high-frequency IoT telemetry (thousands of events per second) produces severe storage bloat and index overhead:
- Every data point creates a standalone document with repeated metadata fields (`sensorId`, `deviceType`, `location`).
- The BSON document overhead and default B-Tree primary index (`_id`) consume more disk storage than the actual sensor readings.
- High-frequency write spikes fragment database indexes and induce heavy write stalls.

To solve this, **NexusFlow** leverages **MongoDB 5.0+ Native Time-Series Collections**, purpose-built for append-only, high-throughput time-series sensor workloads.

---

## 2. Collection Creation & Parameter Specifications

The telemetry collection is provisioned with the following parameters:

```javascript
await db.createCollection("sensor_telemetry", {
  timeseries: {
    timeField: "timestamp",       // Required: BSON Date field recording measurement time
    metaField: "metadata",         // Required: Object grouping sensor identity attributes
    granularity: "seconds"         // Options: "seconds" | "minutes" | "hours"
  },
  expireAfterSeconds: 2592000      // Optional TTL: 30 days retention policy
});
```

### Parameter Rationale:
1. **`timeField: "timestamp"`**:
   - Must be a BSON Date type (or ISO-8601 string normalized upon ingest).
   - Used by MongoDB's internal columnar engine to organize and order incoming samples.
2. **`metaField: "metadata"`**:
   - Isolates sensor identity and static dimensional metadata (`sensorId`, `deviceType`, `location`).
   - Grouping documents by `metadata` allows MongoDB to route incoming events into the same physical bucket.
3. **`granularity: "seconds"`**:
   - Dictates how MongoDB groups incoming events into internal buckets.
   - For high-frequency industrial IoT streaming (1 Hz to 100 Hz), `"seconds"` groups data spanning roughly 1 minute into single buckets, minimizing disk I/O while preventing bucket fragmentation.
4. **`expireAfterSeconds: 2592000` (TTL)**:
   - Provides native automated lifecycle pruning (30 days retention) without requiring external cron jobs or delete operations.

---

## 3. Internal Storage & Compression Mechanics

MongoDB does not store each incoming telemetry point as a single row. Instead, incoming events are automatically routed to internal compressed bucket documents residing in `system.buckets.sensor_telemetry`.

```
Incoming Telemetry Stream
  ├── TURBINE-001 (t1, 74°C)  ──┐
  ├── TURBINE-001 (t2, 75°C)  ──┼──> MongoDB Time-Series Router
  └── TURBINE-001 (t3, 76°C)  ──┘          │
                                           ▼
                                 [ Internal Bucket Document ]
                                 - control: { min: t1, max: t3 }
                                 - meta: { sensorId: "TURBINE-001" }
                                 - data:
                                     - timestamp: [t1, +100ms, +100ms] (Delta-of-Delta)
                                     - temp: [74.0, 75.0, 76.0] (Zstandard / XOR)
```

### Compression Benefits:
- **Delta-of-Delta Timestamp Encoding**: Successive timestamps are stored as microsecond deltas from the previous point, requiring as few as 1-2 bits per timestamp.
- **Run-Length & XOR Compression**: Repeating metadata and gradual floating-point drifts (temperature, pressure) compress with over **75% to 80% storage savings** compared to raw JSON/BSON.
- **I/O Efficiency**: Queries reading time windows fetch single pre-compressed buckets rather than scanning thousands of disconnected documents.

---

## 4. Finalized Telemetry Schema

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["timestamp", "metadata", "metrics"],
    "properties": {
      "timestamp": {
        "bsonType": "date",
        "description": "Measurement timestamp (ISODate)"
      },
      "metadata": {
        "bsonType": "object",
        "required": ["sensorId", "deviceType"],
        "properties": {
          "sensorId": { "bsonType": "string" },
          "deviceType": { "bsonType": "string" },
          "location": { "bsonType": "string" },
          "firmwareVersion": { "bsonType": "string" }
        }
      },
      "metrics": {
        "bsonType": "object",
        "description": "Continuous numerical sensor readings",
        "properties": {
          "temperature": { "bsonType": ["double", "int", "long"] },
          "vibration": { "bsonType": ["double", "int", "long"] },
          "pressure": { "bsonType": ["double", "int", "long"] },
          "rpm": { "bsonType": ["double", "int", "long"] },
          "voltage": { "bsonType": ["double", "int", "long"] },
          "current": { "bsonType": ["double", "int", "long"] }
        }
      },
      "status": {
        "bsonType": "string",
        "enum": ["OPERATIONAL", "WARNING", "CRITICAL", "MAINTENANCE"]
      }
    }
  }
}
```

---

## 5. Indexing Strategy

In addition to the automatic internal bucket index, secondary compound indexes are created on the collection:

```javascript
// Index 1: Single sensor historical analysis & live charting
await collection.createIndex(
  { "metadata.sensorId": 1, "timestamp": -1 },
  { name: "idx_sensor_time" }
);

// Index 2: Fleet-wide aggregation & device category telemetry
await collection.createIndex(
  { "metadata.deviceType": 1, "timestamp": -1 },
  { name: "idx_devicetype_time" }
);
```

### Query Execution Advantages:
- `find({ "metadata.sensorId": "TURBINE-001" }).sort({ timestamp: -1 }).limit(50)` executes using an index scan directly on bucket metadata without document decoding overhead.
