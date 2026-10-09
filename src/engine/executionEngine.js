// src/engine/executionEngine.js
const { from, of, Subject } = require('rxjs');
const { concatMap, map, filter, toArray } = require('rxjs/operators');

// 1. Create global RxJS Subjects for live telemetry and alerts (Day 3, 4 & 5)
const telemetrySubject = new Subject();
const alertSubject = new Subject();

// Setup alert subscriber for broadcasting threshold breaches
alertSubject.subscribe({
  next: (alertEvent) => {
    console.log("🚨 [ALERT BROADCAST]:", alertEvent);
  }
});

// Setup live stream subscriber for in-memory monitoring
telemetrySubject.pipe(
  map(data => ({
    ...data,
    receivedAt: new Date().toISOString(),
    processedInMem: true
  }))
).subscribe({
  next: (processedData) => {
    console.log("📥 [Live Stream] Telemetry received & processed:", processedData);
  },
  error: (err) => {
    console.error("❌ [Live Stream Error]:", err);
  }
});

/**
 * Day 5 Task: Compile saved React Flow JSON nodes into dynamic RxJS operators.
 */
function compileGraphToOperators(nodes) {
  const operators = [];

  nodes.forEach(node => {
    if (node.type === 'logic_processor') {
      const config = node.data || {};
      const threshold = config.threshold || 30.0;
      const metric = config.metric || 'temperature';

      // Dynamic Filter Operator
      operators.push(
        filter(telemetry => {
          if (telemetry.metric !== metric) return false;
          return telemetry.value > threshold;
        })
      );

      // Dynamic Map Operator to generate structured alert event
      operators.push(
        map(telemetry => ({
          alertId: `alert-${Date.now()}`,
          sensorId: telemetry.sensorId,
          metric: telemetry.metric,
          value: telemetry.value,
          threshold: threshold,
          message: `Threshold breached! ${telemetry.metric} value ${telemetry.value} exceeded limit of ${threshold}.`,
          timestamp: new Date().toISOString()
        }))
      );
    }
  });

  return operators;
}

/**
 * Attach compiled React Flow graph nodes to the live telemetry stream pipeline.
 */
function attachGraphPipeline(nodes) {
  const dynamicOperators = compileGraphToOperators(nodes);
  
  let stream = telemetrySubject.asObservable();
  dynamicOperators.forEach(op => {
    stream = stream.pipe(op);
  });

  stream.subscribe({
    next: (alertResult) => {
      alertSubject.next(alertResult);
    },
    error: (err) => {
      console.error("❌ Pipeline Error:", err);
    }
  });
}

function executeWorkflowRxJS(nodes, executionPlan) {
  return new Promise((resolve, reject) => {
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.id, node));

    let currentContext = {
      triggerTimestamp: new Date().toISOString(),
      lastReading: 31.8,
      alertTriggered: false
    };

    from(executionPlan).pipe(
      concatMap(nodeId => {
        const node = nodeMap.get(nodeId);
        let nodeResult;

        switch (node.type) {
          case 'sensor_input':
            nodeResult = {
              status: 'success',
              metric: 'temperature',
              value: currentContext.lastReading,
              unit: 'Celsius'
            };
            break;

          case 'logic_processor':
            const threshold = 30.0;
            const isExceeded = currentContext.lastReading > threshold;
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
              message: currentContext.alertTriggered ? 'Threshold breached! Cooling system activated.' : 'Normal operation.'
            };
            break;

          default:
            nodeResult = {
              status: 'success',
              message: 'Generic stream node executed successfully.'
            };
        }

        return of({
          nodeId: node.id,
          type: node.type,
          output: nodeResult,
          executedAt: new Date().toISOString()
        });
      }),
      toArray()
    ).subscribe({
      next: (logs) => {
        resolve({
          success: true,
          engineType: 'RxJS Reactive Stream with Dynamic Compilation',
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

async function executeWorkflow(nodes, executionPlan) {
  return await executeWorkflowRxJS(nodes, executionPlan);
}

function ingestLiveTelemetry(sensorData) {
  telemetrySubject.next(sensorData);
}

module.exports = {
  executeWorkflow,
  telemetrySubject,
  alertSubject,
  ingestLiveTelemetry,
  attachGraphPipeline
};