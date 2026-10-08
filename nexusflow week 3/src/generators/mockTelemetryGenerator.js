import EventEmitter from 'events';

/**
 * Industrial IoT Sensor Definitions
 */
export const SENSOR_CATALOG = [
  {
    sensorId: 'TURBINE-001',
    deviceType: 'gas_turbine',
    location: 'Sector-7G',
    metrics: {
      temperature: { base: 74, variance: 4, anomalyThreshold: 80, anomalyValue: 88 },
      rpm: { base: 3600, variance: 25 },
      pressure: { base: 101.3, variance: 2.5 }
    }
  },
  {
    sensorId: 'MOTOR-042',
    deviceType: 'induction_motor',
    location: 'Sector-3B',
    metrics: {
      vibration: { base: 2.1, variance: 0.6, anomalyThreshold: 4.5, anomalyValue: 5.6 },
      current: { base: 45.0, variance: 2.8 },
      temperature: { base: 58.0, variance: 3.5 }
    }
  },
  {
    sensorId: 'PUMP-108',
    deviceType: 'coolant_pump',
    location: 'Cooling-Tower-1',
    metrics: {
      flowRate: { base: 120.0, variance: 8.0 },
      pressure: { base: 4.2, variance: 0.3 },
      temperature: { base: 38.0, variance: 1.5 }
    }
  },
  {
    sensorId: 'GENERATOR-003',
    deviceType: 'power_generator',
    location: 'Powerhouse-Main',
    metrics: {
      voltage: { base: 230.0, variance: 3.0 },
      frequency: { base: 50.0, variance: 0.15 },
      activePower: { base: 450.0, variance: 15.0 }
    }
  }
];

export class MockTelemetryGenerator extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} [options.ratePerSec=10] Telemetry points per second
   * @param {boolean} [options.injectAnomalies=true] Whether to periodically inject spikes
   * @param {number} [options.anomalyProbability=0.08] Chance of anomaly per target sensor
   */
  constructor({
    ratePerSec = 10,
    injectAnomalies = true,
    anomalyProbability = 0.08
  } = {}) {
    super();
    this.ratePerSec = ratePerSec;
    this.injectAnomalies = injectAnomalies;
    this.anomalyProbability = anomalyProbability;

    this.isRunning = false;
    this.intervalHandle = null;
    this.tickCount = 0;
    this.generatedCount = 0;
  }

  /**
   * Generate a single simulated telemetry reading
   * @param {string} [specificSensorId] 
   * @param {boolean} [forceAnomaly=false]
   */
  generatePoint(specificSensorId = null, forceAnomaly = false) {
    const sensorDef = specificSensorId 
      ? SENSOR_CATALOG.find(s => s.sensorId === specificSensorId) || SENSOR_CATALOG[0]
      : SENSOR_CATALOG[this.generatedCount % SENSOR_CATALOG.length];

    const timestamp = new Date();
    const metrics = {};
    const shouldInjectAnomaly = forceAnomaly || (this.injectAnomalies && Math.random() < this.anomalyProbability);

    for (const [metricKey, config] of Object.entries(sensorDef.metrics)) {
      if (shouldInjectAnomaly && config.anomalyValue !== undefined) {
        // Inject spike to test rule engine
        metrics[metricKey] = Number((config.anomalyValue + (Math.random() * 4 - 2)).toFixed(2));
      } else {
        // Natural sine drift + random Gaussian-like jitter
        const drift = Math.sin(this.tickCount * 0.05) * (config.variance * 0.5);
        const noise = (Math.random() - 0.5) * config.variance;
        const val = config.base + drift + noise;
        metrics[metricKey] = Number(val.toFixed(2));
      }
    }

    const doc = {
      timestamp,
      metadata: {
        sensorId: sensorDef.sensorId,
        deviceType: sensorDef.deviceType,
        location: sensorDef.location
      },
      metrics,
      status: shouldInjectAnomaly ? 'WARNING' : 'OPERATIONAL'
    };

    this.generatedCount++;
    return doc;
  }

  /**
   * Generate a batch of telemetry documents
   * @param {number} count 
   */
  generateBatch(count) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      batch.push(this.generatePoint());
    }
    return batch;
  }

  /**
   * Start continuous mock streaming via events or optional WebSocket connection
   * @param {Object} [options]
   * @param {string} [options.wsUrl] If specified, connects as client and pushes via WebSocket
   */
  async start({ wsUrl = null } = {}) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tickCount = 0;
    this.generatedCount = 0;

    let wsClient = null;
    if (wsUrl) {
      try {
        const wsModule = await import('ws');
        const WebSocketClass = wsModule.default || wsModule.WebSocket;
        wsClient = new WebSocketClass(wsUrl);
        wsClient.on('open', () => {
          console.log(`[Mock Generator] Connected to WebSocket ingestion target: ${wsUrl}`);
        });
        wsClient.on('error', (err) => {
          console.error(`[Mock Generator] WebSocket target error: ${err.message}`);
        });
      } catch (e) {
        console.warn(`[Mock Generator] 'ws' package not loaded. Falling back to in-process events.`);
      }
    }

    // Determine interval spacing:
    // If rate is high (e.g. 1000/s), emit batches every 20ms
    const intervalMs = this.ratePerSec > 50 ? 20 : Math.max(10, Math.floor(1000 / this.ratePerSec));
    const itemsPerInterval = Math.max(1, Math.round((this.ratePerSec * intervalMs) / 1000));

    this.intervalHandle = setInterval(() => {
      this.tickCount++;
      for (let i = 0; i < itemsPerInterval; i++) {
        const point = this.generatePoint();
        this.emit('data', point);

        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(JSON.stringify(point));
        }
      }
    }, intervalMs);

    console.log(`[Mock Generator] Started streaming at target rate: ${this.ratePerSec} msg/sec (${itemsPerInterval} items / ${intervalMs}ms)`);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log(`[Mock Generator] Stopped streaming. Total points generated: ${this.generatedCount}`);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('mockTelemetryGenerator.js')) {
  const targetRate = parseInt(process.env.RATE || '50', 10);
  const generator = new MockTelemetryGenerator({ ratePerSec: targetRate });
  console.log(`Running standalone mock generator at ${targetRate} msgs/sec. Press Ctrl+C to terminate.`);

  generator.on('data', (d) => {
    if (generator.generatedCount % 25 === 0) {
      console.log(`[Stream Sample] ${d.metadata.sensorId} | Temp: ${d.metrics.temperature || 'N/A'} | Status: ${d.status}`);
    }
  });

  generator.start();
}
