const sampleTelemetry = {
  sensorId: "turb-sensor-09",
  timestamp: new Date().toISOString(),
  metric: "temperature",
  value: 84.5,
  unit: "Celsius"
};

// Simple validation check
if (sampleTelemetry.sensorId && typeof sampleTelemetry.value === 'number') {
  console.log("✅ Day 1 Data Format Test Passed: Valid telemetry payload.");
} else {
  console.log("❌ Test Failed: Invalid format.");
}