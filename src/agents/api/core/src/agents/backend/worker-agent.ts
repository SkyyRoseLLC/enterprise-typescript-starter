/*
 * WorkerAgent
 * Enterprise-grade background worker with DI, event-driven processing, robust error handling,
 * backpressure, circuit breaker, idempotency, and ML scoring hook.
 */

import { EventEmitter } from 'node:events';

// Lightweight DI contracts to avoid tight coupling
export interface ILogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug?(msg: string, meta?: Record<string, unknown>): void;
}

export interface IMetrics {
  increment(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
}

export interface ITracer {
  startSpan(name: string, attrs?: Record<string, unknown>): ISpan;
}
export interface ISpan {
  setAttribute(key: string, value: unknown): void;
  recordException(err: unknown): void;
  end(): void;
}

export interface IQueue<T> {
  // Pull a batch of messages. Implementations should respect visibility timeouts.
  pull(max: number, waitMs: number): Promise<T[]>;
  // Delete/ack a message when done
  ack(message: T): Promise<void>;
  // Requeue with optional delay
  requeue(message: T, delayMs?: number): Promise<void>;
}

export interface IIdempotencyStore {
  // Returns true if the key was newly created (i.e., not processed before)
  acquire(key: string, ttlSeconds: number): Promise<boolean>;
  // Mark processing outcome for observability/debug
  setResult(key: string, status: 'success' | 'failed', meta?: Record<string, unknown>): Promise<void>;
}

export interface IMlScorer<T> {
  // Optional ML scoring hook to prioritize or annotate work
  score(message: T): Promise<number>; // higher is more important
}

export type WorkerMessage<TPayload = unknown> = {
  id: string; // unique id for idempotency
  type: string;
  payload: TPayload;
  headers?: Record<string, string>;
  attempts?: number;
  traceId?: string;
};

export type WorkerHandler<T> = (msg: WorkerMessage<T>) => Promise<void>;

export interface WorkerAgentOptions {
  name: string;
  maxBatchSize?: number; // max messages to pull per tick
  maxConcurrent?: number; // max concurrent handlers
  visibilityTimeoutMs?: number; // how long a message is invisible while processing (queue-level)
  requeueDelayMs?: number; // base delay for exponential backoff
  maxAttempts?: number; // DLQ cutoff
  idempotencyTtlSec?: number; // how long to keep processed keys
  pollIntervalMs?: number; // base polling interval
  circuitFailureThreshold?: number; // failures before opening circuit
  circuitResetMs?: number; // time to half-open
}

export class WorkerAgent<T = unknown> extends EventEmitter {
  private running = false;
  private inFlight = 0;
  private backoffMs = 0;
  private lastFailureAt = 0;
  private consecutiveFailures = 0;
  private circuitOpen = false;

  constructor(
    private readonly queue: IQueue<WorkerMessage<T>>,
    private readonly handler: WorkerHandler<T>,
    private readonly deps: { logger: ILogger; metrics?: IMetrics; tracer?: ITracer; idempotency?: IIdempotencyStore; ml?: IMlScorer<WorkerMessage<T>>; },
    private readonly opts: WorkerAgentOptions,
  ) {
    super();
    this.opts = {
      maxBatchSize: 10,
      maxConcurrent: 10,
      visibilityTimeoutMs: 30_000,
      requeueDelayMs: 2_000,
      maxAttempts: 5,
      idempotencyTtlSec: 86_400,
      pollIntervalMs: 500,
      circuitFailureThreshold: 20,
      circuitResetMs: 15_000,
      ...opts,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.deps.logger.info(`WorkerAgent[${this.opts.name}] starting`);
    this.loop().catch(err => {
      this.deps.logger.error(`WorkerAgent[${this.opts.name}] fatal loop error`, { err });
      this.emit('fatal', err);
    });
  }

  async stop(graceMs = 10_000) {
    if (!this.running) return;
    this.running = false;
    const deadline = Date.now() + graceMs;
    while (this.inFlight > 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 50));
    }
    this.deps.logger.info(`WorkerAgent[${this.opts.name}] stopped with inFlight=${this.inFlight}`);
  }

