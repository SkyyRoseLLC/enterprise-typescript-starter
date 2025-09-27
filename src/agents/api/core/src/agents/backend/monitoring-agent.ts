/*
 * MonitoringAgent
 * Observability orchestrator: aggregates logs, metrics, traces, health checks, and emits events.
 */

import { EventEmitter } from 'node:events';

export interface ILogger { info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string, meta?: any): void; debug?(msg: string, meta?: any): void; }
export interface IMetrics { increment(name: string, tags?: Record<string, string>): void; gauge(name: string, value: number, tags?: Record<string, string>): void; histogram(name: string, value: number, tags?: Record<string, string>): void; }
export interface ITracer { startSpan(name: string, attrs?: Record<string, unknown>): ISpan; }
export interface ISpan { setAttribute(key: string, value: unknown): void; recordException(err: unknown): void; end(): void; }

export interface HealthIndicator {
  name: string;
  check(): Promise<{ status: 'up' | 'down'; details?: Record<string, unknown> }>;
}

export type MonitoringAgentOptions = {
  name: string;
  heartbeatIntervalMs?: number;
  anomalyThresholds?: { errorRate?: number; latencyMsP95?: number };
};

export class MonitoringAgent extends EventEmitter {
  private running = false;
  private lastBeat = 0;

  constructor(
    private readonly deps: { logger: ILogger; metrics?: IMetrics; tracer?: ITracer },
    private readonly indicators: HealthIndicator[],
    private readonly opts: MonitoringAgentOptions,
  ) {
    super();
    this.opts = { heartbeatIntervalMs: 5000, anomalyThresholds: { errorRate: 0.05, latencyMsP95: 1000 }, ...opts };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.deps.logger.info(`[MonitoringAgent:${this.opts.name}] starting`);
    this.loop().catch(err => this.deps.logger.error(`[MonitoringAgent:${this.opts.name}] loop error`, { err }));
  }

  stop() { this.running = false; }

  private async loop() {
    while (this.running) {
      const span = this.deps.tracer?.startSpan('MonitoringAgent.heartbeat', { name: this.opts.name });
      try {
        const results = await Promise.all(this.indicators.map(i => i.check().then(r => ({ i, r })).catch(err => ({ i, r: { status: 'down' as const, details: { err } } }))));
        const status = results.every(x => x.r.status === 'up') ? 'up' : 'down';
        const details: Record<string, unknown> = {};
        for (const { i, r } of results) details[i.name] = r;
        this.deps.metrics?.increment('monitoring.heartbeat', { status });
        this.emit('heartbeat', { status, details });
        if (status === 'down') {
          this.deps.logger.warn(`[MonitoringAgent:${this.opts.name}] some indicators down`, details);
          this.emit('anomaly', { type: 'health-down', details });
        }
      } catch (err) {
        span?.recordException(err);
        this.deps.logger.error(`[MonitoringAgent:${this.opts.name}] heartbeat failed`, { err });
      } finally {
        span?.end();
        this.lastBeat = Date.now();
        await this.sleep(this.opts.heartbeatIntervalMs!);
      }
    }
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

export type MonitoringDeps = ConstructorParameters<typeof MonitoringAgent>[0];
export type MonitoringOpts = MonitoringAgentOptions;
export type MonitoringHealth = HealthIndicator;
