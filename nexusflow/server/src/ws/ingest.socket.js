import { WebSocketServer } from 'ws';
import { parseReadings } from '../utils/validate.js';

/**
 * WebSocket ingestion endpoint: ws://host:port/ws/ingest
 * Client frames: one reading object or an array of readings (JSON).
 * Server replies per frame: { type:'ack', accepted, rejected, dropped }
 */
export function attachIngestSocket(server, { ingestion, metrics }) {
  const wss = new WebSocketServer({ server, path: '/ws/ingest', maxPayload: 2 * 1024 * 1024 });

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });

    socket.on('message', (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        return socket.send(JSON.stringify({ type: 'error', error: 'invalid JSON' }));
      }
      const { docs, rejected, errors } = parseReadings(payload);
      metrics.rejected += rejected;
      const { accepted, dropped } = ingestion.enqueue(docs);
      socket.send(JSON.stringify({ type: 'ack', accepted, rejected, dropped, errors }));
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.isAlive) { socket.terminate(); continue; }
      socket.isAlive = false;
      socket.ping();
    }
  }, 30_000);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
