import { performance } from 'node:perf_hooks';

/**
 * Buffered bulk writer. Producers (HTTP / WebSocket) enqueue measurements;
 * the writer drains them in unordered `insertMany` batches with bounded
 * concurrency. A bounded queue provides back-pressure instead of unbounded
 * memory growth.
 */
export class IngestionService {
  #queue = [];
  #inflight = 0;
  #timer = null;
  #scheduled = false;

  constructor(collection, metrics, options) {
    this.collection = collection;
    this.metrics = metrics;
    this.options = options; // { batchSize, flushIntervalMs, maxInflight, maxQueue }
  }

  start() {
    this.#timer = setInterval(() => this.#drain(), this.options.flushIntervalMs);
    this.#timer.unref();
  }

  get queueDepth() {
    return this.#queue.length;
  }

  get inflight() {
    return this.#inflight;
  }

  /** @returns {{accepted:number, dropped:number}} */
  enqueue(docs) {
    this.metrics.received += docs.length;
    if (this.#queue.length + docs.length > this.options.maxQueue) {
      this.metrics.dropped += docs.length;
      return { accepted: 0, dropped: docs.length };
    }
    for (const doc of docs) this.#queue.push(doc);
    if (this.#queue.length >= this.options.batchSize && !this.#scheduled) {
      this.#scheduled = true;
      setImmediate(() => {
        this.#scheduled = false;
        this.#drain();
      });
    }
    return { accepted: docs.length, dropped: 0 };
  }

  #drain() {
    while (this.#queue.length > 0 && this.#inflight < this.options.maxInflight) {
      const batch = this.#queue.splice(0, this.options.batchSize);
      this.#write(batch);
    }
  }

  async #write(batch) {
    this.#inflight += 1;
    const startedAt = performance.now();
    try {
      await this.collection.insertMany(batch, { ordered: false });
      this.metrics.recordWrite(batch.length, performance.now() - startedAt);
    } catch (error) {
      const inserted = error.result?.insertedCount ?? 0;
      if (inserted) this.metrics.recordWrite(inserted, performance.now() - startedAt);
      this.metrics.failed += batch.length - inserted;
      console.error(`[ingest] batch failed (${batch.length - inserted}/${batch.length}): ${error.message}`);
    } finally {
      this.#inflight -= 1;
      if (this.#queue.length > 0) setImmediate(() => this.#drain());
    }
  }

  /** Flush everything still queued (used on shutdown). */
  async stop() {
    clearInterval(this.#timer);
    while (this.#queue.length > 0 || this.#inflight > 0) {
      this.#drain();
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}
