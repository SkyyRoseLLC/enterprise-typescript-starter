import type { Request, Response, NextFunction } from 'express';

import { HTTP_STATUS, ERROR_MESSAGES } from '../../shared/constants';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  isOperational: boolean = true
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { method, originalUrl, ip } = req;
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Log error details
  logger.error(`Error ${statusCode}: ${message}`, {
    method,
    url: originalUrl,
    ip,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Don't expose internal errors in production
  const isInternalError = statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const shouldExposeError = process.env.NODE_ENV !== 'production' || error.isOperational;

  const responseMessage = isInternalError && !shouldExposeError 
    ? ERROR_MESSAGES.INTERNAL_SERVER_ERROR 
    : message;

  sendError(res, responseMessage, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const message = `Route ${req.method} ${req.originalUrl} not found`;
  logger.warn(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });
  
  sendError(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};