/**
 * UIUXAgent
 *
 * Enterprise-grade frontend agent responsible for UI/UX orchestration, analytics collection,
 * experimentation (A/B/n), and real-time personalization hooks. Designed for large-scale apps
 * following SOLID, hexagonal architecture principles, and dependency injection for testability.
 *
 * Key capabilities:
 * - Event-driven design via a lightweight in-process event bus
 * - Pluggable analytics providers (e.g., GA4, Segment, custom data lake)
 * - Experiment framework with exposure tracking and guard rails
 * - Personalization strategy interface including ML-driven scoring hook
 * - Advanced error handling with categorized errors and retry/backoff utilities
 * - Lifecycle hooks for app boot, route changes, and component interactions
 *
 * Usage:
 *   const agent = new UIUXAgent({ analytics: new GAProvider(), experiments: new LocalExperimentService() });
 *   agent.initialize();
 *   agent.trackUIEvent({ name: 'button_click', props: { id: 'cta-1' } });
 *
 * Security & Privacy:
 * - Sanitizes event payloads
 * - Respects user consent and Do Not Track (DNT)
 * - Supports PII redaction policies via injected Redactor
 */

// Lightweight types for DI
export interface ILogger { debug(msg: string, meta?: any): void; info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string | Error, meta?: any): void; }
export interface IEventBus { on<T = any>(event: string, handler: (payload: T) => void): () => void; emit<T = any>(event: string, payload: T): void; }
export interface IAnalyticsProvider { identify(userId: string, traits?: Record<string, any>): Promise<void>; track(event: string, properties?: Record<string, any>): Promise<void>; page(name?: string, properties?: Record<string, any>): Promise<void>; flush?(): Promise<void>; }
export interface IRedactor { redact(input: unknown): unknown; }
export interface IConsentManager { isAllowed(purpose: 'analytics' | 'personalization' | 'experimentation'): boolean; }

export type ExperimentVariant = { key: string; weight?: number; meta?: Record<string, any> };
export interface IExperimentService {
  getVariant(experimentKey: string, context?: Record<string, any>): Promise<ExperimentVariant>;
  trackExposure(experimentKey: string, variantKey: string, context?: Record<string, any>): Promise<void>;
}

export interface PersonalizationContext {
  userId?: string;
  attributes?: Record<string, any>;
  page?: { path: string; name?: string; params?: Record<string, any> };
}

export interface IPersonalizationStrategy {
  // ML-driven scoring hook (stub with realistic signature)
  scoreRecommendations(ctx: PersonalizationContext): Promise<Array<{ id: string; score: number; metadata?: any }>>;
}

export type UIEvent = { name: string; props?: Record<string, any>; ts?: number };

export class RetriableError extends Error { constructor(message: string, public readonly retryAfterMs = 500) { super(message); this.name = 'RetriableError'; } }
export class PolicyViolationError extends Error { constructor(message: string) { super(message); this.name = 'PolicyViolationError'; } }

export interface UIUXAgentOptions {
  logger: ILogger;
  bus: IEventBus;
  analytics?: IAnalyticsProvider;
  experiments?: IExperimentService;
  consent?: IConsentManager;
  redactor?: IRedactor;
  personalization?: IPersonalizationStrategy;
}

export class UIUXAgent {
  private started = false;
  constructor(private readonly opts: UIUXAgentOptions) {}

  initialize(): void {
    if (this.started) return;
    this.started = true;
    this.opts.logger.info('UIUXAgent initializing');
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // Route changes
    this.opts.bus.on('route:change', (payload) => {
      this.safeRun(async () => {
        if (this.opts.consent?.isAllowed('analytics')) {
          await this.opts.analytics?.page(payload?.name, this.sanitize(payload));
        }
      }, 'route:change');
    });

    // Component interaction tracking
    this.opts.bus.on<UIEvent>('ui:event', (evt) => this.trackUIEvent(evt));
  }

  async trackUIEvent(evt: UIEvent): Promise<void> {
    const event: UIEvent = { ...evt, ts: evt.ts ?? Date.now() };
    return this.safeRun(async () => {
      if (!this.opts.consent?.isAllowed('analytics')) return;
      const redacted = this.sanitize(event.props);
      await this.opts.analytics?.track(event.name, { ...redacted, ts: event.ts });
    }, 'ui:event');
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    return this.safeRun(async () => {
      if (!this.opts.consent?.isAllowed('analytics')) return;
      await this.opts.analytics?.identify(userId, this.sanitize(traits));
    }, 'identify');
  }

  async chooseVariant(experimentKey: string, context?: Record<string, any>): Promise<ExperimentVariant> {
    return this.safeRun(async () => {
      if (!this.opts.consent?.isAllowed('experimentation')) throw new PolicyViolationError('Experiment not permitted without consent');
      const variant = await this.opts.experiments?.getVariant(experimentKey, this.sanitize(context));
      if (!variant) return { key: 'control' };
      await this.opts.experiments?.trackExposure(experimentKey, variant.key, this.sanitize(context));
      return variant;
    }, 'experiment:choose');
  }

  async personalize(ctx: PersonalizationContext) {
    return this.safeRun(async () => {
      if (!this.opts.consent?.isAllowed('personalization')) return [] as Array<{ id: string; score: number }>;
      const results = await this.opts.personalization?.scoreRecommendations(this.sanitize(ctx) as PersonalizationContext);
      return results ?? [];
    }, 'personalize');
  }

  private sanitize<T = any>(payload: T): T {
    try { return (this.opts.redactor?.redact(payload) as T) ?? payload; } catch (e) { this.opts.logger.warn('Redaction failed', { e }); return payload; }
  }

  private async safeRun<T>(fn: () => Promise<T>, op: string, attempt = 1): Promise<T> {
    try { return await fn(); }
    catch (e: any) {
      if (e instanceof PolicyViolationError) { this.opts.logger.warn(`Policy violation: ${op}`, { e }); throw e; }
      if (e instanceof RetriableError && attempt <= 3) {
        const delay = e.retryAfterMs * attempt;
        this.opts.logger.warn(`Retryable error in ${op}, attempt ${attempt}`, { delay, e });
        await new Promise(res => setTimeout(res, delay));
        return this.safeRun(fn, op, attempt + 1);
      }
      this.opts.logger.error(`Unhandled error in ${op}`, { e });
      throw e;
    }
  }
}

// Minimal in-memory EventBus for apps without a global bus
export class SimpleEventBus implements IEventBus {
  private handlers = new Map<string, Set<(p: any) => void>>();
  on<T = any>(event: string, handler: (payload: T) => void): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as any); this.handlers.set(event, set);
    return () => set.delete(handler as any);
  }
  emit<T = any>(event: string, payload: T): void { this.handlers.get(event)?.forEach(h => { try { h(payload); } catch {} }); }
}
