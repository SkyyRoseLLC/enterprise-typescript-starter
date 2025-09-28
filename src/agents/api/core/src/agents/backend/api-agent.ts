/*
 * DevSkyy API Agent
 *
 * Role: Handles REST/gRPC API requests to backend services with resilience, observability, and security.
 * Usage: Instantiate via dependency injection with concrete IHttpClient, ILogger, ITracer implementations.
 * Integration: Emits lifecycle events (request, response, error) and supports middleware pipelines.
 */

// Dependencies are defined as interfaces for testability and extensibility
export interface IHttpClient {
  request<T = unknown>(options: {
    method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE';
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
    signal?: AbortSignal;
  }): Promise<{ status: number; headers: Record<string, string>; data: T }>;
}

export interface ILogger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface ITracer {
  startSpan<T>(name: string, fn: (span: { setTag: (k: string, v: unknown) => void; end: () => void }) => Promise<T>): Promise<T>;
}

export type ApiEvent =
  | { type: 'request'; id: string; method: string; url: string; startedAt: number }
  | { type: 'response'; id: string; status: number; durationMs: number }
  | { type: 'error'; id: string; error: Error; durationMs: number };

export interface EventEmitter<T> {
  on(listener: (event: T) => void): () => void;
  emit(event: T): void;
}

export class SimpleEventEmitter<T> implements EventEmitter<T> {
  private listeners = new Set<(event: T) => void>();
  on(listener: (event: T) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: T) {
    for (const l of this.listeners) l(event);
  }
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number; // exponential backoff base
  jitter?: boolean;
  retryOnStatus?: number[]; // e.g., [429, 500, 502, 503, 504]
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // open after N consecutive failures
  halfOpenAfterMs: number; // attempt after cooldown
}

export interface ApiAgentOptions {
  defaultHeaders?: Record<string, string>;
  retry?: RetryPolicy;
  circuitBreaker?: CircuitBreakerOptions;
  requestTimeoutMs?: number;
}

export class ApiAgent {
  readonly events = new SimpleEventEmitter<ApiEvent>();
  private consecutiveFailures = 0;
  private breakerOpenUntil = 0;

  constructor(
    private readonly http: IHttpClient,
    private readonly logger: ILogger,
    private readonly tracer: ITracer,
    private readonly opts: ApiAgentOptions = {}
  ) {}

  async call<T = unknown>(options: {
    method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE';
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
    id?: string;
  }): Promise<T> {
    const id = options.id ?? cryptoRandomId();

    // Circuit breaker check
    const now = Date.now();
    if (now < this.breakerOpenUntil) {
      const ms = this.breakerOpenUntil - now;
      const err = new Error(`Circuit open for ${ms}ms`);
      this.logger.warn('api.circuit.open', { id, remainingMs: ms });
      this.events.emit({ type: 'error', id, error: err, durationMs: 0 });
      throw err;
    }

    const retry = this.opts.retry ?? { maxRetries: 2, baseDelayMs: 200, jitter: true, retryOnStatus: [429, 500, 502, 503, 504] };
    const requestTimeoutMs = options.timeoutMs ?? this.opts.requestTimeoutMs ?? 10000;

    const startedAt = Date.now();
    this.events.emit({ type: 'request', id, method: options.method, url: options.url, startedAt });

    return this.tracer.startSpan('ApiAgent.call', async span => {
      span.setTag('http.method', options.method);
      span.setTag('http.url', options.url);
      let attempt = 0;
      let lastError: unknown;

      while (attempt <= retry.maxRetries) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
        try {
          const res = await this.http.request<T>({
            method: options.method,
            url: withQuery(options.url, options.query),
            headers: { ...(this.opts.defaultHeaders ?? {}), ...(options.headers ?? {}) },
            body: options.body,
            timeoutMs: requestTimeoutMs,
            signal: controller.signal,
          });

          if (retry.retryOnStatus?.includes(res.status)) {
            throw new RetriableError(`HTTP ${res.status}`);
          }

          this.consecutiveFailures = 0;
          this.events.emit({ type: 'response', id, status: res.status, durationMs: Date.now() - startedAt });
          clearTimeout(timeout);
          span.end();
          return res.data;
        } catch (err) {
          lastError = err;
          clearTimeout(timeout);
          attempt++;

          const retriable = err instanceof RetriableError || isAbortRecoverable(err);
          if (attempt <= retry.maxRetries && retriable) {
            const delay = backoffDelay(retry.baseDelayMs, attempt, retry.jitter ?? true);
            this.logger.warn('api.retry', { id, attempt, delayMs: delay, error: String(err) });
            await sleep(delay);
            continue;
          }

          this.consecutiveFailures++;
          this.events.emit({ type: 'error', id, error: err as Error, durationMs: Date.now() - startedAt });

          const breaker = this.opts.circuitBreaker ?? { failureThreshold: 5, halfOpenAfterMs: 5000 };
          if (this.consecutiveFailures >= breaker.failureThreshold) {
            this.breakerOpenUntil = Date.now() + breaker.halfOpenAfterMs;
            this.logger.error('api.circuit.opened', { id, failures: this.consecutiveFailures });
          }

          span.end();
          throw err;
        }
      }

      // Should not reach here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw lastError as any;
    });
  }
}

class RetriableError extends Error {}

function withQuery(url: string, q?: Record<string, string | number | boolean | undefined>) {
  if (!q) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined) continue;
    params.set(k, String(v));
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}

function backoffDelay(base: number, attempt: number, jitter: boolean) {
  const exp = base * Math.pow(2, attempt - 1);
  if (!jitter) return exp;
  const rand = Math.random() * 0.4 + 0.8; // 0.8x - 1.2x
  return Math.round(exp * rand);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function isAbortRecoverable(err: unknown): boolean {
  // Check if it's an AbortError that might be recoverable
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  // Add other recoverable error conditions as needed
  return false;
}
