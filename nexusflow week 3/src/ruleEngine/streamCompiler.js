/**
 * NexusFlow RxJS Stream Compiler
 * 
 * Compiles a React Flow JSON graph (Nodes & Edges) into an executable in-memory
 * RxJS Observable pipeline for microsecond real-time telemetry rule evaluation.
 * Includes native reactive pipeline capability for zero-dependency test execution.
 */

class FallbackObservable {
  constructor(subscribeFn) {
    this._subscribe = subscribeFn;
  }

  pipe(...operators) {
    return operators.reduce((source, op) => op(source), this);
  }

  subscribe(observer) {
    const nextFn = typeof observer === 'function' ? observer : (observer?.next || (() => {}));
    const errFn = observer?.error || (() => {});
    return this._subscribe(nextFn, errFn);
  }
}

export class StreamCompiler {
  /**
   * Compiles a serialized React Flow graph into an RxJS / Reactive pipeline
   * @param {Object} graph React Flow graph JSON
   * @param {Object} telemetrySubject Shared telemetry stream (RxJS Subject or EventEmitter)
   * @param {Function} onAlertCallback Callback when rule triggers
   */
  static compileGraph(graph, telemetrySubject, onAlertCallback) {
    const { id: ruleId, name: ruleName, nodes, edges } = graph;

    // 1. Identify Source Node
    const sourceNode = nodes.find(n => n.type === 'dataSource');
    if (!sourceNode) {
      throw new Error(`Invalid Graph [${ruleId}]: Missing 'dataSource' node.`);
    }
    const { sensorId, metric } = sourceNode.data;

    // 2. Identify Condition Node
    const conditionNode = nodes.find(n => n.type === 'condition');
    if (!conditionNode) {
      throw new Error(`Invalid Graph [${ruleId}]: Missing 'condition' node.`);
    }
    const { operator, threshold } = conditionNode.data;

    // 3. Identify Math/Filter Nodes (e.g. Moving Average)
    const filterNode = nodes.find(n => n.type === 'mathOperation');
    
    // 4. Identify Action Node
    const actionNode = nodes.find(n => n.type === 'actionTrigger');
    const actionData = actionNode ? actionNode.data : {
      severity: 'WARNING',
      title: 'Rule Triggered',
      message: `Rule ${ruleName} matched threshold.`
    };

    // State for rolling filters & throttling
    const windowSize = filterNode?.data?.windowSize || 5;
    const isMovingAvg = filterNode?.data?.operation === 'movingAverage';
    let windowBuffer = [];
    let lastAlertTime = 0;
    const throttleMs = 3000;

    const evaluatePoint = (item) => {
      // Step A: Filter by target sensorId and metric existence
      const itemSensorId = item.metadata?.sensorId || item.sensorId;
      const metrics = item.metrics || item;
      if (itemSensorId !== sensorId || metrics[metric] === undefined || metrics[metric] === null) {
        return;
      }

      const val = Number(metrics[metric]);
      if (isNaN(val)) return;

      let evaluatedValue = val;
      let isFiltered = false;

      // Step B & C: Apply Math Operations (e.g. Moving Average)
      if (isMovingAvg) {
        windowBuffer.push(val);
        if (windowBuffer.length > windowSize) {
          windowBuffer.shift();
        }
        const sum = windowBuffer.reduce((a, b) => a + b, 0);
        evaluatedValue = Number((sum / windowBuffer.length).toFixed(2));
        isFiltered = true;
      }

      // Step D: Evaluate Condition Operator
      let conditionPassed = false;
      switch (operator) {
        case '>': conditionPassed = evaluatedValue > threshold; break;
        case '>=': conditionPassed = evaluatedValue >= threshold; break;
        case '<': conditionPassed = evaluatedValue < threshold; break;
        case '<=': conditionPassed = evaluatedValue <= threshold; break;
        case '==':
        case '===': conditionPassed = evaluatedValue === threshold; break;
        case '!=':
        case '!==': conditionPassed = evaluatedValue !== threshold; break;
        default: conditionPassed = false;
      }

      if (!conditionPassed) return;

      // Step E: Throttle alert triggers
      const now = Date.now();
      if (now - lastAlertTime < throttleMs) {
        return;
      }
      lastAlertTime = now;

      // Step F: Dispatch Alert
      const alertPayload = {
        ruleId,
        ruleName,
        sensorId,
        metric,
        evaluatedValue,
        rawValue: val,
        threshold,
        operator,
        isFiltered,
        timestamp: new Date().toISOString(),
        severity: actionData.severity || 'WARNING',
        title: actionData.title || `Alert on ${sensorId}`,
        message: actionData.message || `Metric ${metric} (${evaluatedValue}) matched ${operator} ${threshold}`
      };

      if (typeof onAlertCallback === 'function') {
        onAlertCallback(alertPayload);
      }
    };

    let subscription;

    // Check if subject is RxJS Subject (has .subscribe) or EventEmitter
    if (typeof telemetrySubject.subscribe === 'function') {
      subscription = telemetrySubject.subscribe({
        next: evaluatePoint,
        error: (err) => console.error(`[Rule Pipeline Error]`, err)
      });
    } else if (typeof telemetrySubject.on === 'function') {
      telemetrySubject.on('telemetry', evaluatePoint);
      subscription = {
        unsubscribe: () => telemetrySubject.off('telemetry', evaluatePoint)
      };
    } else {
      throw new Error('Unsupported telemetry stream source. Must have subscribe() or on() method.');
    }

    return {
      ruleId,
      ruleName,
      subscription,
      unsubscribe: () => {
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      }
    };
  }
}
