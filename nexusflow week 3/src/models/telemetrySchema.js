/**
 * Telemetry Model & Data Normalization
 * 
 * Defines the canonical telemetry representation and normalization pipeline
 * for high-speed ingestion into MongoDB Time-Series collections.
 */

export class TelemetryPoint {
  /**
   * @param {Object} params
   * @param {string} params.sensorId
   * @param {string} params.deviceType
   * @param {string} [params.location]
   * @param {Date|string|number} [params.timestamp]
   * @param {Record<string, number>} params.metrics
   * @param {string} [params.status]
   */
  constructor({
    sensorId,
    deviceType = 'general_sensor',
    location = 'Sector-1',
    timestamp = new Date(),
    metrics = {},
    status = 'OPERATIONAL'
  }) {
    this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
    this.metadata = {
      sensorId: String(sensorId),
      deviceType: String(deviceType),
      location: String(location)
    };
    this.metrics = {};
    for (const [key, val] of Object.entries(metrics)) {
      this.metrics[key] = Number(val);
    }
    this.status = status;
  }

  /**
   * Normalize an incoming raw telemetry object (from WebSocket or REST)
   * Converts string timestamps to Date and formats metadata
   */
  static normalize(raw) {
    if (!raw) return null;

    let timestamp = raw.timestamp ? new Date(raw.timestamp) : new Date();
    if (isNaN(timestamp.getTime())) {
      timestamp = new Date();
    }

    // Support flat formats (e.g. { sensorId, temperature, ... }) or nested metadata
    const sensorId = raw.metadata?.sensorId || raw.sensorId || 'UNKNOWN_SENSOR';
    const deviceType = raw.metadata?.deviceType || raw.deviceType || 'iot_device';
    const location = raw.metadata?.location || raw.location || 'Zone_A';
    const status = raw.status || 'OPERATIONAL';

    let metrics = {};
    if (raw.metrics && typeof raw.metrics === 'object') {
      metrics = { ...raw.metrics };
    } else {
      // Extract numeric top-level fields
      for (const [k, v] of Object.entries(raw)) {
        if (!['timestamp', 'metadata', 'sensorId', 'deviceType', 'location', 'status'].includes(k)) {
          if (typeof v === 'number' && !isNaN(v)) {
            metrics[k] = v;
          }
        }
      }
    }

    return {
      timestamp,
      metadata: {
        sensorId,
        deviceType,
        location
      },
      metrics,
      status
    };
  }

  /**
   * Convert to compact JSON representation for client WebSocket streaming
   */
  toJSON() {
    return {
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      metrics: this.metrics,
      status: this.status
    };
  }
}
