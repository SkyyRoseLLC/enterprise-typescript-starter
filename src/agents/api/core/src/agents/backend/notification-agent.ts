/*
 * NotificationAgent
 * Unified notifications with DI, batching, retries, provider failover, and audit logging.
 */

import { EventEmitter } from 'node:events';

export interface ILogger { info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string, meta?: any): void; debug?(msg: string, meta?: any): void; }
export interface IMetrics { increment(name: string, tags?: Record<string, string>): void; histogram(name: string, value: number, tags?: Record<string, string>): void; }
export interface ITracer { startSpan(name: string, attrs?: Record<string, unknown>): ISpan; }
export interface ISpan { setAttribute(key: string, value: unknown): void; recordException(err: unknown): void; end(): void; }

export type Channel = 'email' | 'sms' | 'push' | 'webhook';
export interface NotificationPayload { subject?: string; body: string; to: string | string[]; metadata?: Record<string, unknown>; }
export interface ProviderResult { id: string; accepted: boolean; provider: string; details?: Record<string, unknown>; }

export interface NotificationProvider {
  name: string;
  supports: Channel[];
  send(channel: Channel, payload: NotificationPayload): Promise<ProviderResult>;
}

export interface NotificationAgentOptions {
  name: string;
  defaultChannel?: Channel;
  batchSize?: number;
  retryDelaysMs?: number[]; // e.g., [1000, 3000, 5000]
}

export type NotificationRequest = { id: string; channel: Channel; payload: NotificationPayload; attempts?: number };

export class NotificationAgent extends EventEmitter {
  private queue: NotificationRequest[] = [];
  private running = false;

  constructor(
    private readonly providers: NotificationProvider[],
    private readonly deps: { logger: ILogger; metrics?: IMetrics; tracer?: ITracer },
    private readonly opts: NotificationAgentOptions,
  ) {
    super();
    this.opts = { defaultChannel: 'email', batchSize: 25, retryDelaysMs: [1000, 3000, 5000], ...opts };
  }

  enqueue(req: Omit<NotificationRequest, 'attempts'>) {
    this.queue.push({ ...req, attempts: 0 });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop().catch(err => this.deps.logger.error(`[NotificationAgent:${this.opts.name}] loop error`, { err }));
  }

  stop() { this.running = false; }

  private async loop() {
    while (this.running) {
      const batch = this.queue.splice(0, this.opts.batchSize!);
      if (batch.length === 0) { await this.sleep(100); continue; }
      await Promise.all(batch.map(req => this.dispatch(req)));
    }
  }

  private async dispatch(req: NotificationRequest) {
    const span = this.deps.tracer?.startSpan('NotificationAgent.dispatch', { id: req.id, channel: req.channel });
    const provider = this.pickProvider(req.channel);
    const started = Date.now();
    try {
      const result = await provider.send(req.channel, req.payload);
      this.deps.metrics?.histogram('notification.latency', Date.now() - started, { provider: provider.name, channel: req.channel });
      if (!result.accepted) throw new Error('Provider rejected message');
      this.deps.metrics?.increment('notification.sent', { provider: provider.name, channel: req.channel });
      this.emit('sent', { request: req, result });
    } catch (err) {
      span?.recordException(err);
      this.deps.metrics?.increment('notification.failed', { provider: provider.name, channel: req.channel });
      const attempts = (req.attempts ?? 0) + 1;
      if (attempts <= this.opts.retryDelaysMs!.length) {
        const delay = this.opts.retryDelaysMs![attempts - 1];
        setTimeout(() => this.enqueue({ ...req, attempts } as any), delay);
      } else {
        // try failover to another provider
        const alt = this.providers.find(p => p !== provider && p.supports.includes(req.channel));
        if (alt) {
          try {
            const result = await alt.send(req.channel, req.payload);
            if (!result.accepted) throw new Error('Alt provider rejected');
            this.deps.metrics?.increment('notification.sent', { provider: alt.name, channel: req.channel });
            this.emit('sent', { request: req, result });
            return;
          } catch (err2) {
            span?.recordException(err2);
          }
        }
        this.deps.logger.error(`[NotificationAgent:${this.opts.name}] permanently failed`, { id: req.id, channel: req.channel, err });
        this.emit('failed', { request: req, err });
      }
    } finally {
      span?.end();
    }
  }

  private pickProvider(channel: Channel): NotificationProvider {
    const eligible = this.providers.filter(p => p.supports.includes(channel));
    if (eligible.length === 0) throw new Error(`No provider supports channel ${channel}`);
    // naive round-robin by time slice
    const idx = Math.floor(Date.now() / 10_000) % eligible.length;
    const provider = eligible[idx];
    if (!provider) throw new Error(`Provider selection failed for channel ${channel}`);
    return provider;
  }

  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

export type NotificationDeps = ConstructorParameters<typeof NotificationAgent>[1];
export type NotificationOpts = NotificationAgentOptions;
export type NotificationProv = NotificationProvider;
