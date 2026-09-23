// src/routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const { parseGraphPayload } = require('../parsers/graphParser');

// POST /api/v1/graphs/ingest
router.post('/ingest', (req, res) => {
  try {
    const parsedData = parseGraphPayload(req.body);
    
    res.status(200).json({
      status: 'success',
      message: 'Graph payload successfully received and validated!',
      data: parsedData
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;