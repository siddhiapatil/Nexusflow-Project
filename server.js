const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;

app.use(express.json());

// --- CONNECT TO MONGODB ---
mongoose.connect('mongodb://127.0.0.1:27017/nexusflow')
.then(() => console.log('Connected to MongoDB successfully!'))
.catch((err) => console.error('MongoDB connection error:', err));

// --- DEFINE TIME-SERIES SCHEMA & MODEL ---
const telemetrySchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceType: String,
  metrics: {
    temperature: Number,
    pressure: Number,
    vibration_hz: Number
  },
  status: {
    batteryLevel: Number,
    errorFlag: Boolean
  }
}, { 
  timestamps: true,
  timeseries: {
    timeField: 'createdAt',
    metaField: 'deviceId',
    granularity: 'seconds'
  }
});

const Telemetry = mongoose.model('Telemetry', telemetrySchema);

// Test route
app.get('/', (req, res) => {
  res.send('NexusFlow Backend with MongoDB is running!');
});

// --- DAY 3 & 4: INGESTION API (POST) ---
app.post('/api/telemetry', async (req, res) => {
  try {
    const telemetryData = req.body;

    if (!telemetryData.deviceId) {
      return res.status(400).json({ error: 'Missing deviceId in telemetry payload' });
    }

    const newRecord = new Telemetry(telemetryData);
    await newRecord.save();

    console.log('Saved to MongoDB:', newRecord);

    res.status(201).json({
      success: true,
      message: 'Telemetry data received and saved to database!',
      data: newRecord
    });
  } catch (error) {
    console.error('Error saving telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- DAY 6: FETCH TELEMETRY WITH OPTIONAL DEVICE FILTER ---
app.get('/api/telemetry', async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    // If a deviceId is provided in the URL, filter by it. Otherwise, get all records.
    const filter = deviceId ? { deviceId } : {};
    
    const records = await Telemetry.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: records.length,
      filterApplied: deviceId || 'none',
      data: records
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- DAY 7: FETCH LATEST TELEMETRY FOR A DEVICE ---
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Please provide a deviceId query parameter' });
    }
    
    // Find only one record, sorted by newest first
    const latestRecord = await Telemetry.findOne({ deviceId }).sort({ createdAt: -1 });
    
    if (!latestRecord) {
      return res.status(404).json({ error: 'No telemetry found for this device' });
    }
    
    res.status(200).json({
      success: true,
      data: latestRecord
    });
  } catch (error) {
    console.error('Error fetching latest telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- DAY 8: FETCH DEVICE STATS AND AVERAGES ---
app.get('/api/telemetry/stats', async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'Please provide a deviceId query parameter' });
    }

    const records = await Telemetry.find({ deviceId });

    if (records.length === 0) {
      return res.status(404).json({ error: 'No telemetry found for this device' });
    }

    // Calculate average temperature and pressure
    let totalTemp = 0;
    let totalPressure = 0;

    records.forEach(r => {
      if (r.metrics && r.metrics.temperature) totalTemp += r.metrics.temperature;
      if (r.metrics && r.metrics.pressure) totalPressure += r.metrics.pressure;
    });

    const avgTemp = totalTemp / records.length;
    const avgPressure = totalPressure / records.length;

    res.status(200).json({
      success: true,
      deviceId,
      totalReadings: records.length,
      averages: {
        temperature: Number(avgTemp.toFixed(2)),
        pressure: Number(avgPressure.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});