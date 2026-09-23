// src/engine/executionEngine.js

function executeWorkflow(nodes, executionPlan) {
  // 1. Create a quick lookup map for nodes
  const nodeMap = new Map();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const executionLogs = [];
  let currentPayload = { initialTrigger: true, timestamp: new Date().toISOString() };

  // 2. Iterate through the compiled execution plan step-by-step
  for (const nodeId of executionPlan) {
    const node = nodeMap.get(nodeId);
    
    let nodeResult;
    // 3. Simulate execution behavior based on different IoT node types
    switch (node.type) {
      case 'sensor_input':
        nodeResult = { status: 'success', data: { reading: 24.5, unit: 'Celsius' } };
        break;
      case 'logic_processor':
        nodeResult = { status: 'success', evaluatedCondition: true, actionTriggered: 'activate_relay' };
        break;
      case 'actuator_output':
        nodeResult = { status: 'success', actionStatus: 'executed', targetDevice: 'Relay_01' };
        break;
      default:
        nodeResult = { status: 'success', message: 'Generic node executed successfully' };
    }

    // 4. Record the log for this specific step
    executionLogs.push({
      nodeId: node.id,
      type: node.type,
      output: nodeResult,
      executedAt: new Date().toISOString()
    });

    // Pass data forward to the next node in the pipeline
    currentPayload = nodeResult;
  }

  return {
    success: true,
    totalExecuted: executionLogs.length,
    logs: executionLogs
  };
}

module.exports = { executeWorkflow };