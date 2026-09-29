import { z } from 'zod';

const timestampSchema = z
  .union([z.string().datetime({ offset: true }), z.number().int().positive()])
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'invalid timestamp');

export const readingSchema = z.object({
  deviceId: z.string().min(1).max(64),
  sensorType: z.string().min(1).max(32),
  value: z.number().finite(),
  unit: z.string().max(16).optional(),
  site: z.string().max(64).optional(),
  timestamp: timestampSchema.optional(),
  quality: z.enum(['good', 'uncertain', 'bad']).default('good'),
});

/** Convert a validated reading to the stored time-series measurement shape. */
export function toMeasurement(reading) {
  const metadata = { deviceId: reading.deviceId, sensorType: reading.sensorType };
  if (reading.unit) metadata.unit = reading.unit;
  if (reading.site) metadata.site = reading.site;
  return {
    timestamp: new Date(reading.timestamp ?? Date.now()),
    metadata,
    value: reading.value,
    quality: reading.quality,
  };
}

/** Validate one reading or an array of readings. Never throws. */
export function parseReadings(input) {
  const items = Array.isArray(input) ? input : [input];
  const docs = [];
  const errors = [];
  let rejected = 0;

  items.forEach((item, index) => {
    const result = readingSchema.safeParse(item);
    if (result.success) {
      docs.push(toMeasurement(result.data));
    } else {
      rejected += 1;
      if (errors.length < 5) {
        errors.push({ index, message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      }
    }
  });
  return { docs, rejected, errors };
}
