/**
 * Enterprise TypeScript Starter - Main Application Entry Point
 * Production-ready application with comprehensive monitoring and error handling
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger';
import { errorHandler } from './agents/api/core/src/agents/backend/BackendAgent';
import { createAPIHandler } from './agents/api/core/src/agents/backend/BackendAgent';

// Initialize logger
const logger = createLogger('MainApp');

// Load environment variables
require('dotenv').config();

/**
 * Main Application Class
 */
class Application {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env['PORT'] || '3000', 10);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
      max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10) / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
      next();
    });
  }

  /**
   * Setup routes
   */
  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env['npm_package_version'] || '1.0.0',
        environment: process.env['NODE_ENV'] || 'development',
      });
    });

    // API routes
    this.app.get('/api/status', (_req, res) => {
      res.json({
        message: 'Enterprise TypeScript Starter API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // Initialize and setup agent routes
    try {
      const agentConfig = {
        id: 'main-backend-agent',
        name: 'Main Backend Agent',
        version: '1.0.0',
        timeout: 30000,
        retryCount: 3,
      };

      const apiHandler = await createAPIHandler(agentConfig, logger);
      
      // Setup agent routes
      this.app.get('/api/agent/*', apiHandler.handleGet.bind(apiHandler));
      this.app.post('/api/agent/*', apiHandler.handlePost.bind(apiHandler));
      this.app.put('/api/agent/*', apiHandler.handlePut.bind(apiHandler));
      this.app.delete('/api/agent/*', apiHandler.handleDelete.bind(apiHandler));

      logger.info('Agent routes initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agent routes', error);
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      this.app.listen(this.port, () => {
        logger.info(`🚀 Server started successfully`, {
          port: this.port,
          environment: process.env['NODE_ENV'] || 'development',
          nodeVersion: process.version,
          pid: process.pid,
        });
      });
    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  private shutdown(): void {
    logger.info('Shutting down application...');
    // Add cleanup logic here (close database connections, etc.)
    process.exit(0);
  }
}

// Start the application
const app = new Application();
app.start().catch((error) => {
  logger.error('Application startup failed', error);
  process.exit(1);
});

export default Application;