import EventEmitter from 'events';
import { TELEMETRY_COLLECTION_NAME } from '../config/timeseriesSetup.js';

export class BatchIngestBuffer extends EventEmitter {
  /**
   * @param {Object} options
   * @param {import('mongodb').Db} [options.db] - MongoDB database instance
   * @param {number} [options.batchSize] - Maximum batch size before flushing
   * @param {number} [options.flushIntervalMs] - Max time to wait before flushing buffer
   * @param {number} [options.maxBufferSize] - Safety limit for in-memory queue
   */
  constructor({
    db = null,
    batchSize = 500,
    flushIntervalMs = 50,
    maxBufferSize = 50000
  } = {}) {
    super();
    this.db = db;
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;

    this.buffer = [];
    this.timer = null;
    this.isFlushing = false;
    
    // Performance & Telemetry Ingestion Metrics
    this.metrics = {
      totalReceived: 0,
      totalInserted: 0,
      totalBatches: 0,
      totalFailed: 0,
      avgBatchLatencyMs: 0,
      lastFlushTime: null,
      maxObservedQueueLength: 0
    };

    // Simulated storage for environments without active MongoDB instance
    this.inMemoryStorage = [];
    this.useInMemoryFallback = !db;

    this._startTimer();
  }

  setDatabase(db) {
    this.db = db;
    this.useInMemoryFallback = !db;
  }

  _startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.buffer.length > 0 && !this.isFlushing) {
        this.flush();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Push a telemetry document to the ingestion buffer
   * @param {object} doc
   */
  enqueue(doc) {
    if (this.buffer.length >= this.maxBufferSize) {
      this.metrics.totalFailed++;
      this.emit('backpressure_drop', { queueLength: this.buffer.length });
      return false;
    }

    this.buffer.push(doc);
    this.metrics.totalReceived++;

    if (this.buffer.length > this.metrics.maxObservedQueueLength) {
      this.metrics.maxObservedQueueLength = this.buffer.length;
    }

    if (this.buffer.length >= this.batchSize && !this.isFlushing) {
      this.flush();
    }

    return true;
  }

  /**
   * Bulk flush queued documents to MongoDB Time-Series collection
   */
  async flush() {
    if (this.isFlushing || this.buffer.length === 0) return;
    this.isFlushing = true;

    // Splice up to batchSize items
    const batch = this.buffer.splice(0, this.batchSize);
    const startTime = performance.now();

    try {
      if (this.db && !this.useInMemoryFallback) {
        const collection = this.db.collection(TELEMETRY_COLLECTION_NAME);
        // High-throughput unordered bulk insert
        const result = await collection.insertMany(batch, { ordered: false });
        this.metrics.totalInserted += result.insertedCount;
      } else {
        // Fallback / in-memory accumulator for zero-config testing
        this.inMemoryStorage.push(...batch);
        this.metrics.totalInserted += batch.length;
      }

      const elapsed = performance.now() - startTime;
      this.metrics.totalBatches++;
      this.metrics.lastFlushTime = new Date();
      this.metrics.avgBatchLatencyMs = (
        (this.metrics.avgBatchLatencyMs * (this.metrics.totalBatches - 1) + elapsed) /
        this.metrics.totalBatches
      );

      this.emit('flush_success', {
        count: batch.length,
        latencyMs: elapsed,
        pendingQueue: this.buffer.length
      });
    } catch (err) {
      this.metrics.totalFailed += batch.length;
      this.emit('flush_error', { error: err.message, batchCount: batch.length });
    } finally {
      this.isFlushing = false;
      // If there are still items remaining exceeding batchSize, flush again immediately
      if (this.buffer.length >= this.batchSize) {
        setImmediate(() => this.flush());
      }
    }
  }

  /**
   * Force flush all remaining telemetry data (used during shutdown/tests)
   */
  async flushAll() {
    while (this.buffer.length > 0) {
      await this.flush();
      await new Promise(res => setTimeout(res, 10));
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentQueueLength: this.buffer.length,
      storageMode: this.useInMemoryFallback ? 'in-memory (fallback)' : 'MongoDB Time-Series'
    };
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
