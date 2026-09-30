import Sparkline from './components/Sparkline.jsx';
import Stat from './components/Stat.jsx';
import { usePolling } from './usePolling.js';

const fmt = (n) => (n ?? 0).toLocaleString();
const mb = (b) => `${((b ?? 0) / 1024 / 1024).toFixed(2)} MB`;

export default function App() {
  const { data: ing, error } = usePolling('/api/metrics/ingestion', 1000);
  const { data: sto } = usePolling('/api/metrics/storage', 5000);
  const { data: latest } = usePolling('/api/telemetry/latest?limit=12', 2000);

  return (
    <main className="page">
      <header>
        <h1>NexusFlow <span>Telemetry Monitor</span></h1>
        {error && <p className="error">Backend unreachable: {error}</p>}
      </header>

      <section className="grid">
        <Stat label="Writes / sec (now)" value={fmt(ing?.writesPerSecCurrent)} hint={`peak ${fmt(ing?.writesPerSecPeak)}`} />
        <Stat label="Total written" value={fmt(ing?.written)} hint={`failed ${fmt(ing?.failed)} | dropped ${fmt(ing?.dropped)}`} />
        <Stat label="Batch latency p95" value={`${ing?.batchLatencyMs?.p95 ?? 0} ms`} hint={`p99 ${ing?.batchLatencyMs?.p99 ?? 0} ms`} />
        <Stat label="Queue depth" value={fmt(ing?.queueDepth)} hint={`${ing?.inflightBatches ?? 0} batches in flight`} />
      </section>

      <section className="card">
        <h2>Write throughput (last 2 min) <small>dashed = 5,000/s target</small></h2>
        <Sparkline points={ing?.history} />
      </section>

      <section className="card">
        <h2>Storage footprint</h2>
        <div className="grid">
          <Stat label="Measurements" value={fmt(sto?.measurements)} />
          <Stat label="Storage size" value={mb(sto?.storageSizeBytes)} hint={`${sto?.bytesPerMeasurementOnDisk ?? 0} B / measurement`} />
          <Stat label="Index size" value={mb(sto?.indexSizeBytes)} />
          <Stat label="Buckets" value={fmt(sto?.buckets?.bucketCount)} hint={`${sto?.buckets?.avgMeasurementsPerBucket ?? 0} per bucket`} />
        </div>
      </section>

      <section className="card">
        <h2>Latest readings (rule-engine input)</h2>
        <table>
          <thead><tr><th>Device</th><th>Sensor</th><th>Value</th><th>Quality</th><th>Timestamp</th></tr></thead>
          <tbody>
            {(latest ?? []).map((r) => (
              <tr key={`${r.deviceId}-${r.sensorType}`}>
                <td>{r.deviceId}</td><td>{r.sensorType}</td><td>{r.value} {r.unit}</td>
                <td>{r.quality}</td><td>{new Date(r.timestamp).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
