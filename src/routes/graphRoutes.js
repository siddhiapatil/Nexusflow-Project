// src/routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const { parseGraphPayload } = require('../parsers/graphParser');
const { compileGraph } = require('../compiler/logicCompiler');
const { executeWorkflow } = require('../engine/executionEngine');

// POST /api/v1/graphs/ingest
router.post('/ingest', (req, res) => {
  try {
    // 1. Parse and validate raw JSON structure
    const parsedData = parseGraphPayload(req.body);

    // 2. Compile graph into an execution plan
    const compilationResult = compileGraph(parsedData.nodes, parsedData.edges);

    // 3. Run the execution engine using the nodes and execution plan
    const executionResult = executeWorkflow(parsedData.nodes, compilationResult.executionPlan);

    // 4. Return combined success response with execution logs
    return res.status(200).json({
      status: 'success',
      message: 'Graph successfully parsed, compiled, and executed!',
      data: {
        ...parsedData,
        compilation: compilationResult,
        execution: executionResult
      }
    });

  } catch (error) {
    // Handle validation, compilation, or execution errors gracefully
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;