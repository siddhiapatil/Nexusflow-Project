/**
 * Sample React Flow Graph JSON definitions
 * Serialized output from Week 2 React Flow Canvas Scaffolding
 */

export const TURBINE_TEMPERATURE_RULE_GRAPH = {
  id: "rule_turbine_temp_guard",
  name: "Turbine Temperature Guard (Moving Average > 80°C)",
  description: "Computes 5-point moving average of TURBINE-001 temperature and fires alert if > 80°C",
  nodes: [
    {
      id: "node-source-1",
      type: "dataSource",
      data: {
        sensorId: "TURBINE-001",
        metric: "temperature"
      }
    },
    {
      id: "node-filter-1",
      type: "mathOperation",
      data: {
        operation: "movingAverage",
        windowSize: 5
      }
    },
    {
      id: "node-condition-1",
      type: "condition",
      data: {
        operator: ">",
        threshold: 80.0
      }
    },
    {
      id: "node-action-1",
      type: "actionTrigger",
      data: {
        actionType: "ALERT",
        severity: "CRITICAL",
        title: "High Turbine Core Temperature",
        message: "Turbine-001 moving average temperature exceeded safety threshold (80°C)."
      }
    }
  ],
  edges: [
    { id: "e1-2", source: "node-source-1", target: "node-filter-1" },
    { id: "e2-3", source: "node-filter-1", target: "node-condition-1" },
    { id: "e3-4", source: "node-condition-1", target: "node-action-1" }
  ]
};

export const MOTOR_VIBRATION_RULE_GRAPH = {
  id: "rule_motor_vibration_spike",
  name: "Motor Vibration Anomaly Detection",
  description: "Detects vibration spikes on MOTOR-042 > 4.5 mm/s",
  nodes: [
    {
      id: "node-source-2",
      type: "dataSource",
      data: {
        sensorId: "MOTOR-042",
        metric: "vibration"
      }
    },
    {
      id: "node-condition-2",
      type: "condition",
      data: {
        operator: ">",
        threshold: 4.5
      }
    },
    {
      id: "node-action-2",
      type: "actionTrigger",
      data: {
        actionType: "ALERT",
        severity: "WARNING",
        title: "Motor Vibration Anomaly",
        message: "Motor-042 vibration reading exceeded critical threshold (4.5 mm/s)."
      }
    }
  ],
  edges: [
    { id: "e2-cond", source: "node-source-2", target: "node-condition-2" },
    { id: "e2-act", source: "node-condition-2", target: "node-action-2" }
  ]
};
