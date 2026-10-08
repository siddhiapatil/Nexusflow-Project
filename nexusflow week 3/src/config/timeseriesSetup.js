/**
 * NexusFlow MongoDB Time-Series Collection Provisioning & Schema Validator
 * 
 * Verifies and configures MongoDB 5.0+ native Time-Series collection with:
 * - timeField: "timestamp"
 * - metaField: "metadata"
 * - granularity: "seconds" (optimized for IoT streaming at 1Hz - 100Hz)
 * - TTL: 30 days retention
 * - Secondary compound indexes for ultra-fast query execution
 */

export const TELEMETRY_COLLECTION_NAME = 'sensor_telemetry';

export const TELEMETRY_SCHEMA_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["timestamp", "metadata", "metrics"],
    properties: {
      timestamp: {
        bsonType: "date",
        description: "Must be an ISODate timestamp recording exact event time"
      },
      metadata: {
        bsonType: "object",
        required: ["sensorId", "deviceType"],
        properties: {
          sensorId: {
            bsonType: "string",
            description: "Unique hardware identifier (e.g. TURBINE-001)"
          },
          deviceType: {
            bsonType: "string",
            description: "Physical asset classification (e.g. turbine, motor, pump, generator)"
          },
          location: {
            bsonType: "string",
            description: "Industrial plant zone or sector"
          },
          firmwareVersion: {
            bsonType: "string",
            description: "Device firmware revision"
          }
        }
      },
      metrics: {
        bsonType: "object",
        description: "Numerical sensor readings",
        properties: {
          temperature: { bsonType: ["double", "int", "long"] },
          vibration: { bsonType: ["double", "int", "long"] },
          pressure: { bsonType: ["double", "int", "long"] },
          rpm: { bsonType: ["double", "int", "long"] },
          voltage: { bsonType: ["double", "int", "long"] },
          current: { bsonType: ["double", "int", "long"] }
        }
      },
      status: {
        bsonType: "string",
        enum: ["OPERATIONAL", "WARNING", "CRITICAL", "MAINTENANCE"],
        description: "Health status code of the sensor hardware"
      }
    }
  }
};

/**
 * Initializes and validates the MongoDB Time-Series collection
 * @param {import('mongodb').Db} db 
 */
export async function initializeTelemetryCollection(db, collectionName = TELEMETRY_COLLECTION_NAME) {
  const collections = await db.listCollections({ name: collectionName }).toArray();

  if (collections.length === 0) {
    console.log(`[Setup] Creating Time-Series collection: '${collectionName}'...`);
    await db.createCollection(collectionName, {
      timeseries: {
        timeField: "timestamp",
        metaField: "metadata",
        granularity: "seconds"
      },
      expireAfterSeconds: 60 * 60 * 24 * 30 // 30 days automated TTL
    });
    console.log(`[Setup] Time-Series collection '${collectionName}' created successfully.`);
  } else {
    // Validate existing collection configuration
    const collInfo = collections[0];
    if (collInfo.options?.timeseries) {
      console.log(`[Setup] Verified existing Time-Series collection '${collectionName}':`, {
        timeField: collInfo.options.timeseries.timeField,
        metaField: collInfo.options.timeseries.metaField,
        granularity: collInfo.options.timeseries.granularity
      });
    } else {
      console.warn(`[Setup] WARNING: Collection '${collectionName}' exists but is NOT a native Time-Series collection!`);
    }
  }

  // Create compound secondary indexes for high-speed retrieval
  const collection = db.collection(collectionName);
  console.log(`[Setup] Ensuring secondary indexes on '${collectionName}'...`);
  
  await collection.createIndex(
    { "metadata.sensorId": 1, "timestamp": -1 },
    { name: "idx_sensor_time" }
  );

  await collection.createIndex(
    { "metadata.deviceType": 1, "timestamp": -1 },
    { name: "idx_devicetype_time" }
  );

  console.log(`[Setup] Collection '${collectionName}' is ready for high-throughput live streaming.`);
  return collection;
}

/**
 * Validates a single telemetry payload against the schema definition
 * @param {object} doc 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTelemetryPayload(doc) {
  const errors = [];
  if (!doc) {
    return { valid: false, errors: ['Document is null or undefined'] };
  }

  // 1. Validate Timestamp
  if (!doc.timestamp) {
    errors.push("Missing 'timestamp' field");
  } else {
    const dateObj = new Date(doc.timestamp);
    if (isNaN(dateObj.getTime())) {
      errors.push(`Invalid timestamp format: ${doc.timestamp}`);
    }
  }

  // 2. Validate Metadata
  if (!doc.metadata || typeof doc.metadata !== 'object') {
    errors.push("Missing or invalid 'metadata' object");
  } else {
    if (!doc.metadata.sensorId || typeof doc.metadata.sensorId !== 'string') {
      errors.push("Missing or non-string 'metadata.sensorId'");
    }
    if (!doc.metadata.deviceType || typeof doc.metadata.deviceType !== 'string') {
      errors.push("Missing or non-string 'metadata.deviceType'");
    }
  }

  // 3. Validate Metrics
  if (!doc.metrics || typeof doc.metrics !== 'object' || Object.keys(doc.metrics).length === 0) {
    errors.push("Missing or empty 'metrics' object");
  } else {
    for (const [key, value] of Object.entries(doc.metrics)) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Metric '${key}' must be a valid number, received: ${value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
