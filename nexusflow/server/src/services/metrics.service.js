const percentile = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : 0;

/** In-process counters for ingestion throughput and MongoDB write latency. */
export class IngestionMetrics {
  #startedAt = Date.now();
  #lastWritten = 0;
  #latencies = [];
  #timer = null;

  received = 0;
  written = 0;
  failed = 0;
  dropped = 0;
  rejected = 0;
  peakWritesPerSec = 0;
  history = [];

  start() {
    this.#timer = setInterval(() => {
      const delta = this.written - this.#lastWritten;
      this.#lastWritten = this.written;
      this.peakWritesPerSec = Math.max(this.peakWritesPerSec, delta);
      this.history.push({ t: Date.now(), writes: delta });
      if (this.history.length > 120) this.history.shift();
    }, 1000);
    this.#timer.unref();
  }

  stop() {
    clearInterval(this.#timer);
  }

  recordWrite(count, latencyMs) {
    this.written += count;
    this.#latencies.push(latencyMs);
    if (this.#latencies.length > 1000) this.#latencies.shift();
  }

  snapshot(extra = {}) {
    const sorted = [...this.#latencies].sort((a, b) => a - b);
    const uptimeSec = (Date.now() - this.#startedAt) / 1000;
    return {
      uptimeSec: Math.round(uptimeSec),
      received: this.received,
      written: this.written,
      failed: this.failed,
      dropped: this.dropped,
      rejected: this.rejected,
      writesPerSecCurrent: this.history.at(-1)?.writes ?? 0,
      writesPerSecPeak: this.peakWritesPerSec,
      writesPerSecAvg: uptimeSec > 0 ? Math.round(this.written / uptimeSec) : 0,
      batchLatencyMs: {
        p50: +percentile(sorted, 50).toFixed(2),
        p95: +percentile(sorted, 95).toFixed(2),
        p99: +percentile(sorted, 99).toFixed(2),
        max: +(sorted.at(-1) ?? 0).toFixed(2),
      },
      history: this.history,
      ...extra,
    };
  }
}
