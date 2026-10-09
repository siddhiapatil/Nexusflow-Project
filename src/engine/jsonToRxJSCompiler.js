// src/engine/jsonToRxJSCompiler.js
const { filter, map } = require('rxjs/operators');

/**
 * Compiles React Flow graph JSON into dynamic RxJS operators.
 * @param {Array} nodes - List of nodes from React Flow (Sensor, Logic, Actuator)
 * @param {Array} edges - List of connections between nodes
 * @returns {Array} Array of RxJS operator functions
 */
function compileGraphToOperators(nodes, edges) {
  const operators = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find logic/processor nodes to extract threshold rules
  nodes.forEach(node => {
    if (node.type === 'logic_processor') {
      const config = node.data || {};
      const threshold = config.threshold || 30.0;
      const metric = config.metric || 'temperature';

      // 1. Add Filter operator based on user-defined rule
      operators.push(
        filter(telemetry => {
          if (telemetry.metric !== metric) return false;
          return telemetry.value > threshold;
        })
      );

      // 2. Add Map operator to format the alert payload when condition matches
      operators.push(
        map(telemetry => ({
          alertTriggered: true,
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

module.exports = { compileGraphToOperators };