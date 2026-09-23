// src/routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const { parseGraphPayload } = require('../parsers/graphParser');
const { compileGraph } = require('../compiler/logicCompiler');
const { executeWorkflow } = require('../engine/executionEngine');
const { saveExecutionRun, getExecutionHistory } = require('../storage/workflowStore');

// POST /api/v1/graphs/ingest - Parse, compile, execute, and store workflow
router.post('/ingest', (req, res) => {
  try {
    const parsedData = parseGraphPayload(req.body);
    const compilationResult = compileGraph(parsedData.nodes, parsedData.edges);
    const executionResult = executeWorkflow(parsedData.nodes, compilationResult.executionPlan);

    const workflowRecord = {
      nodes: parsedData.nodes,
      edges: parsedData.edges,
      compilation: compilationResult,
      execution: executionResult
    };

    // Save execution run to persistent storage
    const savedRecord = saveExecutionRun(workflowRecord);

    return res.status(200).json({
      status: 'success',
      message: 'Graph successfully processed, executed, and saved!',
      data: savedRecord
    });

  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET /api/v1/graphs/history - Retrieve all past execution runs
router.get('/history', (req, res) => {
  try {
    const history = getExecutionHistory();
    return res.status(200).json({
      status: 'success',
      count: history.length,
      data: history
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;