  private async loop() {
    while (this.running) {
      // Circuit breaker states
      if (this.circuitOpen) {
        if (Date.now() - this.lastFailureAt > (this.opts.circuitResetMs!)) {
          this.deps.logger.info(`WorkerAgent[${this.opts.name}] circuit half-open test`);
          this.circuitOpen = false; // allow one batch attempt
        } else {
          await this.sleep(this.opts.pollIntervalMs!);
          continue;
        }
      }

      // Backpressure: if at concurrency limit, wait a bit
      if (this.inFlight >= (this.opts.maxConcurrent!)) {
        await this.sleep(10);
        continue;
      }

      try {
        const batchSize = Math.min(
          this.opts.maxBatchSize!,
          Math.max(1, this.opts.maxConcurrent! - this.inFlight),
        );

        const pullWait = Math.max(50, this.opts.pollIntervalMs!);
        const messages = await this.queue.pull(batchSize, pullWait);

        if (!messages || messages.length === 0) {
          await this.sleep(this.opts.pollIntervalMs! + this.backoffMs);
          this.backoffMs = Math.max(0, Math.floor(this.backoffMs * 0.9)); // decay backoff
          continue;
        }

        // Optional ML prioritization: sort by score descending
        const scored = await this.score(messages);
        for (const msg of scored) {
          // Respect concurrency
          if (this.inFlight >= (this.opts.maxConcurrent!)) break;
          this.process(msg).catch(err => {
            this.deps.logger.error(`WorkerAgent[${this.opts.name}] process error (unhandled)`, { err, id: msg.id });
          });
        }

        // small pacing to allow event loop breath
        await this.sleep(1);
      } catch (err) {
        this.recordFailure(err);
        await this.sleep(this.opts.pollIntervalMs! + this.backoffMs);
      }
    }
  }

  private async score(messages: WorkerMessage<T>[]): Promise<WorkerMessage<T>[]> {
    if (!this.deps.ml?.score) return messages;
    try {
      const withScore = await Promise.all(messages.map(async m => ({ m, s: await this.deps.ml!.score(m) })));
      withScore.sort((a, b) => b.s - a.s);
      return withScore.map(x => x.m);
    } catch (err) {
      this.deps.logger.warn(`WorkerAgent[${this.opts.name}] ML score failed; continuing FIFO`, { err });
      return messages;
    }
  }

  private async process(message: WorkerMessage<T>) {
    this.inFlight++;
    const span = this.deps.tracer?.startSpan('WorkerAgent.process', { messageType: message.type, id: message.id });
    const idKey = `${this.opts.name}:${message.id}`;

    try {
      // idempotency guard
      if (this.deps.idempotency) {
        const fresh = await this.deps.idempotency.acquire(idKey, this.opts.idempotencyTtlSec!);
        if (!fresh) {
          this.deps.logger.info(`WorkerAgent[${this.opts.name}] duplicate message skipped`, { id: message.id });
          await this.queue.ack(message);
          return;
        }
      }

      await this.handler(message);
      await this.queue.ack(message);
      await this.deps.idempotency?.setResult(idKey, 'success');

      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
      this.backoffMs = Math.max(0, Math.floor(this.backoffMs * 0.7));
      this.deps.metrics?.increment('worker.process.success', { worker: this.opts.name });
      this.emit('processed', message);
    } catch (err) {
      span?.recordException(err);
      await this.onProcessError(message, err);
    } finally {
      span?.end();
      this.inFlight--;
    }
  }

  private async onProcessError(message: WorkerMessage<T>, err: unknown) {
    const attempts = (message.attempts ?? 0) + 1;
    const maxAttempts = this.opts.maxAttempts!;

    this.recordFailure(err);
    this.deps.metrics?.increment('worker.process.failure', { worker: this.opts.name, type: message.type });

    if (attempts >= maxAttempts) {
      // Dead-letter handling: emit and ack to avoid poison pill
      this.deps.logger.error(`WorkerAgent[${this.opts.name}] DLQ message`, { id: message.id, attempts, err });
      await this.queue.ack(message); // ack original
      await this.deps.idempotency?.setResult(`${this.opts.name}:${message.id}`, 'failed', { attempts });
      this.emit('dead-letter', { message, err, attempts });
      return;
    }

    const delay = this.exponentialBackoff(attempts, this.opts.requeueDelayMs!);
    const requeueMsg: WorkerMessage<T> = { ...message, attempts };
    await this.queue.requeue(requeueMsg, delay);
  }

  private recordFailure(err: unknown) {
    this.lastFailureAt = Date.now();
    this.consecutiveFailures++;
    this.backoffMs = Math.min(10_000, (this.backoffMs || 0) + 100);

    if (this.consecutiveFailures >= (this.opts.circuitFailureThreshold!)) {
      if (!this.circuitOpen) {
        this.circuitOpen = true;
        this.deps.logger.error(`WorkerAgent[${this.opts.name}] circuit opened`, { consecutiveFailures: this.consecutiveFailures, lastError: String(err) });
      }
    }
  }

  private exponentialBackoff(attempts: number, baseMs: number) {
    const jitter = Math.floor(Math.random() * 100);
    return Math.min(60_000, Math.floor(baseMs * Math.pow(2, Math.min(6, attempts - 1))) + jitter);
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

// Example: composing dependencies for DI containers
export type WorkerDeps = ConstructorParameters<typeof WorkerAgent>[2];
export type WorkerOptions = WorkerAgentOptions;
export type WorkerMsg<T> = WorkerMessage<T>;
