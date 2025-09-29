/**
 * Simple logger utility for the backend agents
 */
export class Logger {
  constructor(private readonly context: string) {}

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[${this.context}] INFO: ${message}`, meta ? JSON.stringify(meta) : '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${this.context}] WARN: ${message}`, meta ? JSON.stringify(meta) : '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[${this.context}] ERROR: ${message}`, meta ? JSON.stringify(meta) : '');
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[${this.context}] DEBUG: ${message}`, meta ? JSON.stringify(meta) : '');
  }
}