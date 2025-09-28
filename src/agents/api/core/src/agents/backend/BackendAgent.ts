import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../../utils/logger';

/**
 * Result type for agent operations
 */
export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * Configuration interface for agents
 */
export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  timeout?: number;
  retryCount?: number;
}

/**
 * Abstract base class for all agents in the system
 * Provides common functionality and enforces consistent patterns
 */
export abstract class Agent {
  protected readonly config: AgentConfig;
  protected readonly logger: Logger;

  /**
   * Creates a new Agent instance
   * @param config - Agent configuration
   * @param logger - Logger instance for this agent
   */
  constructor(config: AgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the agent
   * Override this method to perform agent-specific initialization
   */
  abstract initialize(): Promise<void>;

  /**
   * Execute the main agent logic
   * @param input - Input data for processing
   * @returns Promise resolving to agent result
   */
  abstract execute<T>(input: unknown): Promise<AgentResult<T>>;

  /**
   * Cleanup resources when agent is destroyed
   */
  abstract destroy(): Promise<void>;

  /**
   * Get agent information
   */
  getInfo(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.info(`Health check for agent ${this.config.name}`);
      return true;
    } catch (error) {
      this.logger.error(`Health check failed for agent ${this.config.name}:`, error);
      return false;
    }
  }
}

/**
 * Sample backend agent implementation
 * Demonstrates how to extend the base Agent class
 */
export class BackendAgent extends Agent {
  private isInitialized = false;

  /**
   * Creates a new BackendAgent instance
   * @param config - Agent configuration
   * @param logger - Logger instance
   */
  constructor(config: AgentConfig, logger: Logger) {
    super(config, logger);
  }

  /**
   * Initialize the backend agent
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing BackendAgent: ${this.config.name}`);
      
      // Perform any necessary initialization here
      // e.g., database connections, external service setup, etc.
      
      this.isInitialized = true;
      this.logger.info(`BackendAgent ${this.config.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize BackendAgent ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute backend agent logic
   * @param input - Input data to process
   * @returns Promise resolving to processed result
   */
  async execute<T>(input: unknown): Promise<AgentResult<T>> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    this.logger.info(`Executing BackendAgent ${this.config.name} with input:`, input);

    try {
      // Implement your agent logic here
      const processedData = await this.processData(input);
      
      const result: AgentResult<T> = {
        success: true,
        data: processedData as T,
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      this.logger.info(`BackendAgent ${this.config.name} executed successfully in ${duration}ms`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`BackendAgent ${this.config.name} execution failed:`, error);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      this.logger.info(`Destroying BackendAgent: ${this.config.name}`);
      
      // Cleanup logic here
      // e.g., close database connections, cleanup temp files, etc.
      
      this.isInitialized = false;
      this.logger.info(`BackendAgent ${this.config.name} destroyed successfully`);
    } catch (error) {
      this.logger.error(`Failed to destroy BackendAgent ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Process input data (private method)
   * @param input - Raw input data
   * @returns Processed data
   */
  private async processData(input: unknown): Promise<unknown> {
    // Example processing logic - replace with actual implementation
    if (typeof input === 'string') {
      return { processed: input.toUpperCase(), timestamp: new Date() };
    }
    
    if (typeof input === 'object' && input !== null) {
      return { ...input, processed: true, timestamp: new Date() };
    }
    
    return { input, processed: true, timestamp: new Date() };
  }
}

/**
 * Express-style middleware for error handling
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = new Logger('ErrorHandler');
  
  logger.error('Unhandled error in request:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = (error as any).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Basic REST API handler class with GET/POST patterns
 */
export class BackendAPIHandler {
  private readonly agent: BackendAgent;
  private readonly logger: Logger;

  /**
   * Creates a new API handler instance
   * @param agent - Backend agent instance
   * @param logger - Logger instance
   */
  constructor(agent: BackendAgent, logger: Logger) {
    this.agent = agent;
    this.logger = logger;
  }

  /**
   * Handle GET requests
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async handleGet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`GET request to ${req.path}`, {
        query: req.query,
        params: req.params
      });

      const result = await this.agent.execute({
        type: 'GET',
        path: req.path,
        query: req.query,
        params: req.params
      });

      res.status(200).json({
        success: result.success,
        data: result.data,
        timestamp: result.timestamp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle POST requests
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async handlePost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`POST request to ${req.path}`, {
        body: req.body,
        params: req.params
      });

      const result = await this.agent.execute({
        type: 'POST',
        path: req.path,
        body: req.body,
        params: req.params
      });

      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle PUT requests
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async handlePut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`PUT request to ${req.path}`, {
        body: req.body,
        params: req.params
      });

      const result = await this.agent.execute({
        type: 'PUT',
        path: req.path,
        body: req.body,
        params: req.params
      });

      res.status(200).json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle DELETE requests
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async handleDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`DELETE request to ${req.path}`, {
        params: req.params,
        query: req.query
      });

      const result = await this.agent.execute({
        type: 'DELETE',
        path: req.path,
        params: req.params,
        query: req.query
      });

      const statusCode = result.success ? 204 : 400;
      if (result.success) {
        res.status(statusCode).send();
      } else {
        res.status(statusCode).json({
          success: result.success,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Factory function to create a configured backend agent
 * @param config - Agent configuration
 * @param logger - Logger instance
 * @returns Promise resolving to initialized agent
 */
export async function createBackendAgent(
  config: AgentConfig,
  logger: Logger
): Promise<BackendAgent> {
  const agent = new BackendAgent(config, logger);
  await agent.initialize();
  return agent;
}

/**
 * Factory function to create an API handler with agent
 * @param config - Agent configuration
 * @param logger - Logger instance
 * @returns Promise resolving to API handler with initialized agent
 */
export async function createAPIHandler(
  config: AgentConfig,
  logger: Logger
): Promise<BackendAPIHandler> {
  const agent = await createBackendAgent(config, logger);
  return new BackendAPIHandler(agent, logger);
}
