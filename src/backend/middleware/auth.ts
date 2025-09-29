import type { Request, Response, NextFunction } from 'express';

import { HTTP_STATUS, ERROR_MESSAGES } from '../../shared/constants';
import { extractTokenFromHeader, verifyToken } from '../utils/auth';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });
      
      sendError(res, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id as string,
      email: decoded.email as string,
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      method: req.method,
      url: req.originalUrl,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    sendError(res, ERROR_MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id as string,
        email: decoded.email as string,
      };
    }
    
    next();
  } catch (error) {
    // For optional auth, we just log the error but don't block the request
    logger.debug('Optional authentication failed', {
      method: req.method,
      url: req.originalUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    next();
  }
};