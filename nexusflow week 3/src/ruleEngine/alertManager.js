import EventEmitter from 'events';

export class AlertManager extends EventEmitter {
  constructor({ maxHistory = 1000 } = {}) {
    super();
    this.maxHistory = maxHistory;
    this.alertHistory = [];
    this.stats = {
      totalAlerts: 0,
      bySeverity: {
        INFO: 0,
        WARNING: 0,
        CRITICAL: 0
      },
      lastAlertTime: null
    };
  }

  /**
   * Process and register a triggered rule alert
   * @param {Object} alert
   */
  dispatchAlert(alert) {
    this.stats.totalAlerts++;
    const severity = alert.severity || 'WARNING';
    if (this.stats.bySeverity[severity] !== undefined) {
      this.stats.bySeverity[severity]++;
    }
    this.stats.lastAlertTime = new Date().toISOString();

    const enrichedAlert = {
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      receivedAt: new Date().toISOString(),
      ...alert
    };

    this.alertHistory.unshift(enrichedAlert);
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.pop();
    }

    console.log(`[ALERT] [${severity}] ${alert.ruleName} | Sensor: ${alert.sensorId} | Val: ${alert.evaluatedValue} (${alert.operator} ${alert.threshold})`);
    
    // Broadcast event to WebSocket or UI
    this.emit('alert', enrichedAlert);
    return enrichedAlert;
  }

  getRecentAlerts(limit = 50) {
    return this.alertHistory.slice(0, limit);
  }

  getStats() {
    return {
      ...this.stats,
      activeAlertCount: this.alertHistory.length
    };
  }

  clear() {
    this.alertHistory = [];
    this.stats.totalAlerts = 0;
    this.stats.bySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    this.stats.lastAlertTime = null;
  }
}
