import { connectDb, disconnectDb } from '../src/config/db.js';

export const parseArgs = (argv = process.argv.slice(2)) =>
  Object.fromEntries(
    argv.filter((a) => a.startsWith('--')).map((a) => {
      const [k, v = 'true'] = a.slice(2).split('=');
      return [k, Number.isNaN(Number(v)) ? v : Number(v)];
    }),
  );

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function withDb(fn) {
  await connectDb();
  try {
    return await fn();
  } finally {
    await disconnectDb();
  }
}

export const SENSORS = [
  { sensorType: 'temperature', unit: 'C', base: 24, spread: 4 },
  { sensorType: 'humidity', unit: '%', base: 55, spread: 10 },
  { sensorType: 'pressure', unit: 'hPa', base: 1013, spread: 8 },
  { sensorType: 'vibration', unit: 'mm/s', base: 2, spread: 1 },
];

/** Generate a stored-shape measurement (bypasses HTTP validation for load tests). */
export function makeMeasurement(deviceIndex, sensorIndex, timestamp = Date.now()) {
  const s = SENSORS[sensorIndex % SENSORS.length];
  return {
    timestamp: new Date(timestamp),
    metadata: {
      deviceId: `dev-${String(deviceIndex).padStart(4, '0')}`,
      sensorType: s.sensorType,
      unit: s.unit,
      site: `site-${deviceIndex % 10}`,
    },
    value: +(s.base + (Math.random() - 0.5) * 2 * s.spread).toFixed(3),
    quality: 'good',
  };
}
