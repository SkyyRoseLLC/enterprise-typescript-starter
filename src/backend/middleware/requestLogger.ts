import type { Request, Response, NextFunction } from 'express';

import { env } from '../config/env';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.ENABLE_REQUEST_LOGGING) {
    next();
    return;
  }

  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  // Log request start
  logger.debug(`Request started: ${method} ${originalUrl}`, {
    method,
    url: originalUrl,
    ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalSend = res.send;
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    logger.request(method, originalUrl, res.statusCode, responseTime);
    
    return originalSend.call(this, data);
  };

  next();
};