// src/routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const { parseGraphPayload } = require('../parsers/graphParser');
const { compileGraph } = require('../compiler/logicCompiler');

// POST /api/v1/graphs/ingest
router.post('/ingest', (req, res) => {
  try {
    // 1. Parse and validate raw JSON structure
    const parsedData = parseGraphPayload(req.body);

    // 2. Compile graph into an execution plan
    const compilationResult = compileGraph(parsedData.nodes, parsedData.edges);

    // 3. Return combined success response
    return res.status(200).json({
      status: 'success',
      message: 'Graph successfully parsed and compiled into an execution plan!',
      data: {
        ...parsedData,
        compilation: compilationResult
      }
    });

  } catch (error) {
    // Handle validation or compilation errors gracefully
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;