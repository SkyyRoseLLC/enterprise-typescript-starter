/**
 * Production-ready Logger utility
 * Provides structured logging with different levels and metadata support
 */

export interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  service?: string;
  traceId?: string;
}

export class Logger {
  private readonly service: string;
  private readonly isDevelopment: boolean;

  constructor(service: string = 'App') {
    this.service = service;
    this.isDevelopment = process.env['NODE_ENV'] !== 'production';
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
    const errorMetadata = this.formatError(error);
    this.log('ERROR', message, { ...metadata, ...errorMetadata });
  }

  /**
   * Internal logging method
   */
  private log(level: keyof LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      ...(metadata && { metadata }),
    };

    // Add trace ID if available
    if (process.env['TRACE_ID']) {
      entry.traceId = process.env['TRACE_ID'];
    }

    // Format output based on environment
    if (this.isDevelopment) {
      console.log(this.formatForDevelopment(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Format log entry for development environment
   */
  private formatForDevelopment(entry: LogEntry): string {
    const { level, message, timestamp, service, metadata } = entry;
    const time = new Date(timestamp).toLocaleTimeString();
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${time}] ${level} [${service}]: ${message}${metaStr}`;
  }

  /**
   * Format error object for logging
   */
  private formatError(error?: unknown): Record<string, unknown> {
    if (!error) return {};

    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    return { error: String(error) };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.service);
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (
      level: keyof LogLevel,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      originalLog(level, message, { ...context, ...metadata });
    };

    return childLogger;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger('EnterpriseApp');

/**
 * Create a logger for a specific service
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}
