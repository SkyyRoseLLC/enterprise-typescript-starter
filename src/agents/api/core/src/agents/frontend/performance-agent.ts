/**
 * PerformanceAgent
 *
 * Enterprise-grade frontend agent for Web Vitals, performance monitoring, and auto-tuning.
 * Applies DI, event-driven insights, adaptive throttling, and ML-based anomaly detection hook.
 */

export interface ILogger { debug(msg: string, meta?: any): void; info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string | Error, meta?: any): void; }
export interface IEventBus { on<T = any>(event: string, handler: (payload: T) => void): () => void; emit<T = any>(event: string, payload: T): void; }
export interface IMetricsSink { gauge(name: string, value: number, tags?: Record<string, string>): Promise<void>; counter(name: string, delta?: number, tags?: Record<string, string>): Promise<void>; histogram?(name: string, value: number, tags?: Record<string, string>): Promise<void>; flush?(): Promise<void>; }
export interface IAnomalyDetector { // ML stub
  evaluate(sample: Record<string, number>, context?: Record<string, any>): Promise<{ isAnomaly: boolean; score: number; explanation?: string }>;
}

export type WebVitalSample = {
  LCP?: number; FID?: number; CLS?: number; INP?: number; TTFB?: number; FCP?: number;
  ts?: number; path?: string; device?: string; release?: string;
};

export interface PerformanceAgentOptions {
  logger: ILogger;
  bus: IEventBus;
  sink?: IMetricsSink;
  anomaly?: IAnomalyDetector;
  sampleRate?: number; // 0..1
}

export class PerformanceAgent {
  private initialized = false;
  private readonly rate: number;
  constructor(private readonly opts: PerformanceAgentOptions) {
    this.rate = Math.min(1, Math.max(0, opts.sampleRate ?? 1));
  }

  initialize(): void {
    if (this.initialized) return; this.initialized = true;
    this.opts.logger.info('PerformanceAgent initializing');
    this.opts.bus.on<WebVitalSample>('perf:vitals', (s) => this.ingestVitals(s));
    this.opts.bus.on('route:change', (r: any) => this.markPageView(r));
  }

  async ingestVitals(sample: WebVitalSample) {
    const s = { ...sample, ts: sample.ts ?? Date.now() };
    if (Math.random() > this.rate) return;
    try {
      await this.reportVitals(s);
      await this.detectAnomalies(s);
    } catch (e) {
      this.opts.logger.error('ingestVitals failed', { e });
    }
  }

  private async reportVitals(s: WebVitalSample) {
    if (!this.opts.sink) return;
    const tags = { path: s.path ?? location.pathname };
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === 'number') await this.opts.sink.gauge(`webvitals.${k.toLowerCase()}`, v, tags);
    }
  }

  private async detectAnomalies(s: WebVitalSample) {
    if (!this.opts.anomaly) return;
    const numeric: Record<string, number> = {};
    for (const [k, v] of Object.entries(s)) if (typeof v === 'number') numeric[k] = v;
    const res = await this.opts.anomaly.evaluate(numeric, { path: s.path, ts: s.ts });
    if (res.isAnomaly) {
      this.opts.logger.warn('Performance anomaly detected', { score: res.score, explanation: res.explanation });
      this.opts.bus.emit('perf:anomaly', { sample: s, result: res });
    }
  }

  markPageView(r?: any) {
    try { this.opts.sink?.counter('page.views', 1, { path: r?.path ?? location.pathname }); } catch {}
  }

  // Auto-tuning stub: adjust sampling rate based on perf budget
  adaptSampling(avgLcpMs: number) {
    if (avgLcpMs > 2500 && this.rate < 1) {
      (this as any).rate = Math.min(1, this.rate + 0.1);
    }
  }
}
