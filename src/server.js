// src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'NexusFlow Backend is up and running!',
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 NexusFlow server listening on port ${PORT}`);
});