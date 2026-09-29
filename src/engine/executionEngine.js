// src/engine/executionEngine.js
const { from, of } = require('rxjs');
const { concatMap, map, catchId, toArray } = require('rxjs/operators');

function executeWorkflowRxJS(nodes, executionPlan) {
  return new Promise((resolve, reject) => {
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.id, node));

    const executionLogs = [];
    let currentContext = {
      triggerTimestamp: new Date().toISOString(),
      lastReading: null,
      alertTriggered: false
    };

    // 1. Create an RxJS Observable stream from the compiled execution plan (node IDs)
    from(executionPlan).pipe(
      // 2. Process each node sequentially using concatMap
      concatMap(nodeId => {
        const node = nodeMap.get(nodeId);
        let nodeResult;

        switch (node.type) {
          case 'sensor_input':
            const temperatureValue = 31.8;
            nodeResult = {
              status: 'success',
              metric: 'temperature',
              value: temperatureValue,
              unit: 'Celsius'
            };
            currentContext.lastReading = temperatureValue;
            break;

          case 'logic_processor':
            const threshold = 30.0;
            const isExceeded = currentContext.lastReading !== null && currentContext.lastReading > threshold;
            nodeResult = {
              status: 'success',
              evaluatedCondition: isExceeded,
              ruleChecked: `temperature > ${threshold}`,
              actionRequired: isExceeded ? 'dispatch_alert' : 'none'
            };
            currentContext.alertTriggered = isExceeded;
            break;

          case 'actuator_output':
            const actionStatus = currentContext.alertTriggered ? 'activated_cooling_fan' : 'standby';
            nodeResult = {
              status: 'success',
              targetDevice: 'HVAC_Relay_02',
              actionTaken: actionStatus,
              message: currentContext.alertTriggered ? 'Threshold breached! Cooling system activated.' : 'Normal operation. System on standby.'
            };
            break;

          default:
            nodeResult = {
              status: 'success',
              message: 'Generic stream node executed successfully.'
            };
        }

        const logEntry = {
          nodeId: node.id,
          type: node.type,
          output: nodeResult,
          executedAt: new Date().toISOString()
        };

        return of(logEntry);
      }),
      // 3. Collect all emitted logs into an array stream
      toArray()
    ).subscribe({
      next: (logs) => {
        resolve({
          success: true,
          engineType: 'RxJS Reactive Stream',
          totalExecuted: logs.length,
          contextSummary: currentContext,
          logs: logs
        });
      },
      error: (err) => {
        reject(new Error(`RxJS Execution Stream Error: ${err.message}`));
      }
    });
  });
}

// Keep backward compatibility wrapper if synchronous calls are expected elsewhere, 
// or export the async RxJS execution function.
async function executeWorkflow(nodes, executionPlan) {
  return await executeWorkflowRxJS(nodes, executionPlan);
}

module.exports = { executeWorkflow };