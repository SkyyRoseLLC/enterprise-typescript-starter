/*
 * AuthenticationAgent
 * Centralized auth with DI: token issuance/verification, session management, RBAC, event hooks.
 */

import { EventEmitter } from 'node:events';

export interface ILogger { info(msg: string, meta?: any): void; warn(msg: string, meta?: any): void; error(msg: string, meta?: any): void; debug?(msg: string, meta?: any): void; }
export interface IClock { now(): number; }

export interface TokenSigner {
  sign(payload: object, opts?: { expiresInSec?: number; subject?: string; }): Promise<string>;
  verify<T = any>(token: string): Promise<T>;
}

export interface SessionStore {
  put(sessionId: string, data: object, ttlSec: number): Promise<void>;
  get<T = any>(sessionId: string): Promise<T | null>;
  del(sessionId: string): Promise<void>;
}

export interface RBACProvider {
  hasPermission(subject: string, permission: string): Promise<boolean>;
  getRoles(subject: string): Promise<string[]>;
}

export interface AuthenticationAgentOptions {
  name: string;
  accessTtlSec?: number;
  refreshTtlSec?: number;
}

export interface Credentials { subject: string; claims?: Record<string, unknown> }

export class AuthenticationAgent extends EventEmitter {
  constructor(
    private readonly signer: TokenSigner,
    private readonly sessions: SessionStore,
    private readonly rbac: RBACProvider,
    private readonly deps: { logger: ILogger; clock?: IClock },
    private readonly opts: AuthenticationAgentOptions,
  ) {
    super();
    this.opts = { accessTtlSec: 900, refreshTtlSec: 60 * 60 * 24 * 7, ...opts };
  }

  async issueTokens(creds: Credentials) {
    const access = await this.signer.sign({ sub: creds.subject, ...creds.claims, typ: 'access' }, { expiresInSec: this.opts.accessTtlSec });
    const refresh = await this.signer.sign({ sub: creds.subject, typ: 'refresh' }, { expiresInSec: this.opts.refreshTtlSec });
    const sessionId = `sess:${creds.subject}:${this.deps.clock?.now() ?? Date.now()}`;
    await this.sessions.put(sessionId, { sub: creds.subject, claims: creds.claims }, this.opts.refreshTtlSec!);
    this.emit('issued', { sub: creds.subject, sessionId });
    return { access, refresh, sessionId };
  }

  async verifyAccess(token: string) {
    try {
      const decoded = await this.signer.verify<any>(token);
      if (decoded.typ !== 'access') throw new Error('Invalid token typ');
      return decoded;
    } catch (err) {
      this.deps.logger.warn(`[AuthenticationAgent:${this.opts.name}] verifyAccess failed`, { err });
      throw err;
    }
  }

  async refreshTokens(refreshToken: string, sessionId: string) {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error('Session expired');
    const decoded = await this.signer.verify<any>(refreshToken);
    if (decoded.typ !== 'refresh') throw new Error('Invalid token typ');
    const creds: Credentials = { subject: decoded.sub, claims: session.claims };
    return this.issueTokens(creds);
  }

  async revoke(sessionId: string) {
    await this.sessions.del(sessionId);
    this.emit('revoked', { sessionId });
  }

  async authorize(subject: string, permission: string) {
    const allowed = await this.rbac.hasPermission(subject, permission);
    if (!allowed) {
      this.emit('denied', { subject, permission });
      throw new Error('Forbidden');
    }
    this.emit('authorized', { subject, permission });
    return true;
  }

  async roles(subject: string) {
    return this.rbac.getRoles(subject);
  }
}

export type AuthDeps = ConstructorParameters<typeof AuthenticationAgent>[3];
export type AuthOpts = AuthenticationAgentOptions;
