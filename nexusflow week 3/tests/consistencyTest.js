import { MockTelemetryGenerator, SENSOR_CATALOG } from '../src/generators/mockTelemetryGenerator.js';
import { validateTelemetryPayload } from '../src/config/timeseriesSetup.js';
import { TelemetryPoint } from '../src/models/telemetrySchema.js';

/**
 * Test Suite 1: Continuous Ingestion Consistency & Schema Verification
 * 
 * Verifies:
 * 1. Timestamps (ISO compliance, chronological monotonicity, no clock skew)
 * 2. Sensor IDs (valid strings matching catalog, non-empty)
 * 3. Metric Values (strictly typed numbers, non-NaN, within physical bounds)
 * 4. Schema Compliance (passes MongoDB Time-Series validation rules)
 * 5. Data Consistency under repeated consecutive streaming events
 */

async function runConsistencyTest(totalEvents = 1000) {
  console.log('===============================================================');
  console.log(' TEST 1: CONTINUOUS TELEMETRY INGESTION CONSISTENCY TEST       ');
  console.log(` Target Sample: ${totalEvents} consecutive sensor events       `);
  console.log('===============================================================\n');

  const generator = new MockTelemetryGenerator({ injectAnomalies: true, anomalyProbability: 0.1 });
  const sensorIds = new Set(SENSOR_CATALOG.map(s => s.sensorId));

  let passCount = 0;
  let failCount = 0;
  const errorLog = [];
  let prevTimestamp = null;
  const sensorEventCounts = {};

  const startTime = performance.now();

  for (let i = 1; i <= totalEvents; i++) {
    // Generate event
    const rawEvent = generator.generatePoint();
    const normalized = TelemetryPoint.normalize(rawEvent);
    const itemErrors = [];

    // 1. Verify Timestamp Integrity
    if (!normalized.timestamp || !(normalized.timestamp instanceof Date)) {
      itemErrors.push(`Event #${i}: Timestamp is not a valid Date instance.`);
    } else if (isNaN(normalized.timestamp.getTime())) {
      itemErrors.push(`Event #${i}: Timestamp is NaN.`);
    } else {
      if (prevTimestamp && normalized.timestamp.getTime() < prevTimestamp.getTime()) {
        itemErrors.push(`Event #${i}: Timestamp monotonicity violation (backward time drift).`);
      }
      prevTimestamp = normalized.timestamp;
    }

    // 2. Verify Sensor ID & Metadata
    const sid = normalized.metadata?.sensorId;
    if (!sid || typeof sid !== 'string') {
      itemErrors.push(`Event #${i}: Sensor ID missing or non-string.`);
    } else if (!sensorIds.has(sid)) {
      itemErrors.push(`Event #${i}: Unknown Sensor ID '${sid}' not in catalog.`);
    } else {
      sensorEventCounts[sid] = (sensorEventCounts[sid] || 0) + 1;
    }

    // 3. Verify Metric Value Types & Ranges
    const metrics = normalized.metrics;
    if (!metrics || typeof metrics !== 'object' || Object.keys(metrics).length === 0) {
      itemErrors.push(`Event #${i}: Empty or missing metrics object.`);
    } else {
      for (const [key, val] of Object.entries(metrics)) {
        if (typeof val !== 'number' || isNaN(val)) {
          itemErrors.push(`Event #${i}: Metric '${key}' is invalid (${val}).`);
        }
        // Physical plausibility sanity check
        if (key === 'temperature' && (val < -50 || val > 300)) {
          itemErrors.push(`Event #${i}: Temperature ${val}°C exceeds physical equipment bounds.`);
        }
        if (key === 'vibration' && (val < 0 || val > 100)) {
          itemErrors.push(`Event #${i}: Vibration ${val} mm/s out of range.`);
        }
      }
    }

    // 4. Schema Validator check (matches MongoDB collection JSON schema)
    const schemaValidation = validateTelemetryPayload(normalized);
    if (!schemaValidation.valid) {
      itemErrors.push(`Event #${i}: Schema validation failed -> ${schemaValidation.errors.join(', ')}`);
    }

    if (itemErrors.length === 0) {
      passCount++;
    } else {
      failCount++;
      errorLog.push(...itemErrors);
    }
  }

  const durationMs = (performance.now() - startTime).toFixed(2);

  console.log('--- TEST 1 RESULTS SUMMARY ---');
  console.log(`Total Events Evaluated   : ${totalEvents}`);
  console.log(`Passed Consistency Check : ${passCount} (${((passCount / totalEvents) * 100).toFixed(2)}%)`);
  console.log(`Failed / Anomalous Schema: ${failCount}`);
  console.log(`Evaluation Duration      : ${durationMs} ms`);
  console.log('\nSensor Distribution:');
  for (const [sId, count] of Object.entries(sensorEventCounts)) {
    console.log(`  - ${sId.padEnd(16)}: ${count} events (${((count / totalEvents) * 100).toFixed(1)}%)`);
  }

  if (failCount > 0) {
    console.error('\nIdentified Consistency Errors:');
    errorLog.slice(0, 10).forEach(err => console.error(`  [!] ${err}`));
  } else {
    console.log('\n>> SUCCESS: 100% of telemetry events satisfied MongoDB Time-Series schema & consistency rules.');
  }

  return { passCount, failCount, totalEvents, durationMs };
}

// Run if directly executed
runConsistencyTest(2000).catch(console.error);
