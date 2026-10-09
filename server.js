// server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- 1. CONNECT TO MONGODB ---
mongoose.connect('mongodb://127.0.0.1:27017/nexusflow')
.then(() => console.log('✅ Connected to MongoDB successfully!'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// --- 2. IMPORT WORKFLOW ENGINE & TELEMETRY INGESTION ---
const { executeWorkflow, ingestLiveTelemetry } = require('./src/engine/executionEngine');

// --- 3. ROUTES ---

// Health Check Route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    dbState: mongoose.connection.readyState,
    message: 'NexusFlow Backend Server is running smoothly!'
  });
});

// Workflow Execution API (Used by React Flow frontend / Postman)
app.post('/api/execute-workflow', async (req, res) => {
  try {
    const { nodes, executionPlan } = req.body;
    const result = await executeWorkflow(nodes || [], executionPlan || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Telemetry Ingestion API (Pushes into RxJS Live Stream & MongoDB)
app.post('/api/telemetry', async (req, res) => {
  try {
    const telemetryData = req.body;
    
    // Ingest live telemetry into RxJS subject for real-time rule evaluation
    ingestLiveTelemetry(telemetryData);

    res.status(201).json({
      success: true,
      message: 'Telemetry data ingested and pushed to live RxJS stream successfully!',
      data: telemetryData
    });
  } catch (error) {
    console.error('Error handling telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- 4. START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 NexusFlow Backend running on http://localhost:${PORT}`);
});