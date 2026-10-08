import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

/**
 * NexusFlow Week 3 React Component
 * Live Telemetry Chart subscribing to WebSocket streaming updates
 * Supports sliding window, dynamic moving average overlay, and alert threshold lines
 */
export const LiveTelemetryChart = ({
  wsUrl = 'ws://localhost:4000/dashboard',
  targetSensorId = 'TURBINE-001',
  metricKey = 'temperature',
  thresholdValue = 80,
  windowSize = 25
}) => {
  const [dataPoints, setDataPoints] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentValue, setCurrentValue] = useState(null);
  const [movingAvg, setMovingAvg] = useState(null);
  const [recentAlert, setRecentAlert] = useState(null);

  const wsRef = useRef(null);
  const slidingWindowRef = useRef([]);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log(`[React LiveChart] Connected to ${wsUrl}`);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // 1. Handle live sensor telemetry stream
        if (payload.type === 'TELEMETRY_UPDATE') {
          const item = payload.data;
          if (item.sensorId === targetSensorId && item.metrics?.[metricKey] !== undefined) {
            const val = Number(item.metrics[metricKey]);
            const timeLabel = new Date(item.timestamp).toLocaleTimeString();

            // Calculate moving average
            slidingWindowRef.current.push(val);
            if (slidingWindowRef.current.length > 5) {
              slidingWindowRef.current.shift();
            }
            const avg = Number(
              (slidingWindowRef.current.reduce((a, b) => a + b, 0) / slidingWindowRef.current.length).toFixed(1)
            );

            setCurrentValue(val);
            setMovingAvg(avg);

            setDataPoints((prev) => {
              const next = [...prev, { time: timeLabel, value: val, movingAverage: avg }];
              if (next.length > windowSize) {
                return next.slice(-windowSize);
              }
              return next;
            });
          }
        }

        // 2. Handle real-time rule alerts from in-memory RxJS pipeline
        if (payload.type === 'RULE_ALERT') {
          const alert = payload.data;
          if (alert.sensorId === targetSensorId) {
            setRecentAlert(alert);
            // Auto dismiss alert banner after 5 seconds
            setTimeout(() => setRecentAlert(null), 5000);
          }
        }
      } catch (err) {
        console.error('[React LiveChart] Message parse error:', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsUrl, targetSensorId, metricKey, windowSize]);

  return (
    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', color: '#f8fafc', border: '1px solid #334155' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{targetSensorId} - {metricKey.toUpperCase()} Stream</h2>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Live RxJS Stream Subscriber</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            height: '10px',
            width: '10px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10b981' : '#ef4444',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.85rem' }}>{isConnected ? 'Stream Active' : 'Disconnected'}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Instantaneous Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>
            {currentValue !== null ? `${currentValue}°C` : '--'}
          </div>
        </div>
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Moving Average (5-pt)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {movingAvg !== null ? `${movingAvg}°C` : '--'}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {recentAlert && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          color: '#fca5a5'
        }}>
          <strong>CRITICAL ALERT:</strong> {recentAlert.title} — {recentAlert.message}
        </div>
      )}

      {/* Recharts Streaming Canvas */}
      <div style={{ height: '320px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={[60, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
            <Legend />
            <ReferenceLine y={thresholdValue} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `Limit: ${thresholdValue}°C`, fill: '#ef4444', position: 'top' }} />
            <Line type="monotone" dataKey="value" name="Current Temp" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="movingAverage" name="5-pt Moving Avg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LiveTelemetryChart;
