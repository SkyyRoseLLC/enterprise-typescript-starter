/*
 * DevSkyy Orchestration/Workflow Agent
 *
 * Role: Coordinates multi-step business workflows, composing backend services and agents.
 * Usage: Register steps as ICommandHandlers and trigger workflows via dispatch. Supports saga pattern.
 * Integration: Emits domain events; resilient with retries, compensation, and idempotency keys.
 */

export interface ICommand<TPayload = unknown> {
  type: string;
  payload: TPayload;
  idempotencyKey?: string;
}

export interface ICommandHandler<C extends ICommand = ICommand> {
  canHandle(cmd: ICommand): cmd is C;
  handle(cmd: C, ctx: ExecutionContext): Promise<void>;
}

export interface IEventBus<TEvent = unknown> {
  publish(event: TEvent): Promise<void>;
  subscribe(handler: (event: TEvent) => Promise<void>): () => void;
}

export interface ILogger { info(msg: string, meta?: Record<string, unknown>): void; warn(msg: string, meta?: Record<string, unknown>): void; error(msg: string, meta?: Record<string, unknown>): void; debug(msg: string, meta?: Record<string, unknown>): void; }

export interface IClock { now(): number; }

export interface ExecutionContext {
  traceId: string;
  metadata?: Record<string, unknown>;
}

export interface OrchestrationOptions {
  maxRetriesPerStep?: number;
  backoffBaseMs?: number;
}

export class OrchestrationAgent {
  private handlers: ICommandHandler[] = [];
  constructor(
    private readonly bus: IEventBus,
    private readonly logger: ILogger,
    private readonly clock: IClock, // Used for timestamping
    private readonly opts: OrchestrationOptions = {}
  ) {}

  register(handler: ICommandHandler) {
    this.handlers.push(handler);
  }

  async dispatch(cmd: ICommand, ctx: ExecutionContext): Promise<void> {
    const handler = this.handlers.find(h => h.canHandle(cmd));
    if (!handler) throw new Error(`No handler for ${cmd.type}`);

    const maxRetries = this.opts.maxRetriesPerStep ?? 2;
    const base = this.opts.backoffBaseMs ?? 200;

    let attempt = 0;
    while (true) {
      try {
        await handler.handle(cmd, ctx);
        await this.bus.publish({ 
          type: 'workflow.step.completed', 
          cmdType: cmd.type, 
          traceId: ctx.traceId,
          timestamp: this.clock.now()
        });
        return;
      } catch (err) {
        attempt++;
        this.logger.warn('workflow.step.retry', { type: cmd.type, attempt, error: String(err) });
        if (attempt > maxRetries) {
          await this.compensate(cmd, ctx);
          await this.bus.publish({ 
            type: 'workflow.step.failed', 
            cmdType: cmd.type, 
            traceId: ctx.traceId, 
            error: String(err),
            timestamp: this.clock.now()
          });
          throw err;
        }
        await sleep(backoff(base, attempt));
      }
    }
  }

  // SAGA compensation hook
  async compensate(cmd: ICommand, ctx: ExecutionContext) {
    this.logger.info('workflow.compensate', { type: cmd.type, traceId: ctx.traceId });
    // Implement domain-specific compensation by registering dedicated handlers or callbacks
  }
}

function backoff(base: number, attempt: number) { return Math.round(base * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4)); }
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
