import EventEmitter from 'events';
import { StreamCompiler } from './streamCompiler.js';
import { AlertManager } from './alertManager.js';
import { TURBINE_TEMPERATURE_RULE_GRAPH, MOTOR_VIBRATION_RULE_GRAPH } from './sampleGraphs.js';

class ReactiveSubject extends EventEmitter {
  next(val) {
    this.emit('data', val);
  }
  subscribe(observer) {
    const nextFn = typeof observer === 'function' ? observer : (observer?.next || (() => {}));
    this.on('data', nextFn);
    return {
      unsubscribe: () => this.off('data', nextFn)
    };
  }
  complete() {
    this.removeAllListeners();
  }
}

/**
 * Live Rule Execution Engine
 * Evaluates streaming IoT telemetry in memory via dynamic RxJS pipelines
 */
export class LiveRuleExecutor {
  constructor({ alertManager = new AlertManager() } = {}) {
    this.alertManager = alertManager;
    this.telemetrySubject = new ReactiveSubject();
    this.activePipelines = new Map();
    this.totalEvaluatedPoints = 0;
  }

  /**
   * Initializes default predefined rules
   */
  initializeDefaultRules() {
    this.registerRuleGraph(TURBINE_TEMPERATURE_RULE_GRAPH);
    this.registerRuleGraph(MOTOR_VIBRATION_RULE_GRAPH);
    console.log(`[Rule Engine] Initialized ${this.activePipelines.size} live RxJS rule pipelines.`);
  }

  /**
   * Dynamically compile and register a new React Flow graph
   * @param {Object} graphJSON Serialized graph
   */
  registerRuleGraph(graphJSON) {
    if (!graphJSON || !graphJSON.id) {
      throw new Error("Invalid graph format: missing 'id'");
    }

    // Unsubscribe existing if rule with same id exists (hot reload)
    if (this.activePipelines.has(graphJSON.id)) {
      this.unregisterRule(graphJSON.id);
    }

    const compiled = StreamCompiler.compileGraph(
      graphJSON,
      this.telemetrySubject,
      (alert) => this.alertManager.dispatchAlert(alert)
    );

    this.activePipelines.set(graphJSON.id, compiled);
    console.log(`[Rule Engine] Compiled and activated rule: [${graphJSON.id}] '${graphJSON.name}'`);
    return compiled;
  }

  /**
   * Remove and dispose an active rule
   * @param {string} ruleId 
   */
  unregisterRule(ruleId) {
    if (this.activePipelines.has(ruleId)) {
      const pipeline = this.activePipelines.get(ruleId);
      pipeline.unsubscribe();
      this.activePipelines.delete(ruleId);
      console.log(`[Rule Engine] Unregistered rule pipeline: [${ruleId}]`);
      return true;
    }
    return false;
  }

  /**
   * Push incoming telemetry point into reactive evaluation stream
   * @param {Object} telemetryPoint Normalized telemetry point
   */
  feedTelemetry(telemetryPoint) {
    this.totalEvaluatedPoints++;
    this.telemetrySubject.next(telemetryPoint);
  }

  getActiveRules() {
    return Array.from(this.activePipelines.values()).map(p => ({
      ruleId: p.ruleId,
      ruleName: p.ruleName
    }));
  }

  getMetrics() {
    return {
      activeRuleCount: this.activePipelines.size,
      totalEvaluatedPoints: this.totalEvaluatedPoints,
      alerts: this.alertManager.getStats()
    };
  }

  dispose() {
    for (const pipeline of this.activePipelines.values()) {
      pipeline.unsubscribe();
    }
    this.activePipelines.clear();
    this.telemetrySubject.complete();
  }
}
