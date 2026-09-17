const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to let our server read JSON data
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('NexusFlow Backend is running smoothly!');
});

// --- DAY 3: TELEMETRY INGESTION API ---
app.post('/api/telemetry', (req, res) => {
  const telemetryData = req.body;

  // Print the incoming data in your terminal so you can see it
  console.log('Received Telemetry Data:', telemetryData);

  // Check if data actually came in
  if (!telemetryData.deviceId) {
    return res.status(400).json({ error: 'Missing deviceId in telemetry payload' });
  }

  // Send a success response back to the sender
  res.status(201).json({
    success: true,
    message: 'Telemetry data received successfully!',
    receivedData: telemetryData
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});