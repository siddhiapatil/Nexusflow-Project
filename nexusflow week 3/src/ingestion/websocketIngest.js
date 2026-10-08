import { WebSocketServer, WebSocket } from 'ws';
import { TelemetryPoint } from '../models/telemetrySchema.js';

export class WebSocketIngestionGateway {
  /**
   * @param {Object} options
   * @param {import('http').Server} options.server HTTP Server to attach WebSocket server to
   * @param {import('./batchIngestBuffer.js').BatchIngestBuffer} options.batchBuffer Ingestion buffer
   * @param {import('../ruleEngine/liveRuleExecutor.js').LiveRuleExecutor} options.ruleExecutor Rule engine
   * @param {import('../ruleEngine/alertManager.js').AlertManager} options.alertManager Alert manager
   */
  constructor({ server, batchBuffer, ruleExecutor, alertManager }) {
    this.server = server;
    this.batchBuffer = batchBuffer;
    this.ruleExecutor = ruleExecutor;
    this.alertManager = alertManager;

    this.wss = new WebSocketServer({ server });
    this.dashboardClients = new Set();
    this.ingestionClients = new Set();

    this.metrics = {
      wsMessagesReceived: 0,
      wsBroadcastsSent: 0,
      connectedClients: 0
    };

    this._setupGateway();
    this._setupAlertBroadcast();
  }

  _setupGateway() {
    this.wss.on('connection', (socket, request) => {
      const url = request.url || '/';
      this.metrics.connectedClients = this.wss.clients.size;

      // Classify client type based on path or initial handshake
      if (url.includes('/dashboard')) {
        this.dashboardClients.add(socket);
        console.log(`[WebSocket] Live Dashboard client connected. Total clients: ${this.dashboardClients.size}`);
        
        // Send initial connection ack
        socket.send(JSON.stringify({
          type: 'CONNECTED',
          channel: 'dashboard',
          activeRules: this.ruleExecutor.getActiveRules(),
          recentAlerts: this.alertManager.getRecentAlerts(10)
        }));
      } else {
        // Default to ingestion or mixed socket
        this.ingestionClients.add(socket);
        console.log(`[WebSocket] Sensor Ingestion client connected.`);
      }

      socket.on('message', (messageData) => {
        try {
          this.metrics.wsMessagesReceived++;
          const payload = JSON.parse(messageData.toString());

          // Handle client subscription switches
          if (payload.action === 'subscribe_dashboard') {
            this.ingestionClients.delete(socket);
            this.dashboardClients.add(socket);
            socket.send(JSON.stringify({ type: 'SUBSCRIPTION_CONFIRMED', channel: 'dashboard' }));
            return;
          }

          // Handle array batches or single telemetry objects
          const items = Array.isArray(payload) ? payload : [payload];
          for (const rawItem of items) {
            const normalized = TelemetryPoint.normalize(rawItem);
            if (!normalized) continue;

            // 1. In-memory evaluation via dynamically compiled RxJS pipelines
            this.ruleExecutor.feedTelemetry(normalized);

            // 2. High-speed persistence into MongoDB Time-Series buffer
            this.batchBuffer.enqueue(normalized);

            // 3. Downsampled fan-out broadcast to live dashboard clients
            this._broadcastToDashboards(normalized);
          }
        } catch (err) {
          console.error(`[WebSocket] Failed to parse incoming telemetry:`, err.message);
        }
      });

      socket.on('close', () => {
        this.dashboardClients.delete(socket);
        this.ingestionClients.delete(socket);
        this.metrics.connectedClients = this.wss.clients.size;
      });

      socket.on('error', (err) => {
        console.error(`[WebSocket] Client error:`, err.message);
      });
    });
  }

  _setupAlertBroadcast() {
    // Whenever the rule engine dispatches an alert, broadcast immediately to dashboards
    this.alertManager.on('alert', (alert) => {
      const alertMsg = JSON.stringify({
        type: 'RULE_ALERT',
        data: alert
      });

      for (const client of this.dashboardClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(alertMsg);
          this.metrics.wsBroadcastsSent++;
        }
      }
    });
  }

  // Throttle live UI feed to avoid overwhelming browser DOM
  _broadcastToDashboards(point) {
    if (this.dashboardClients.size === 0) return;

    // Throttle: only broadcast every Nth item or sample
    if (this.metrics.wsMessagesReceived % 2 !== 0 && this.metrics.wsMessagesReceived > 100) {
      return;
    }

    const broadcastMsg = JSON.stringify({
      type: 'TELEMETRY_UPDATE',
      data: {
        timestamp: point.timestamp,
        sensorId: point.metadata.sensorId,
        deviceType: point.metadata.deviceType,
        location: point.metadata.location,
        metrics: point.metrics,
        status: point.status
      }
    });

    for (const client of this.dashboardClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcastMsg);
        this.metrics.wsBroadcastsSent++;
      }
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      dashboardClients: this.dashboardClients.size,
      ingestionClients: this.ingestionClients.size
    };
  }
}
