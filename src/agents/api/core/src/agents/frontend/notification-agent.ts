/**
 * NotificationAgent
 *
 * Orchestrates in-app and cross-channel notifications (web push, email via backend API, SMS via provider).
 * Provides DI, event-driven pipelines, rich deduplication, delivery policies, and ML prioritization stub.
 */

export interface ILogger { debug(msg: string, meta?: any): void; info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string | Error, meta?: any): void; }
export interface IEventBus { on<T = any>(event: string, handler: (payload: T) => void): () => void; emit<T = any>(event: string, payload: T): void; }
export interface IStorage { get<T>(key: string): T | null; set<T>(key: string, value: T): void; remove(key: string): void; }
export interface IWebPush { requestPermission(): Promise<NotificationPermission>; subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription | null>; send(payload: any): Promise<void>; }
export interface IRestClient { post<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>; }
export interface IMLPrioritizer { // ML stub
  score(notifications: Array<NotificationRequest>, context?: Record<string, any>): Promise<Array<{ id: string; priority: number }>>;
}

export type Channel = 'inapp' | 'push' | 'email' | 'sms';
export type NotificationRequest = { id: string; userId: string; title: string; body?: string; data?: any; channels: Channel[]; dedupeKey?: string; ts?: number };

export interface NotificationAgentOptions {
  logger: ILogger;
  bus: IEventBus;
  storage?: IStorage; // for dedupe/snooze
  push?: IWebPush;
  http?: IRestClient; // for backend fanout (email/sms)
  ml?: IMLPrioritizer;
  apiBase?: string; // backend base for email/sms fanout
}

export class NotificationAgent {
  private initialized = false;
  private readonly delivered = new Set<string>();
  constructor(private readonly opts: NotificationAgentOptions) {}

  initialize() {
    if (this.initialized) return; this.initialized = true;
    this.opts.logger.info('NotificationAgent initializing');
    this.opts.bus.on<NotificationRequest>('notify:send', (n) => this.enqueue(n));
  }

  async enqueue(n: NotificationRequest) {
    const req = { ...n, ts: n.ts ?? Date.now() };
    if (this.isDeduped(req)) { this.opts.logger.debug('Notification deduped', { id: req.id, key: req.dedupeKey }); return; }
    const prioritized = await this.prioritize([req]);
    for (const item of prioritized) await this.dispatch(item);
  }

  private isDeduped(n: NotificationRequest): boolean {
    const key = n.dedupeKey ?? `${n.userId}:${n.title}:${n.body}`;
    const stored = this.opts.storage?.get<number>(`dedupe:${key}`) ?? 0;
    const recent = Date.now() - stored < 60_000; // 1 minute window
    if (!recent) this.opts.storage?.set(`dedupe:${key}`, Date.now());
    return recent || this.delivered.has(n.id);
  }

  private async prioritize(list: NotificationRequest[]): Promise<NotificationRequest[]> {
    if (!this.opts.ml) return list;
    const scores = await this.opts.ml.score(list, { path: location.pathname });
    const map = new Map(scores.map(s => [s.id, s.priority]));
    return [...list].sort((a, b) => (map.get(b.id) ?? 0) - (map.get(a.id) ?? 0));
  }

  async dispatch(n: NotificationRequest) {
    for (const ch of n.channels) {
      try {
        switch (ch) {
          case 'inapp':
            this.opts.bus.emit('notify:inapp', n);
            break;
          case 'push':
            await this.sendPush(n);
            break;
          case 'email':
            await this.opts.http?.post(`${this.opts.apiBase}/notify/email`, { userId: n.userId, title: n.title, body: n.body, data: n.data });
            break;
          case 'sms':
            await this.opts.http?.post(`${this.opts.apiBase}/notify/sms`, { userId: n.userId, body: n.body, data: n.data });
            break;
        }
      } catch (e) {
        this.opts.logger.error('Channel dispatch failed', { e, channel: ch, id: n.id });
      }
    }
    this.delivered.add(n.id);
  }

  private async sendPush(n: NotificationRequest) {
    if (!this.opts.push) return;
    const perm = await this.opts.push.requestPermission();
    if (perm !== 'granted') { this.opts.logger.warn('Push permission not granted'); return; }
    const sub = await this.opts.push.subscribe({ userVisibleOnly: true });
    if (!sub) { this.opts.logger.warn('Push subscription unavailable'); return; }
    await this.opts.push.send({ title: n.title, body: n.body, data: n.data, ts: n.ts });
  }
}
